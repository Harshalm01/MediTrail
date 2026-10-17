package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.logging.Logger;

/**
 * Authoritative persistent OTP repository managing generation lease, atomic activation,
 * cooldown enforcement, attempt limiting, and single-use verification in the database.
 */
public class OtpRepository {

    private static final Logger LOGGER = Logger.getLogger(OtpRepository.class.getName());
    private final DatabaseManager dbManager;

    public static class PreAllocateResult {
        public final boolean success;
        public final boolean isCooldown;
        public final long remainingCooldownSeconds;
        public final boolean isInFlight;
        public final String errorMessage;

        private PreAllocateResult(boolean success, boolean isCooldown, long remainingCooldownSeconds, boolean isInFlight, String errorMessage) {
            this.success = success;
            this.isCooldown = isCooldown;
            this.remainingCooldownSeconds = remainingCooldownSeconds;
            this.isInFlight = isInFlight;
            this.errorMessage = errorMessage;
        }

        public static PreAllocateResult ok() {
            return new PreAllocateResult(true, false, 0, false, null);
        }

        public static PreAllocateResult cooldown(long seconds) {
            return new PreAllocateResult(false, true, seconds, false, "Please wait " + seconds + " seconds before requesting a new code.");
        }

        public static PreAllocateResult inFlight(String message) {
            return new PreAllocateResult(false, false, 0, true, message);
        }

        public static PreAllocateResult error(String message) {
            return new PreAllocateResult(false, false, 0, false, message);
        }
    }

    public static class VerifyResult {
        public final boolean success;
        public final int remainingAttempts;
        public final String errorMessage;

        private VerifyResult(boolean success, int remainingAttempts, String errorMessage) {
            this.success = success;
            this.remainingAttempts = remainingAttempts;
            this.errorMessage = errorMessage;
        }

        public static VerifyResult ok() {
            return new VerifyResult(true, 5, null);
        }

        public static VerifyResult fail(int remainingAttempts, String message) {
            return new VerifyResult(false, remainingAttempts, message);
        }
    }

    public OtpRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    /**
     * Phase 1: Durably pre-allocates an OTP record with 'PENDING_DISPATCH' status and a 15-second lease.
     * Guarantees that no DB lock is held across the subsequent network call to Brevo.
     */
    public PreAllocateResult preAllocateOtp(String email, String dispatchId, String rawOtp, long leaseDurationMs, long expiryDurationMs) throws SQLException {
        if (email == null || email.trim().isEmpty()) {
            return PreAllocateResult.error("Email address is required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        String otpHash = hashSha256(rawOtp);
        long now = System.currentTimeMillis();

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                String selectSql = "SELECT dispatch_id, status, lease_expires_at, last_sent_at, created_at FROM patient_otps WHERE email = ? FOR UPDATE";
                boolean rowExists = false;
                try (PreparedStatement ps = conn.prepareStatement(selectSql)) {
                    ps.setString(1, cleanEmail);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            rowExists = true;
                            String status = rs.getString("status");
                            Timestamp leaseExpiresAt = rs.getTimestamp("lease_expires_at");
                            Timestamp lastSentAt = rs.getTimestamp("last_sent_at");

                            // 1. Check in-flight dispatch lease
                            if ("PENDING_DISPATCH".equalsIgnoreCase(status) && leaseExpiresAt != null && now < leaseExpiresAt.getTime()) {
                                conn.rollback();
                                return PreAllocateResult.inFlight("A verification code dispatch is currently in progress. Please wait a moment.");
                            }

                            // 2. Check 60-second cooldown
                            if ("ACTIVE".equalsIgnoreCase(status) && lastSentAt != null) {
                                long elapsed = now - lastSentAt.getTime();
                                if (elapsed < 60_000) {
                                    long remainingSec = (60_000 - elapsed) / 1000 + 1;
                                    conn.rollback();
                                    return PreAllocateResult.cooldown(remainingSec);
                                }
                            }
                        }
                    }
                }

                Timestamp leaseTs = new Timestamp(now + leaseDurationMs);
                Timestamp expiryTs = new Timestamp(now + expiryDurationMs);
                Timestamp nowTs = new Timestamp(now);

                if (rowExists) {
                    String updateSql = "UPDATE patient_otps SET dispatch_id = ?, otp_hash = ?, status = 'PENDING_DISPATCH', "
                            + "lease_expires_at = ?, expires_at = ?, attempts = 0, last_sent_at = ?, created_at = ? "
                            + "WHERE email = ?";
                    try (PreparedStatement ups = conn.prepareStatement(updateSql)) {
                        ups.setString(1, dispatchId);
                        ups.setString(2, otpHash);
                        ups.setTimestamp(3, leaseTs);
                        ups.setTimestamp(4, expiryTs);
                        ups.setTimestamp(5, nowTs);
                        ups.setTimestamp(6, nowTs);
                        ups.setString(7, cleanEmail);
                        ups.executeUpdate();
                    }
                } else {
                    String insertSql = "INSERT INTO patient_otps (email, dispatch_id, otp_hash, status, lease_expires_at, "
                            + "expires_at, attempts, last_sent_at, created_at) VALUES (?, ?, ?, 'PENDING_DISPATCH', ?, ?, 0, ?, ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insertSql)) {
                        ins.setString(1, cleanEmail);
                        ins.setString(2, dispatchId);
                        ins.setString(3, otpHash);
                        ins.setTimestamp(4, leaseTs);
                        ins.setTimestamp(5, expiryTs);
                        ins.setTimestamp(6, nowTs);
                        ins.setTimestamp(7, nowTs);
                        ins.executeUpdate();
                    }
                }

