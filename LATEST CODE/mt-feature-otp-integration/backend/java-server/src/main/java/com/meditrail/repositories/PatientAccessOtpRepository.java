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
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * Dedicated Authoritative Repository for Doctor-to-Patient Access OTPs.
 * Completely independent from Patient Login OTPs.
 * Enforces cryptographic generation, attempt limiting, expiry, and single-use consumption.
 */
public class PatientAccessOtpRepository {

    private static final Logger LOGGER = Logger.getLogger(PatientAccessOtpRepository.class.getName());

    private final DatabaseManager dbManager;

    // Cache of verified access grants: key = patientCode.toUpperCase() + "::" + doctorEmail.toLowerCase()
    // Value = expiration timestamp in millis (e.g. 2 hours after verification)
    private final ConcurrentHashMap<String, Long> verifiedAccessGrants = new ConcurrentHashMap<>();

    public static class PreAllocateResult {
        public final boolean success;
        public final boolean isCooldown;
        public final boolean isInFlight;
        public final long remainingCooldownSeconds;
        public final String errorMessage;

        private PreAllocateResult(boolean success, boolean isCooldown, boolean isInFlight, long remainingCooldownSeconds, String errorMessage) {
            this.success = success;
            this.isCooldown = isCooldown;
            this.isInFlight = isInFlight;
            this.remainingCooldownSeconds = remainingCooldownSeconds;
            this.errorMessage = errorMessage;
        }

        public static PreAllocateResult ok() {
            return new PreAllocateResult(true, false, false, 0, null);
        }

        public static PreAllocateResult cooldown(long remainingSeconds) {
            return new PreAllocateResult(false, true, false, remainingSeconds,
                    "Please wait " + remainingSeconds + " second(s) before requesting another access authorization code.");
        }

        public static PreAllocateResult inFlight(String message) {
            return new PreAllocateResult(false, false, true, 0, message);
        }

