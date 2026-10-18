/**
 * MediTrail - Centralized REST API Service Client
 * Connects frontend views to the portable Java Backend Server (port 8080)
 * Replaces direct Supabase operations while providing safe offline fallback.
 */

// Dynamically resolve API URL:
// 1. window.__MEDITRAIL_API_URL__ (set by server or debug config)
// 2. Same-origin '/api' if hosted together in production
// 3. Fallback to local Java server http://localhost:8080/api for split local dev
const API_BASE_URL = (typeof window !== 'undefined' && window.__MEDITRAIL_API_URL__) 
    || (typeof window !== 'undefined' && window.location && window.location.port !== '8000' && window.location.port !== '' ? '/api' : 'http://localhost:8080/api');

/**
 * Universal helper for JSON REST requests with error handling
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('MEDITRAIL_AUTH_TOKEN') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(url, {
            ...options,
            headers
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error || `HTTP ${res.status}: ${res.statusText}`;
            if (res.status === 401) {
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.removeItem('MEDITRAIL_AUTH_TOKEN');
                }
                if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('meditrail:unauthorized', { detail: { endpoint, message: errMsg } }));
                }
            }
            throw new Error(errMsg);
        }

        return await res.json().catch(() => ({ success: true }));
    } catch (err) {
        console.warn(`[MediTrail API] Request to ${endpoint} failed:`, err.message);
        throw err;
    }
}

/**
 * Patient Authentication & Profile Operations
 */
