package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;
import com.meditrail.models.AuditLog;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AuditRepository {

    private final DatabaseManager dbManager;

    public AuditRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    public List<AuditLog> findAll() throws SQLException {
        List<AuditLog> list = new ArrayList<>();
        String sql = "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                AuditLog a = new AuditLog();
                a.setId(rs.getString("id"));
                a.setDoctorName(rs.getString("doctor_name"));
                a.setPatientCode(rs.getString("patient_code"));
                a.setHospitalName(rs.getString("hospital_name"));
                a.setAction(rs.getString("action"));
                a.setIpAddress(rs.getString("ip_address"));
                a.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toString() : "");
                list.add(a);
            }
        }
        return list;
    }

    public List<AuditLog> findByHospital(String hospitalName) throws SQLException {
        List<AuditLog> list = new ArrayList<>();
        String sql = "SELECT * FROM audit_logs WHERE LOWER(hospital_name) LIKE ? ORDER BY created_at DESC LIMIT 100";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, "%" + (hospitalName != null ? hospitalName.trim().toLowerCase() : "") + "%");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    AuditLog a = new AuditLog();
                    a.setId(rs.getString("id"));
                    a.setDoctorName(rs.getString("doctor_name"));
                    a.setPatientCode(rs.getString("patient_code"));
                    a.setHospitalName(rs.getString("hospital_name"));
                    a.setAction(rs.getString("action"));
                    a.setIpAddress(rs.getString("ip_address"));
                    a.setCreatedAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toString() : "");
                    list.add(a);
                }
            }
        }
        return list;
    }

    public AuditLog save(AuditLog a) throws SQLException {
        if (a.getId() == null || a.getId().trim().isEmpty()) {
            a.setId(UUID.randomUUID().toString());
        }
        String sql = "INSERT INTO audit_logs (id, doctor_name, patient_code, hospital_name, action, ip_address) "
                + "VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, a.getId());
            ps.setString(2, a.getDoctorName());
            ps.setString(3, a.getPatientCode());
            ps.setString(4, a.getHospitalName());
            ps.setString(5, a.getAction());
            ps.setString(6, a.getIpAddress() != null ? a.getIpAddress() : "127.0.0.1");
            ps.executeUpdate();
        }
        return a;
    }
}