        public static PreAllocateResult error(String message) {
            return new PreAllocateResult(false, false, false, 0, message);
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

    public PatientAccessOtpRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    /**
     * Phase 1: Durably pre-allocates a Patient Access OTP record with 'PENDING_DISPATCH' status.
     * Enforces 60-second cooldown per (patientCode, doctorId) pair.
     */
    public PreAllocateResult preAllocateAccessOtp(String accessRequestId,
                                                  String patientCode,
                                                  String doctorId,
                                                  String doctorName,
                                                  String hospitalName,
                                                  String recipientEmail,
                                                  String dispatchId,
                                                  String rawOtp,
                                                  long leaseDurationMs,
                                                  long expiryDurationMs) throws SQLException {
        if (accessRequestId == null || patientCode == null || doctorId == null || rawOtp == null) {
            return PreAllocateResult.error("Missing required access request parameters.");
        }

        String cleanPt = patientCode.trim().toUpperCase();
        String cleanDoc = doctorId.trim().toLowerCase();
        String cleanEmail = recipientEmail != null ? recipientEmail.trim().toLowerCase() : "";
        String otpHashed = hashSha256(rawOtp.trim());
        long now = System.currentTimeMillis();

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // Check recent requests for this patient and doctor to enforce cooldown
                String selectSql = "SELECT id, dispatch_id, status, lease_expires_at, last_sent_at FROM patient_access_otps "
                        + "WHERE patient_code = ? AND doctor_id = ? AND status IN ('PENDING_DISPATCH', 'ACTIVE') ORDER BY created_at DESC";
                try (PreparedStatement ps = conn.prepareStatement(selectSql)) {
                    ps.setString(1, cleanPt);
                    ps.setString(2, cleanDoc);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            String status = rs.getString("status");
                            Timestamp leaseExpiresAt = rs.getTimestamp("lease_expires_at");
                            Timestamp lastSentAt = rs.getTimestamp("last_sent_at");

                            // In-flight lease check
                            if ("PENDING_DISPATCH".equalsIgnoreCase(status) && leaseExpiresAt != null && now < leaseExpiresAt.getTime()) {
                                conn.rollback();
                                return PreAllocateResult.inFlight("An access authorization dispatch is already in progress. Please wait a moment.");
                            }

                            // 60-second cooldown check
                            if (lastSentAt != null) {
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

                // Invalidate any older unverified OTPs for this patient-doctor pair
                String expireOlderSql = "UPDATE patient_access_otps SET status = 'EXPIRED' WHERE patient_code = ? AND doctor_id = ? AND status IN ('PENDING_DISPATCH', 'ACTIVE')";
                try (PreparedStatement expPs = conn.prepareStatement(expireOlderSql)) {
                    expPs.setString(1, cleanPt);
                    expPs.setString(2, cleanDoc);
                    expPs.executeUpdate();
                }

                Timestamp leaseTs = new Timestamp(now + leaseDurationMs);
                Timestamp expiryTs = new Timestamp(now + expiryDurationMs);
                Timestamp nowTs = new Timestamp(now);

                String insertSql = "INSERT INTO patient_access_otps (id, patient_code, doctor_id, doctor_name, hospital_name, "
                        + "recipient_email, dispatch_id, otp_hash, status, lease_expires_at, expires_at, attempts, last_sent_at, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_DISPATCH', ?, ?, 0, ?, ?)";
                try (PreparedStatement ins = conn.prepareStatement(insertSql)) {
                    ins.setString(1, accessRequestId);
                    ins.setString(2, cleanPt);
                    ins.setString(3, cleanDoc);
                    ins.setString(4, doctorName);
                    ins.setString(5, hospitalName);
                    ins.setString(6, cleanEmail);
                    ins.setString(7, dispatchId);
                    ins.setString(8, otpHashed);
                    ins.setTimestamp(9, leaseTs);
                    ins.setTimestamp(10, expiryTs);
                    ins.setTimestamp(11, nowTs);
                    ins.setTimestamp(12, nowTs);
                    ins.executeUpdate();
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
     * Phase 3A: Activates pre-allocated access OTP once Brevo delivery succeeds.
     */
    public boolean activateAccessOtp(String accessRequestId, String dispatchId) throws SQLException {
        if (accessRequestId == null || dispatchId == null) return false;
        String sql = "UPDATE patient_access_otps SET status = 'ACTIVE', last_sent_at = CURRENT_TIMESTAMP "
                + "WHERE id = ? AND dispatch_id = ? AND status = 'PENDING_DISPATCH'";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, accessRequestId);
            ps.setString(2, dispatchId);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * Phase 3B: Compensating cleanup if email delivery fails.
     */
    public boolean compensateCleanup(String accessRequestId, String dispatchId) throws SQLException {
        if (accessRequestId == null || dispatchId == null) return false;
        String sql = "DELETE FROM patient_access_otps WHERE id = ? AND dispatch_id = ? AND status = 'PENDING_DISPATCH'";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, accessRequestId);
            ps.setString(2, dispatchId);
            return ps.executeUpdate() > 0;
        }
    }

    /**
     * Verifies the Patient Access OTP entered by the attending doctor.
     * Enforces exact patient binding, doctor binding, expiration, attempt limit, and single-use consumption.
     */
    public VerifyResult verifyAccessOtp(String accessRequestId, String patientCode, String doctorId, String enteredOtp) throws SQLException {
        if (accessRequestId == null || patientCode == null || doctorId == null || enteredOtp == null) {
            return VerifyResult.fail(0, "Access request ID, patient code, and 6-digit authorization code are required.");
        }

        String cleanPt = patientCode.trim().toUpperCase();
        String cleanDoc = doctorId.trim().toLowerCase();
        String cleanOtp = enteredOtp.trim();
        long now = System.currentTimeMillis();

        try (Connection conn = dbManager.getConnection()) {
            conn.setAutoCommit(false);
            try {
                String sql = "SELECT id, patient_code, doctor_id, doctor_name, otp_hash, status, expires_at, attempts "
                        + "FROM patient_access_otps WHERE id = ? AND patient_code = ? AND doctor_id = ?";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, accessRequestId);
                    ps.setString(2, cleanPt);
                    ps.setString(3, cleanDoc);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) {
                            conn.rollback();
                            return VerifyResult.fail(0, "No active access authorization found for this patient and doctor request.");
                        }

                        String status = rs.getString("status");
                        String storedHash = rs.getString("otp_hash");
                        Timestamp expiresAt = rs.getTimestamp("expires_at");
                        int attempts = rs.getInt("attempts");
                        String docName = rs.getString("doctor_name");

                        // 1. Verify status is ACTIVE (cannot reuse VERIFIED or EXPIRED codes)
                        if (!"ACTIVE".equalsIgnoreCase(status)) {
                            conn.rollback();
                            if ("VERIFIED".equalsIgnoreCase(status)) {
                                return VerifyResult.fail(0, "This authorization code has already been used and cannot be reused.");
                            } else {
                                return VerifyResult.fail(0, "This authorization code has expired or been cancelled. Please request a new code.");
                            }
                        }

                        // 2. Check expiration
                        if (expiresAt == null || now > expiresAt.getTime()) {
                            String expSql = "UPDATE patient_access_otps SET status = 'EXPIRED' WHERE id = ?";
                            try (PreparedStatement expPs = conn.prepareStatement(expSql)) {
                                expPs.setString(1, accessRequestId);
                                expPs.executeUpdate();
                            }
                            conn.commit();
                            return VerifyResult.fail(0, "The Patient Access OTP has expired (5-minute limit). Please request a new code.");
                        }

                        // 3. Check attempt limit
                        if (attempts >= 5) {
                            String expSql = "UPDATE patient_access_otps SET status = 'EXPIRED' WHERE id = ?";
                            try (PreparedStatement expPs = conn.prepareStatement(expSql)) {
                                expPs.setString(1, accessRequestId);
                                expPs.executeUpdate();
                            }
                            conn.commit();
                            return VerifyResult.fail(0, "Too many failed attempts. This authorization code has been invalidated for security.");
                        }

                        // 4. Constant-time hash comparison
                        String candidateHash = hashSha256(cleanOtp);
                        boolean isMatch = MessageDigest.isEqual(
                                candidateHash.getBytes(StandardCharsets.UTF_8),
                                storedHash.getBytes(StandardCharsets.UTF_8)
                        );

                        if (isMatch) {
                            // Immediate single-use consumption: mark as VERIFIED
                            String verSql = "UPDATE patient_access_otps SET status = 'VERIFIED' WHERE id = ?";
                            try (PreparedStatement verPs = conn.prepareStatement(verSql)) {
                                verPs.setString(1, accessRequestId);
                                verPs.executeUpdate();
                            }
                            conn.commit();

                            // Grant active consultation access session
                            grantVerifiedAccess(cleanPt, cleanDoc, docName);

                            return VerifyResult.ok();
                        } else {
                            int newAttempts = attempts + 1;
                            if (newAttempts >= 5) {
                                String expSql = "UPDATE patient_access_otps SET status = 'EXPIRED', attempts = ? WHERE id = ?";
                                try (PreparedStatement expPs = conn.prepareStatement(expSql)) {
                                    expPs.setInt(1, newAttempts);
                                    expPs.setString(2, accessRequestId);
                                    expPs.executeUpdate();
                                }
                            } else {
                                String incSql = "UPDATE patient_access_otps SET attempts = ? WHERE id = ?";
                                try (PreparedStatement incPs = conn.prepareStatement(incSql)) {
                                    incPs.setInt(1, newAttempts);
                                    incPs.setString(2, accessRequestId);
                                    incPs.executeUpdate();
                                }
                            }
                            conn.commit();
                            int remaining = Math.max(0, 5 - newAttempts);
                            String msg = remaining > 0
                                    ? "Invalid authorization code. " + remaining + " attempt(s) remaining."
                                    : "Too many failed attempts. This authorization code has been invalidated.";
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

    /**
     * Grants active verified access for a doctor and patient following successful OTP verification.
     * Active for 2 hours (typical clinical consultation window).
     */
    public void grantVerifiedAccess(String patientCode, String doctorEmail, String doctorName) {
        if (patientCode == null || doctorEmail == null) return;
        long expiry = System.currentTimeMillis() + (2 * 60 * 60 * 1000L); // 2 hours
        String keyEmail = patientCode.trim().toUpperCase() + "::" + doctorEmail.trim().toLowerCase();
        verifiedAccessGrants.put(keyEmail, expiry);

        if (doctorName != null && !doctorName.trim().isEmpty()) {
            String keyName = patientCode.trim().toUpperCase() + "::" + doctorName.trim().toLowerCase();
            verifiedAccessGrants.put(keyName, expiry);
        }
        LOGGER.info("[PatientAccessOtp] Granted verified record access to Dr. " + doctorName + " (" + doctorEmail + ") for patient " + patientCode);
    }

    /**
     * Checks if a doctor currently holds an active, verified access grant for the given patient.
     * Enforced strictly in RecordsHandler before medical records can be queried.
     */
    public boolean hasActiveVerifiedAccess(String patientCode, String doctorEmail, String doctorName) {
        if (patientCode == null) return false;
        long now = System.currentTimeMillis();
        String cleanPt = patientCode.trim().toUpperCase();

        if (doctorEmail != null) {
            String keyEmail = cleanPt + "::" + doctorEmail.trim().toLowerCase();
            Long exp = verifiedAccessGrants.get(keyEmail);
            if (exp != null && exp > now) {
                return true;
            } else if (exp != null) {
                verifiedAccessGrants.remove(keyEmail);
            }
        }

        if (doctorName != null) {
            String keyName = cleanPt + "::" + doctorName.trim().toLowerCase();
            Long exp = verifiedAccessGrants.get(keyName);
            if (exp != null && exp > now) {
                return true;
            } else if (exp != null) {
                verifiedAccessGrants.remove(keyName);
            }
        }

        return false;
    }

    /**
     * Explicitly revokes active verified access for a doctor and patient.
     */
    public void revokeVerifiedAccess(String patientCode, String doctorEmail) {
        if (patientCode == null || doctorEmail == null) return;
        String key = patientCode.trim().toUpperCase() + "::" + doctorEmail.trim().toLowerCase();
        verifiedAccessGrants.remove(key);
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