export async function sendPatientOtp(email) {
    return apiRequest('/patient/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

export async function verifyPatientOtp(email, otp) {
    return apiRequest('/patient/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
    });
}

export async function loginPatient(email, otp) {
    return verifyPatientOtp(email, otp);
}

export async function registerPatient(patientData) {
    return apiRequest('/patient/register', {
        method: 'POST',
        body: JSON.stringify(patientData)
    });
}

export async function logout(patientCode) {
    return apiRequest('/patient/logout', {
        method: 'POST',
        body: JSON.stringify({ patientCode })
    }).catch(() => ({ success: true }));
}

export async function getPatientProfile(patientCode) {
    return apiRequest(`/patient/profile?patientCode=${encodeURIComponent(patientCode)}`);
}

export async function updateEmergencyProfile(patientCode, emergencyData) {
    return apiRequest('/patient/emergency', {
        method: 'PUT',
        body: JSON.stringify({
            patientCode,
            ...emergencyData
        })
    });
}

/**
 * Medical Records Operations
 */
export async function getMedicalRecords(patientCode = '') {
    return apiRequest(`/records?patientCode=${encodeURIComponent(patientCode)}`);
}

export async function createMedicalRecord(record) {
    return apiRequest('/records', {
        method: 'POST',
        body: JSON.stringify(record)
    });
}

/**
 * Medications & Prescriptions Operations
 */
export async function getActiveMedications(patientCode = '') {
    return apiRequest(`/medications?patientCode=${encodeURIComponent(patientCode)}`);
}

export async function requestMedicationRefill(medicationName) {
    return apiRequest('/medications/refill', {
        method: 'POST',
        body: JSON.stringify({ medicationName })
    });
}

/**
 * Controlled Record Sharing Operations
 */
export async function getSharedAccessList(patientCode = 'MT-10482') {
    return apiRequest(`/shared-access?patientCode=${encodeURIComponent(patientCode)}`);
}

export async function grantSharedAccess(patientCode, doctorData) {
    return apiRequest('/shared-access/grant', {
        method: 'POST',
        body: JSON.stringify({
            patientCode,
            ...doctorData
        })
    });
}

export async function revokeSharedAccess(patientCode, doctorNameOrId) {
    return apiRequest('/shared-access/revoke', {
        method: 'POST',
        body: JSON.stringify({
            patientCode,
            doctorName: doctorNameOrId
        })
    });
}

/**
 * Insurance Policy Document Operations (Cloudflare R2 Persistent Storage)
 */
export async function getInsurancePolicies(patientCode = '') {
    const query = patientCode ? `?patientCode=${encodeURIComponent(patientCode)}` : '';
    return apiRequest(`/policies${query}`);
}

export async function uploadInsurancePolicy(policyPayload) {
    return apiRequest('/policies/upload', {
        method: 'POST',
        body: JSON.stringify(policyPayload)
    });
}

export async function deleteInsurancePolicy(policyId) {
    return apiRequest(`/policies/${encodeURIComponent(policyId)}`, {
        method: 'DELETE'
    });
}

export function getPolicyViewUrl(policyId) {
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('MEDITRAIL_AUTH_TOKEN') : '';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/policies/${encodeURIComponent(policyId)}/view${tokenParam}`;
}

export function getPolicyDownloadUrl(policyId) {
    const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('MEDITRAIL_AUTH_TOKEN') : '';
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/policies/${encodeURIComponent(policyId)}/download${tokenParam}`;
}

/**
 * Hospital Admin & Doctor Operations
 */
export async function loginAdmin(email, password) {
    return apiRequest('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

export async function getHospitals() {
    return apiRequest('/admin/hospitals');
}

export async function createHospital(hospital) {
    return apiRequest('/admin/hospitals', {
        method: 'POST',
        body: JSON.stringify(hospital)
    });
}

export async function deleteHospital(id) {
    return apiRequest(`/admin/hospitals?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
}

export async function getDoctors() {
    return apiRequest('/admin/doctors');
}

export async function createDoctor(doctor) {
    return apiRequest('/admin/doctors', {
        method: 'POST',
        body: JSON.stringify(doctor)
    });
}

export async function deleteDoctor(idOrEmail) {
    return apiRequest(`/admin/doctors?email=${encodeURIComponent(idOrEmail)}`, {
        method: 'DELETE'
    });
}

export async function searchPatientAdmin(query) {
    return apiRequest(`/admin/patient-search?query=${encodeURIComponent(query)}`);
}

export async function getAuditLogs() {
    return apiRequest('/admin/audit-logs');
}

export async function createAuditLog(logEntry) {
    return apiRequest('/admin/audit-logs', {
        method: 'POST',
        body: JSON.stringify(logEntry)
    });
}

export async function getAdminStats() {
    return apiRequest('/admin/stats');
}

export async function updateDoctorRole(idOrEmail, role) {
    return apiRequest('/admin/doctors/role', {
        method: 'PUT',
        body: JSON.stringify({ email: idOrEmail, role })
    });
}

export async function updateDoctorStatus(idOrEmail, status) {
    return apiRequest('/admin/doctors/status', {
        method: 'PUT',
        body: JSON.stringify({ email: idOrEmail, status })
    });
}

/**
 * Dedicated Doctor Patient Access OTP Operations
 * Securely requests and verifies patient permission OTP before doctor can view records.
 */
export async function requestPatientAccessOtp(patientCode) {
    return apiRequest('/admin/patient-access/request-otp', {
        method: 'POST',
        body: JSON.stringify({ patientCode })
    });
}

export async function verifyPatientAccessOtp(accessRequestId, patientCode, otp) {
    return apiRequest('/admin/patient-access/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ accessRequestId, patientCode, otp })
    });
}

// Expose on window for easy interoperability across existing inline handlers
if (typeof window !== 'undefined') {
    window.MediTrailAPI = {
        sendPatientOtp,
        verifyPatientOtp,
        loginPatient,
        registerPatient,
        logout,
        getPatientProfile,
        updateEmergencyProfile,
        getMedicalRecords,
        createMedicalRecord,
        getActiveMedications,
        requestMedicationRefill,
        getSharedAccessList,
        grantSharedAccess,
        revokeSharedAccess,
        getInsurancePolicies,
        uploadInsurancePolicy,
        deleteInsurancePolicy,
        getPolicyViewUrl,
        getPolicyDownloadUrl,
        loginAdmin,
        getAdminStats,
        getHospitals,
        createHospital,
        deleteHospital,
        getDoctors,
        createDoctor,
        deleteDoctor,
        updateDoctorRole,
        updateDoctorStatus,
        searchPatientAdmin,
        getAuditLogs,
        createAuditLog,
        requestPatientAccessOtp,
        verifyPatientAccessOtp
    };
}
