package com.meditrail.models;

import java.sql.Timestamp;

/**
 * Represents an insurance policy document uploaded by a patient.
 * Encapsulates metadata stored in PostgreSQL / H2 linked to a Cloudflare R2 object.
 */
public class InsurancePolicy {
    private String id;
    private String patientCode;
    private String originalFilename;
    private String storageKey;
    private String contentType;
    private long fileSize;
    private String providerName;
    private String policyNumber;
    private String validUntil;
    private Timestamp createdAt;

    public InsurancePolicy() {}

    public InsurancePolicy(String id, String patientCode, String originalFilename, String storageKey,
                           String contentType, long fileSize, String providerName, String policyNumber,
                           String validUntil, Timestamp createdAt) {
        this.id = id;
        this.patientCode = patientCode;
        this.originalFilename = originalFilename;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.fileSize = fileSize;
        this.providerName = providerName;
        this.policyNumber = policyNumber;
        this.validUntil = validUntil;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientCode() { return patientCode; }
    public void setPatientCode(String patientCode) { this.patientCode = patientCode; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public String getPolicyNumber() { return policyNumber; }
    public void setPolicyNumber(String policyNumber) { this.policyNumber = policyNumber; }

    public String getValidUntil() { return validUntil; }
    public void setValidUntil(String validUntil) { this.validUntil = validUntil; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
