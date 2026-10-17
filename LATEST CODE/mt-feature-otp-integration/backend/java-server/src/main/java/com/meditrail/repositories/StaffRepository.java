package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;
import com.meditrail.models.Hospital;
import com.meditrail.models.StaffProfile;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class StaffRepository {

    private final DatabaseManager dbManager;

    public StaffRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    public Optional<StaffProfile> findByEmail(String email) throws SQLException {
        String sql = "SELECT * FROM staff_profiles WHERE LOWER(email) = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email != null ? email.trim().toLowerCase() : "");
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapStaff(rs));
                }
            }
        }
        return Optional.empty();
    }

    public List<StaffProfile> findAllStaff() throws SQLException {
        List<StaffProfile> list = new ArrayList<>();
        String sql = "SELECT * FROM staff_profiles ORDER BY name ASC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(mapStaff(rs));
            }
        }
        return list;
    }

    public StaffProfile save(StaffProfile s) throws SQLException {
        if (s.getId() == null || s.getId().trim().isEmpty()) {
            s.setId(UUID.randomUUID().toString());
        }
        if (s.getEmail() != null) {
            deleteStaff(s.getEmail());
        }

        String sql = "INSERT INTO staff_profiles (id, name, email, role, hospital_id, hospital_name, "
                + "department, license_id, status, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, s.getId());
            ps.setString(2, s.getName());
            ps.setString(3, s.getEmail().toLowerCase());
            ps.setString(4, s.getRole());
            ps.setString(5, s.getHospitalId());
            ps.setString(6, s.getHospitalName());
            ps.setString(7, s.getDepartment());
            ps.setString(8, s.getLicenseId());
            ps.setString(9, s.getStatus() != null ? s.getStatus() : "Active");
            ps.setString(10, s.getPasswordHash());
            ps.executeUpdate();
        }
        return s;
    }

    public boolean deleteStaff(String idOrEmail) throws SQLException {
        String sql = "DELETE FROM staff_profiles WHERE id = ? OR LOWER(email) = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, idOrEmail);
            ps.setString(2, idOrEmail.toLowerCase());
            return ps.executeUpdate() > 0;
        }
    }

    public Optional<StaffProfile> findByIdOrEmail(String idOrEmail) throws SQLException {
        if (idOrEmail == null || idOrEmail.trim().isEmpty()) return Optional.empty();
        String sql = "SELECT * FROM staff_profiles WHERE id = ? OR LOWER(email) = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, idOrEmail.trim());
            ps.setString(2, idOrEmail.trim().toLowerCase());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapStaff(rs));
                }
            }
        }
        return Optional.empty();
    }

    public boolean updateRole(String idOrEmail, String newRole) throws SQLException {
        String sql = "UPDATE staff_profiles SET role = ? WHERE id = ? OR LOWER(email) = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newRole);
            ps.setString(2, idOrEmail);
            ps.setString(3, idOrEmail.toLowerCase());
            return ps.executeUpdate() > 0;
        }
    }

    public boolean updateStatus(String idOrEmail, String newStatus) throws SQLException {
        String sql = "UPDATE staff_profiles SET status = ? WHERE id = ? OR LOWER(email) = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newStatus);
            ps.setString(2, idOrEmail);
            ps.setString(3, idOrEmail.toLowerCase());
            return ps.executeUpdate() > 0;
        }
    }

    public List<StaffProfile> findStaffByHospital(String hospitalName) throws SQLException {
        List<StaffProfile> list = new ArrayList<>();
        String sql = "SELECT * FROM staff_profiles WHERE LOWER(hospital_name) LIKE ? ORDER BY name ASC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, "%" + (hospitalName != null ? hospitalName.trim().toLowerCase() : "") + "%");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapStaff(rs));
                }
            }
        }
        return list;
    }

    public org.json.JSONObject getSystemStats(String hospitalName, boolean isSuperAdmin) throws SQLException {
        org.json.JSONObject stats = new org.json.JSONObject();
        try (Connection conn = dbManager.getConnection()) {
            if (isSuperAdmin) {
                // System-wide counts across all entities
                stats.put("totalHospitals", queryCount(conn, "SELECT COUNT(*) FROM hospitals"));
                stats.put("totalStaff", queryCount(conn, "SELECT COUNT(*) FROM staff_profiles"));
                stats.put("totalDoctors", queryCount(conn, "SELECT COUNT(*) FROM staff_profiles WHERE LOWER(role) = 'doctor'"));
                stats.put("totalHospitalAdmins", queryCount(conn, "SELECT COUNT(*) FROM staff_profiles WHERE LOWER(role) IN ('hospital_admin', 'admin')"));
                stats.put("totalSuperAdmins", queryCount(conn, "SELECT COUNT(*) FROM staff_profiles WHERE LOWER(role) IN ('super_admin', 'manager')"));
                stats.put("totalPatients", queryCount(conn, "SELECT COUNT(*) FROM patients"));
                stats.put("totalRecords", queryCount(conn, "SELECT COUNT(*) FROM medical_records"));
                stats.put("totalAuditLogs", queryCount(conn, "SELECT COUNT(*) FROM audit_logs"));
                stats.put("systemStatus", "100% Encrypted & Active");
            } else {
                // Hospital-scoped counts
                String hospPattern = "%" + (hospitalName != null ? hospitalName.trim().toLowerCase() : "") + "%";
                stats.put("totalDoctors", queryCountParam(conn, "SELECT COUNT(*) FROM staff_profiles WHERE LOWER(hospital_name) LIKE ? AND LOWER(role) = 'doctor'", hospPattern));
                stats.put("totalHospitalStaff", queryCountParam(conn, "SELECT COUNT(*) FROM staff_profiles WHERE LOWER(hospital_name) LIKE ?", hospPattern));
                stats.put("totalPatients", queryCount(conn, "SELECT COUNT(*) FROM patients"));
                stats.put("totalRecords", queryCountParam(conn, "SELECT COUNT(*) FROM medical_records WHERE LOWER(hospital_name) LIKE ?", hospPattern));
                stats.put("totalAuditLogs", queryCountParam(conn, "SELECT COUNT(*) FROM audit_logs WHERE LOWER(hospital_name) LIKE ?", hospPattern));
                stats.put("systemStatus", "Hospital End-to-End Encrypted");
            }
        }
        return stats;
    }

    private int queryCount(Connection conn, String sql) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    private int queryCountParam(Connection conn, String sql, String param) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, param);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        }
    }

    public List<Hospital> findAllHospitals() throws SQLException {
        List<Hospital> list = new ArrayList<>();
        String sql = "SELECT * FROM hospitals ORDER BY name ASC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new Hospital(rs.getString("id"), rs.getString("name"), rs.getString("code"), rs.getString("city")));
            }
        }
        return list;
    }

    public Hospital saveHospital(Hospital h) throws SQLException {
        if (h.getId() == null || h.getId().trim().isEmpty()) {
            h.setId(UUID.randomUUID().toString());
        }
        String sql = "INSERT INTO hospitals (id, name, code, city) VALUES (?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, h.getId());
            ps.setString(2, h.getName());
            ps.setString(3, h.getCode());
            ps.setString(4, h.getCity());
            ps.executeUpdate();
        }
        return h;
    }

    public boolean deleteHospital(String idOrName) throws SQLException {
        try (Connection conn = dbManager.getConnection()) {
            String findSql = "SELECT id, name FROM hospitals WHERE id = ? OR LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)";
            String hospId = null;
            String hospName = null;
            try (PreparedStatement fps = conn.prepareStatement(findSql)) {
                fps.setString(1, idOrName);
                fps.setString(2, idOrName);
                fps.setString(3, idOrName);
                try (ResultSet rs = fps.executeQuery()) {
                    if (rs.next()) {
                        hospId = rs.getString("id");
                        hospName = rs.getString("name");
                    }
                }
            }

            // Remove associated hospital staff (doctors and hospital admins), preserving Platform Managers
            String delStaffSql = "DELETE FROM staff_profiles WHERE (hospital_id = ? OR LOWER(hospital_name) = LOWER(?)) AND LOWER(role) NOT IN ('super_admin', 'manager')";
            try (PreparedStatement sps = conn.prepareStatement(delStaffSql)) {
                sps.setString(1, hospId != null ? hospId : idOrName);
                sps.setString(2, hospName != null ? hospName : idOrName);
                sps.executeUpdate();
            }

            String sql = "DELETE FROM hospitals WHERE id = ? OR LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, idOrName);
                ps.setString(2, idOrName);
                ps.setString(3, idOrName);
                return ps.executeUpdate() > 0;
            }
        }
    }

    private StaffProfile mapStaff(ResultSet rs) throws SQLException {
        StaffProfile s = new StaffProfile();
        s.setId(rs.getString("id"));
        s.setName(rs.getString("name"));
        s.setEmail(rs.getString("email"));
        s.setRole(rs.getString("role"));
        s.setHospitalId(rs.getString("hospital_id"));
        s.setHospitalName(rs.getString("hospital_name"));
        s.setDepartment(rs.getString("department"));
        s.setLicenseId(rs.getString("license_id"));
        s.setStatus(rs.getString("status"));
        s.setPasswordHash(rs.getString("password_hash"));
        return s;
    }

    public void saveSession(String token, String userType, String identifier, String name, String role, String hospitalName, long createdAt) {
        String delSql = "DELETE FROM active_sessions WHERE token = ?";
        String insSql = "INSERT INTO active_sessions (token, user_type, identifier, name, role, hospital_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection()) {
            try (PreparedStatement ps = conn.prepareStatement(delSql)) {
                ps.setString(1, token);
                ps.executeUpdate();
            }
            try (PreparedStatement ps = conn.prepareStatement(insSql)) {
                ps.setString(1, token);
                ps.setString(2, userType != null ? userType : "staff");
                ps.setString(3, identifier != null ? identifier : "");
                ps.setString(4, name != null ? name : "");
                ps.setString(5, role != null ? role : "");
                ps.setString(6, hospitalName != null ? hospitalName : "");
                ps.setLong(7, createdAt);
                ps.executeUpdate();
            }
        } catch (SQLException e) {
            // Table may not yet be initialized during early bootstrap
        }
    }

    public void deleteSession(String token) {
        String sql = "DELETE FROM active_sessions WHERE token = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, token);
            ps.executeUpdate();
        } catch (SQLException e) {
            // Ignore
        }
    }

    public List<StoredSession> findAllSessions() {
        List<StoredSession> list = new ArrayList<>();
        String sql = "SELECT * FROM active_sessions";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(new StoredSession(
                    rs.getString("token"),
                    rs.getString("user_type"),
                    rs.getString("identifier"),
                    rs.getString("name"),
                    rs.getString("role"),
                    rs.getString("hospital_name"),
                    rs.getLong("created_at")
                ));
            }
        } catch (SQLException e) {
            // Table may not yet be initialized
        }
        return list;
    }

    public static class StoredSession {
        public final String token;
        public final String userType;
        public final String identifier;
        public final String name;
        public final String role;
        public final String hospitalName;
        public final long createdAt;

        public StoredSession(String token, String userType, String identifier, String name, String role, String hospitalName, long createdAt) {
            this.token = token;
            this.userType = userType;
            this.identifier = identifier;
            this.name = name;
            this.role = role;
            this.hospitalName = hospitalName;
            this.createdAt = createdAt;
        }
    }
}