                conn.commit();
                return PreAllocateResult.ok();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    /**
     * Phase 3A: Activates the pre-allocated OTP once Brevo accepts the dispatch.
     * Enforces generation safety by matching dispatch_id.
     */
    public boolean activateOtp(String email, String dispatchId) throws SQLException {
        if (email == null || dispatchId == null) return false;
        String cleanEmail = email.trim().toLowerCase();
        String sql = "UPDATE patient_otps SET status = 'ACTIVE', last_sent_at = CURRENT_TIMESTAMP "
                + "WHERE email = ? AND dispatch_id = ? AND status = 'PENDING_DISPATCH'";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, cleanEmail);
            ps.setString(2, dispatchId);
            int rows = ps.executeUpdate();
            return rows > 0;
        }
    }

    /**
     * Phase 3B/3C: Compensating cleanup if Brevo explicitly fails or times out.
     * Enforces generation safety by matching dispatch_id; never deletes a newer dispatch.
     */
    public boolean compensateCleanup(String email, String dispatchId) throws SQLException {
        if (email == null || dispatchId == null) return false;
        String cleanEmail = email.trim().toLowerCase();
        String sql = "DELETE FROM patient_otps WHERE email = ? AND dispatch_id = ? AND status = 'PENDING_DISPATCH'";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, cleanEmail);
            ps.setString(2, dispatchId);
            int rows = ps.executeUpdate();
            return rows > 0;
        }
    }

    /**
     * Concurrency-safe OTP verification with row locking, attempt limiting, and single-use deletion.
     */
    public VerifyResult verifyOtp(String email, String enteredOtp) throws SQLException {
        if (email == null || enteredOtp == null) {
            return VerifyResult.fail(0, "Email and verification code are required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        String cleanOtp = enteredOtp.trim();
        long now = System.currentTimeMillis();

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                String sql = "SELECT dispatch_id, otp_hash, status, expires_at, attempts FROM patient_otps WHERE email = ? FOR UPDATE";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, cleanEmail);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            conn.rollback();
                            return VerifyResult.fail(0, "No active verification code found. Please request a new code.");
                        }

                        String storedHash = rs.getString("otp_hash");
                        String status = rs.getString("status");
                        Timestamp expiresAt = rs.getTimestamp("expires_at");
                        int attempts = rs.getInt("attempts");

                        // 1. Check expiration
                        if (expiresAt == null || now > expiresAt.getTime()) {
                            deleteRow(conn, cleanEmail);
                            conn.commit();
                            return VerifyResult.fail(0, "Verification code has expired. Please request a new code.");
                        }

                        // 2. Check attempt limits
                        if (attempts >= 5) {
                            deleteRow(conn, cleanEmail);
                            conn.commit();
                            return VerifyResult.fail(0, "Too many failed attempts. This code has been invalidated. Please request a new code.");
                        }

                        // 3. Compute hash and compare in constant time
                        String candidateHash = hashSha256(cleanOtp);
                        boolean isMatch = MessageDigest.isEqual(
                                candidateHash.getBytes(StandardCharsets.UTF_8),
                                storedHash.getBytes(StandardCharsets.UTF_8)
                        );

                        if (isMatch) {
                            // Immediate single-use consumption in the same transaction
                            deleteRow(conn, cleanEmail);
                            conn.commit();
                            return VerifyResult.ok();
                        } else {
                            int newAttempts = attempts + 1;
                            if (newAttempts >= 5) {
                                deleteRow(conn, cleanEmail);
                            } else {
                                String incSql = "UPDATE patient_otps SET attempts = attempts + 1 WHERE email = ?";
                                try (PreparedStatement incPs = conn.prepareStatement(incSql)) {
                                    incPs.setString(1, cleanEmail);
                                    incPs.executeUpdate();
                                }
                            }
                            conn.commit();
                            int remaining = Math.max(0, 5 - newAttempts);
                            String msg = remaining > 0
                                    ? "Invalid verification code. " + remaining + " attempt(s) remaining."
                                    : "Too many failed attempts. This code has been invalidated. Please request a new code.";
                            return VerifyResult.fail(remaining, msg);
                        }
                    }
                }
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            }
        }
    }

    private void deleteRow(Connection conn, String email) throws SQLException {
        String delSql = "DELETE FROM patient_otps WHERE email = ?";
        try (PreparedStatement ps = conn.prepareStatement(delSql)) {
            ps.setString(1, email);
            ps.executeUpdate();
        }
    }

    public static String hashSha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] bytes = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
