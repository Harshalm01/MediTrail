package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;
import com.meditrail.models.InsurancePolicy;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for managing insurance policy document metadata in H2 and PostgreSQL.
 */
public class InsurancePolicyRepository {

    private final DatabaseManager dbManager;

    public InsurancePolicyRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    /**
     * Finds all policy documents owned by a specific patient, ordered newest first.
     */
    public List<InsurancePolicy> findByPatientCode(String patientCode) throws SQLException {
        List<InsurancePolicy> list = new ArrayList<>();
        String sql = "SELECT * FROM insurance_policies WHERE patient_code = ? ORDER BY created_at DESC";
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

    /**
     * Finds a single policy document by its ID.
     */
    public Optional<InsurancePolicy> findById(String id) throws SQLException {
        String sql = "SELECT * FROM insurance_policies WHERE id = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        }
        return Optional.empty();
    }

    /**
     * Persists a new or updated insurance policy record.
     */
    public InsurancePolicy save(InsurancePolicy p) throws SQLException {
        if (p.getId() == null || p.getId().trim().isEmpty()) {
            p.setId(UUID.randomUUID().toString());
        }
        String sql = "INSERT INTO insurance_policies "
                + "(id, patient_code, original_filename, storage_key, content_type, file_size, provider_name, policy_number, valid_until) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, p.getId());
            ps.setString(2, p.getPatientCode());
            ps.setString(3, p.getOriginalFilename());
            ps.setString(4, p.getStorageKey());
            ps.setString(5, p.getContentType() != null ? p.getContentType() : "application/pdf");
            ps.setLong(6, p.getFileSize());
            ps.setString(7, p.getProviderName());
            ps.setString(8, p.getPolicyNumber());
            ps.setString(9, p.getValidUntil());
            ps.executeUpdate();
        }
        return p;
    }

    /**
     * Deletes a policy document metadata row, enforcing that the record belongs to the patient.
     * Returns true if a row was actually deleted.
     */
    public boolean deleteByIdAndPatient(String id, String patientCode) throws SQLException {
        String sql = "DELETE FROM insurance_policies WHERE id = ? AND patient_code = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, patientCode);
            return ps.executeUpdate() > 0;
        }
    }

    private InsurancePolicy mapResultSet(ResultSet rs) throws SQLException {
        InsurancePolicy p = new InsurancePolicy();
        p.setId(rs.getString("id"));
        p.setPatientCode(rs.getString("patient_code"));
        p.setOriginalFilename(rs.getString("original_filename"));
        p.setStorageKey(rs.getString("storage_key"));
        p.setContentType(rs.getString("content_type"));
        p.setFileSize(rs.getLong("file_size"));
        p.setProviderName(rs.getString("provider_name"));
        p.setPolicyNumber(rs.getString("policy_number"));
        p.setValidUntil(rs.getString("valid_until"));
        p.setCreatedAt(rs.getTimestamp("created_at"));
        return p;
    }
}
