-- ==============================================================================
-- MEDITRAIL PRODUCTION DATABASE SCHEMA (PostgreSQL Compatible)
-- Executed on deployment server bootstrap when DB_TYPE=postgres
-- ==============================================================================

-- 1. HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) UNIQUE NOT NULL,
    city VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. STAFF PROFILES (RBAC for Platform Super Admins, Hospital Admins, & Doctors)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'super_admin', 'hospital_admin', 'doctor'
    hospital_id VARCHAR(36) REFERENCES hospitals(id) ON DELETE SET NULL,
    hospital_name VARCHAR(255),
    department VARCHAR(255),
    license_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    patient_code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    allergies TEXT DEFAULT '',
    chronic_conditions TEXT DEFAULT '',
    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(32),
    insurance_provider VARCHAR(255),
    policy_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. MEDICAL RECORDS TABLE
CREATE TABLE IF NOT EXISTS medical_records (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) REFERENCES patients(id) ON DELETE CASCADE,
    patient_code VARCHAR(32) NOT NULL,
    record_year INT NOT NULL,
    event_date VARCHAR(32) NOT NULL,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    short_description VARCHAR(1000),
    diagnosis TEXT,
    procedure_notes TEXT,
    clinical_notes TEXT,
    treatment_plan TEXT,
    medications TEXT DEFAULT '[]',
    attachments TEXT DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. SHARED ACCESS PERMISSIONS (Doctor Controlled Record Sharing)
CREATE TABLE IF NOT EXISTS shared_access (
    id VARCHAR(36) PRIMARY KEY,
    patient_code VARCHAR(32) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    hospital_name VARCHAR(255),
    department VARCHAR(255),
    permissions VARCHAR(100) DEFAULT 'Full Medical History',
    status VARCHAR(50) DEFAULT 'Active',
    access_granted VARCHAR(32) NOT NULL,
    access_expiry VARCHAR(32) DEFAULT 'Permanent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    doctor_name VARCHAR(255) NOT NULL,
    patient_code VARCHAR(32) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. INSURANCE POLICIES TABLE (Cloudflare R2 Object Metadata)
CREATE TABLE IF NOT EXISTS insurance_policies (
    id VARCHAR(36) PRIMARY KEY,
    patient_code VARCHAR(32) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) UNIQUE NOT NULL,
    content_type VARCHAR(100) DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL,
    provider_name VARCHAR(255),
    policy_number VARCHAR(100),
    valid_until VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_policies_patient_code ON insurance_policies(patient_code);

-- 8. PATIENT OTPS TABLE (Authoritative Persistent Brevo Email OTP Store)
CREATE TABLE IF NOT EXISTS patient_otps (
    email VARCHAR(255) PRIMARY KEY,
    dispatch_id VARCHAR(36) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING_DISPATCH' NOT NULL, -- 'PENDING_DISPATCH', 'ACTIVE'
    lease_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_otps_dispatch ON patient_otps(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_patient_otps_status ON patient_otps(status);

-- 9. PATIENT ACCESS OTPS TABLE (Doctor Record Access Permissions)
CREATE TABLE IF NOT EXISTS patient_access_otps (
    id VARCHAR(36) PRIMARY KEY,
    patient_code VARCHAR(32) NOT NULL,
    doctor_id VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    hospital_name VARCHAR(255),
    recipient_email VARCHAR(255) NOT NULL,
    dispatch_id VARCHAR(36) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING_DISPATCH' NOT NULL, -- 'PENDING_DISPATCH', 'ACTIVE', 'VERIFIED', 'EXPIRED'
    lease_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_access_otps_pt_doc ON patient_access_otps(patient_code, doctor_id);
CREATE INDEX IF NOT EXISTS idx_access_otps_dispatch ON patient_access_otps(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_access_otps_status ON patient_access_otps(status);

