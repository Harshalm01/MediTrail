package com.meditrail.models;

public class MedicalRecord {
    private String id;
    private String patientId;
    private String patientCode;
    private int year;
    private String date;
    private String type;
    private String category;
    private String title;
    private String hospital;
    private String doctor;
    private String department;
    private String shortDescription;
    private String diagnosis;
    private String procedureNotes;
    private String clinicalNotes;
    private String treatmentPlan;
    private String medications;   // JSON string
    private String attachments;   // JSON string
    private String status;

    public MedicalRecord() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getPatientCode() { return patientCode; }
    public void setPatientCode(String patientCode) { this.patientCode = patientCode; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }

    public String getDoctor() { return doctor; }
    public void setDoctor(String doctor) { this.doctor = doctor; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getProcedureNotes() { return procedureNotes; }
    public void setProcedureNotes(String procedureNotes) { this.procedureNotes = procedureNotes; }

    public String getClinicalNotes() { return clinicalNotes; }
    public void setClinicalNotes(String clinicalNotes) { this.clinicalNotes = clinicalNotes; }

    public String getTreatmentPlan() { return treatmentPlan; }
    public void setTreatmentPlan(String treatmentPlan) { this.treatmentPlan = treatmentPlan; }

    public String getMedications() { return medications; }
    public void setMedications(String medications) { this.medications = medications; }

    public String getAttachments() { return attachments; }
    public void setAttachments(String attachments) { this.attachments = attachments; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
