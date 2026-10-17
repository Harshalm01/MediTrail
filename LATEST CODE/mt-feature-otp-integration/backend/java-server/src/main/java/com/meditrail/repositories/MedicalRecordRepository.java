package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;
import com.meditrail.models.MedicalRecord;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class MedicalRecordRepository {

    private final DatabaseManager dbManager;

    public MedicalRecordRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    public List<MedicalRecord> findByPatientCode(String patientCode) throws SQLException {
        List<MedicalRecord> records = new ArrayList<>();
        String sql = "SELECT * FROM medical_records WHERE patient_code = ? ORDER BY record_year DESC, created_at DESC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, patientCode);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    records.add(mapResultSet(rs));
                }
            }
        }

        // Sort chronologically by actual medical event date (newest first)
        java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", java.util.Locale.ENGLISH);
        records.sort((a, b) -> {
            try {
                java.time.LocalDate da = java.time.LocalDate.parse(a.getDate(), dtf);
                java.time.LocalDate db = java.time.LocalDate.parse(b.getDate(), dtf);
                return db.compareTo(da); // Newest event date first
            } catch (Exception e) {
                return Integer.compare(b.getYear(), a.getYear());
            }
        });

        return records;
    }

    public Optional<MedicalRecord> findById(String recordId) throws SQLException {
        String sql = "SELECT * FROM medical_records WHERE id = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, recordId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        }
        return Optional.empty();
    }

    public MedicalRecord save(MedicalRecord r) throws SQLException {
        if (r.getId() == null || r.getId().trim().isEmpty()) {
            r.setId(UUID.randomUUID().toString());
        }

        String sql = "INSERT INTO medical_records (id, patient_id, patient_code, record_year, event_date, type, category, "
                + "title, hospital_name, doctor_name, department, short_description, diagnosis, procedure_notes, "
                + "clinical_notes, treatment_plan, medications, attachments, status) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, r.getId());
            ps.setString(2, r.getPatientId());
            ps.setString(3, r.getPatientCode());
            ps.setInt(4, r.getYear());
            ps.setString(5, r.getDate());
            ps.setString(6, r.getType());
            ps.setString(7, r.getCategory());
            ps.setString(8, r.getTitle());
            ps.setString(9, r.getHospital());
            ps.setString(10, r.getDoctor());
            ps.setString(11, r.getDepartment());
            ps.setString(12, r.getShortDescription());
            ps.setString(13, r.getDiagnosis());
            ps.setString(14, r.getProcedureNotes());
            ps.setString(15, r.getClinicalNotes());
            ps.setString(16, r.getTreatmentPlan());
            ps.setString(17, r.getMedications() != null ? r.getMedications() : "[]");
            ps.setString(18, r.getAttachments() != null ? r.getAttachments() : "[]");
            ps.setString(19, r.getStatus() != null ? r.getStatus() : "Completed");
            ps.executeUpdate();
        }
        return r;
    }

    private MedicalRecord mapResultSet(ResultSet rs) throws SQLException {
        MedicalRecord r = new MedicalRecord();
        r.setId(rs.getString("id"));
        r.setPatientId(rs.getString("patient_id"));
        r.setPatientCode(rs.getString("patient_code"));
        r.setYear(rs.getInt("record_year"));
        r.setDate(rs.getString("event_date"));
        r.setType(rs.getString("type"));
        r.setCategory(rs.getString("category"));
        r.setTitle(rs.getString("title"));
        r.setHospital(rs.getString("hospital_name"));
        r.setDoctor(rs.getString("doctor_name"));
        r.setDepartment(rs.getString("department"));
        r.setShortDescription(rs.getString("short_description"));
        r.setDiagnosis(rs.getString("diagnosis"));
        r.setProcedureNotes(rs.getString("procedure_notes"));
        r.setClinicalNotes(rs.getString("clinical_notes"));
        r.setTreatmentPlan(rs.getString("treatment_plan"));
        r.setMedications(rs.getString("medications"));
        r.setAttachments(rs.getString("attachments"));
        r.setStatus(rs.getString("status"));
        return r;
    }
}
