package com.meditrail.services;

import com.meditrail.models.StaffProfile;
import com.meditrail.repositories.StaffRepository;
import org.mindrot.jbcrypt.BCrypt;

import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication and authorization service for Patients and Hospital Staff.
 * Issues session tokens and enforces role-based access control.
 */
public class AuthService {

    private final StaffRepository staffRepository;

    // Token -> SessionData
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public static class Session {
        public final String id;
        public final String userType; // "patient" or "staff"
        public final String identifier; // patientCode or staff email
        public final String name;
        public final String role; // "patient", "super_admin", "hospital_admin", "doctor"
        public final String hospitalName;
        public final String hospitalId;
        public final long createdAt;

        public Session(String id, String userType, String identifier, String name, String role, String hospitalName) {
            this(id, userType, identifier, name, role, hospitalName, null, System.currentTimeMillis());
        }

        public Session(String id, String userType, String identifier, String name, String role, String hospitalName, long createdAt) {
            this(id, userType, identifier, name, role, hospitalName, null, createdAt);
        }

        public Session(String id, String userType, String identifier, String name, String role, String hospitalName, String hospitalId) {
            this(id, userType, identifier, name, role, hospitalName, hospitalId, System.currentTimeMillis());
        }

        public Session(String id, String userType, String identifier, String name, String role, String hospitalName, String hospitalId, long createdAt) {
            this.id = id;
            this.userType = userType;
            this.identifier = identifier;
            this.name = name;
            this.role = role;
            this.hospitalName = hospitalName;
            this.hospitalId = hospitalId;
            this.createdAt = createdAt;
        }
    }

    public AuthService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
        // Warm session cache from database on server startup
        try {
            for (StaffRepository.StoredSession s : staffRepository.findAllSessions()) {
                sessions.put(s.token, new Session(s.token, s.userType, s.identifier, s.name, s.role, s.hospitalName, null, s.createdAt));
            }
        } catch (Exception ignored) {}
    }

    /**
     * Authenticate hospital staff member (super_admin, hospital_admin, doctor).
     */
    public Optional<Session> authenticateStaff(String email, String password) throws SQLException {
        Optional<StaffProfile> staffOpt = staffRepository.findByEmail(email);
        if (staffOpt.isEmpty()) {
            return Optional.empty();
        }

        StaffProfile staff = staffOpt.get();
        boolean passwordValid = false;

        // Check if stored password is BCrypt or demo plaintext
        String stored = staff.getPasswordHash();
        if (stored != null) {
            if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
                try {
                    passwordValid = BCrypt.checkpw(password, stored);
                } catch (Exception e) {
                    passwordValid = false;
                }
            } else {
                // Development fallback for demo seed accounts
                passwordValid = stored.equals(password);
            }
        }

        if (!passwordValid) {
            // Check if the account has an old dummy/temporary test hash and user is now logging in with the custom password they entered
            boolean isTemporaryDevHash = false;
            try {
                if (stored != null && (BCrypt.checkpw("admin123", stored) 
                        || BCrypt.checkpw("somaiya@123", stored) 
                        || "admin123".equals(stored) 
                        || "somaiya@123".equals(stored))) {
                    isTemporaryDevHash = true;
                }
            } catch (Exception ignored) {}

            if (isTemporaryDevHash && "hospital_admin".equalsIgnoreCase(staff.getRole()) 
                    && !"admin123".equals(password) && !"somaiya@123".equals(password)) {
                // Permanently adopt the user's custom entered password as their BCrypt hash in database
                staff.setPasswordHash(hashPassword(password));
                staffRepository.save(staff);
                passwordValid = true;
            } else {
                return Optional.empty();
            }
        }

        String token = "stf_" + UUID.randomUUID().toString().replace("-", "");
        Session session = new Session(token, "staff", staff.getEmail(), staff.getName(), staff.getRole(), staff.getHospitalName(), staff.getHospitalId());
        sessions.put(token, session);
        staffRepository.saveSession(token, "staff", staff.getEmail(), staff.getName(), staff.getRole(), staff.getHospitalName(), session.createdAt);
        return Optional.of(session);
    }

    /**
     * Authenticate Patient session with phone / OTP.
     */
    public Session createPatientSession(String patientCode, String name, String phone) {
        String token = "pat_" + UUID.randomUUID().toString().replace("-", "");
        Session session = new Session(token, "patient", patientCode, name, "patient", "MediTrail");
        sessions.put(token, session);
        staffRepository.saveSession(token, "patient", patientCode, name, "patient", "MediTrail", session.createdAt);
        return session;
    }

    public Optional<Session> getSession(String token) {
        if (token == null || token.trim().isEmpty()) {
            return Optional.empty();
        }
        String cleanToken = token.trim();
        Session session = sessions.get(cleanToken);
        if (session != null) {
            return Optional.of(session);
        }

        // Check persistent database if not found in memory (e.g. after server restart)
        try {
            for (StaffRepository.StoredSession s : staffRepository.findAllSessions()) {
                if (cleanToken.equals(s.token)) {
                    Session restored = new Session(s.token, s.userType, s.identifier, s.name, s.role, s.hospitalName, s.createdAt);
                    sessions.put(cleanToken, restored);
                    return Optional.of(restored);
                }
            }
        } catch (Exception ignored) {}

        return Optional.empty();
    }

    public void invalidateSession(String token) {
        if (token != null) {
            String clean = token.trim();
            sessions.remove(clean);
            staffRepository.deleteSession(clean);
        }
    }

    public static String hashPassword(String plainPassword) {
        return BCrypt.hashpw(plainPassword, BCrypt.gensalt(10));
    }
}
