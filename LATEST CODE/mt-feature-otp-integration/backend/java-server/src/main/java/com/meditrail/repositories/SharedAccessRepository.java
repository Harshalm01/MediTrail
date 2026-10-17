package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;
import com.meditrail.models.SharedAccess;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class SharedAccessRepository {

    private final DatabaseManager dbManager;

    public SharedAccessRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    public List<SharedAccess> findByPatientCode(String patientCode) throws SQLException {
        List<SharedAccess> list = new ArrayList<>();
        String sql = "SELECT * FROM shared_access WHERE patient_code = ? ORDER BY created_at DESC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, patientCode);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSet(rs));
                }
            }
        }
        return list;
    }

    public Optional<SharedAccess> findActiveByPatientAndDoctor(String patientCode, String doctorName) throws SQLException {
        String sql = "SELECT * FROM shared_access WHERE patient_code = ? AND doctor_name = ? AND status = 'Active'";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, patientCode);
            ps.setString(2, doctorName);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        }
        return Optional.empty();
    }

    public SharedAccess save(SharedAccess s) throws SQLException {
        if (s.getId() == null || s.getId().trim().isEmpty()) {
            s.setId(UUID.randomUUID().toString());
        }

        String sql = "INSERT INTO shared_access (id, patient_code, doctor_name, hospital_name, department, "
                + "permissions, status, access_granted, access_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, s.getId());
            ps.setString(2, s.getPatientCode());
            ps.setString(3, s.getDoctorName());
            ps.setString(4, s.getHospitalName());
            ps.setString(5, s.getDepartment());
            ps.setString(6, s.getPermissions() != null ? s.getPermissions() : "Full Medical History");
            ps.setString(7, s.getStatus() != null ? s.getStatus() : "Active");
            ps.setString(8, s.getAccessGranted());
            ps.setString(9, s.getAccessExpiry() != null ? s.getAccessExpiry() : "Permanent");
            ps.executeUpdate();
        }
        return s;
    }

    public boolean revoke(String patientCode, String doctorName) throws SQLException {
        String sql = "UPDATE shared_access SET status = 'Revoked' WHERE patient_code = ? AND (doctor_name = ? OR id = ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, patientCode);
            ps.setString(2, doctorName);
            ps.setString(3, doctorName);
            return ps.executeUpdate() > 0;
        }
    }

    private SharedAccess mapResultSet(ResultSet rs) throws SQLException {
        SharedAccess s = new SharedAccess();
        s.setId(rs.getString("id"));
        s.setPatientCode(rs.getString("patient_code"));
        s.setDoctorName(rs.getString("doctor_name"));
        s.setHospitalName(rs.getString("hospital_name"));
        s.setDepartment(rs.getString("department"));
        s.setPermissions(rs.getString("permissions"));
        s.setStatus(rs.getString("status"));
        s.setAccessGranted(rs.getString("access_granted"));
        s.setAccessExpiry(rs.getString("access_expiry"));
        return s;
    }
}
