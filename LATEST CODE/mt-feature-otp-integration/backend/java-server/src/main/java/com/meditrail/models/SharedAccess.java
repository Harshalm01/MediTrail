package com.meditrail.models;

public class SharedAccess {
    private String id;
    private String patientCode;
    private String doctorName;
    private String hospitalName;
    private String department;
    private String permissions;
    private String status;
    private String accessGranted;
    private String accessExpiry;

    public SharedAccess() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPatientCode() { return patientCode; }
    public void setPatientCode(String patientCode) { this.patientCode = patientCode; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPermissions() { return permissions; }
    public void setPermissions(String permissions) { this.permissions = permissions; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAccessGranted() { return accessGranted; }
    public void setAccessGranted(String accessGranted) { this.accessGranted = accessGranted; }

    public String getAccessExpiry() { return accessExpiry; }
    public void setAccessExpiry(String accessExpiry) { this.accessExpiry = accessExpiry; }
}
