package com.meditrail.repositories;

import com.meditrail.db.DatabaseManager;
import com.meditrail.models.Patient;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

public class PatientRepository {

    private final DatabaseManager dbManager;

    public PatientRepository(DatabaseManager dbManager) {
        this.dbManager = dbManager;
    }

    public Optional<Patient> findByPhone(String phone) throws SQLException {
        String cleanPhone = phone != null ? phone.replaceAll("[^0-9]", "") : "";
        String sql = "SELECT * FROM patients WHERE phone = ? OR phone LIKE ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, cleanPhone);
            ps.setString(2, "%" + cleanPhone);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        }
        return Optional.empty();
    }

    public Optional<Patient> findByPatientCode(String patientCode) throws SQLException {
        String sql = "SELECT * FROM patients WHERE patient_code = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, patientCode);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        }
        return Optional.empty();
    }

    public Optional<Patient> findByEmail(String email) throws SQLException {
        if (email == null || email.trim().isEmpty()) {
            return Optional.empty();
        }
        String sql = "SELECT * FROM patients WHERE LOWER(email) = LOWER(?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        }
        return Optional.empty();
    }

    public Patient save(Patient p) throws SQLException {
        if (p.getId() == null || p.getId().trim().isEmpty()) {
            p.setId(UUID.randomUUID().toString());
        }
        if (p.getPatientCode() == null || p.getPatientCode().trim().isEmpty()) {
            p.setPatientCode("MT-" + (10000 + (int)(Math.random() * 90000)));
        }

        String sql = "INSERT INTO patients (id, patient_code, name, age, dob, gender, blood_group, phone, email, "
                + "allergies, chronic_conditions, emergency_contact_name, emergency_contact_relationship, "
                + "emergency_contact_phone, insurance_provider, policy_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, p.getId());
            ps.setString(2, p.getPatientCode());
            ps.setString(3, p.getName());
            ps.setInt(4, p.getAge());
            ps.setDate(5, p.getDob() != null ? java.sql.Date.valueOf(p.getDob()) : java.sql.Date.valueOf("2000-01-01"));
            ps.setString(6, p.getGender() != null ? p.getGender() : "Other");
            ps.setString(7, p.getBloodGroup() != null ? p.getBloodGroup() : "O+");
            ps.setString(8, p.getPhone() != null ? p.getPhone().replaceAll("[^0-9]", "") : "");
            ps.setString(9, p.getEmail() != null ? p.getEmail().trim() : null);
            ps.setString(10, p.getAllergies() != null ? p.getAllergies() : "");
            ps.setString(11, p.getChronicConditions() != null ? p.getChronicConditions() : "");
            ps.setString(12, p.getEmergencyContactName() != null ? p.getEmergencyContactName() : "");
            ps.setString(13, p.getEmergencyContactRelationship() != null ? p.getEmergencyContactRelationship() : "");
            ps.setString(14, p.getEmergencyContactPhone() != null ? p.getEmergencyContactPhone() : "");
            ps.setString(15, p.getInsuranceProvider() != null ? p.getInsuranceProvider() : "");
            ps.setString(16, p.getPolicyNumber() != null ? p.getPolicyNumber() : "");
            ps.executeUpdate();
        }
        return p;
    }

    public boolean updateEmergency(String patientCode, String bloodGroup, String allergies, String conditions,
                                   String emgName, String emgRel, String emgPhone) throws SQLException {
        String sql = "UPDATE patients SET blood_group = ?, allergies = ?, chronic_conditions = ?, "
                + "emergency_contact_name = ?, emergency_contact_relationship = ?, emergency_contact_phone = ? "
                + "WHERE patient_code = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, bloodGroup);
            ps.setString(2, allergies);
            ps.setString(3, conditions);
            ps.setString(4, emgName);
            ps.setString(5, emgRel);
            ps.setString(6, emgPhone);
            ps.setString(7, patientCode);
            return ps.executeUpdate() > 0;
        }
    }

    private Patient mapResultSet(ResultSet rs) throws SQLException {
        Patient p = new Patient();
        p.setId(rs.getString("id"));
        p.setPatientCode(rs.getString("patient_code"));
        p.setName(rs.getString("name"));
        p.setAge(rs.getInt("age"));
        p.setDob(rs.getDate("dob") != null ? rs.getDate("dob").toString() : "");
        p.setGender(rs.getString("gender"));
        p.setBloodGroup(rs.getString("blood_group"));
        p.setPhone(rs.getString("phone"));
        try {
            p.setEmail(rs.getString("email"));
        } catch (SQLException ignored) {
            // For backward compatibility if column is not yet queried
        }
        p.setAllergies(rs.getString("allergies"));
        p.setChronicConditions(rs.getString("chronic_conditions"));
        p.setEmergencyContactName(rs.getString("emergency_contact_name"));
        p.setEmergencyContactRelationship(rs.getString("emergency_contact_relationship"));
        p.setEmergencyContactPhone(rs.getString("emergency_contact_phone"));
        p.setInsuranceProvider(rs.getString("insurance_provider"));
        p.setPolicyNumber(rs.getString("policy_number"));
        return p;
    }
}
