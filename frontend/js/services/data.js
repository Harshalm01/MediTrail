/**
 * MediTrail - Data Access Service Layer
 * 
 * Centralizes data-access operations for patient profiles, medical records,
 * medications, diagnostic reports, and physician sharing permissions.
 * 
 * Provides a clean interface over the client-side data store (`window.MEDITRAIL_DATA`).
 * Future Java backend REST integration endpoints will map directly to these service methods.
 */

/**
 * Retrieves logged-in patient demographic and clinical overview.
 */
export function getPatientData() {
    const saved = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
    if (saved) {
        try {
            let pt = JSON.parse(saved);
            const ptId = pt.patient_code || pt.id || "MT-10482";

            // Check for persistent local profile updates
            const localProf = localStorage.getItem(`MEDITRAIL_PATIENT_PROFILE_${ptId}`);
            if (localProf) {
                try {
                    const parsedLocal = JSON.parse(localProf);
                    pt = { ...pt, ...parsedLocal };
                } catch (e) {}
            }

            const isDemoUser = ptId === 'MT-10482' || ptId === 'MT-50298' || (pt.name || '').toLowerCase().includes('aarnav') || (pt.name || '').toLowerCase().includes('harshal');
            const ptName = pt.name || (isDemoUser ? "Harshal Mehta" : "Patient");

            window.MEDITRAIL_DATA.patient = {
                id: ptId,
                name: ptName,
                age: pt.age || 19,
                dob: pt.dob || "2007-04-15",
                gender: pt.gender || "Male",
                bloodGroup: pt.blood_group || pt.bloodGroup || "B+",
                allergies: (pt.allergies && pt.allergies.length > 0) ? pt.allergies : (isDemoUser ? ["Penicillin", "Dust Mites"] : []),
                chronicConditions: (pt.chronic_conditions || pt.chronicConditions) ? (pt.chronic_conditions || pt.chronicConditions) : (isDemoUser ? ["Mild Asthma (controlled)"] : []),
                chronicConditionNotes: pt.chronicConditionNotes || "",
                conditionsDetailed: pt.conditionsDetailed || null,
                policies: pt.policies || null,
                emergencyContact: pt.emergency_contact || pt.emergencyContact || (isDemoUser ? {
                    name: "Sunita Mehta",
                    relation: "Mother",
                    phone: "+91 98765 43210"
                } : {
                    name: "Emergency Contact",
                    relation: "Primary",
                    phone: pt.phone || "+91 98765 43210"
                }),
                insurance: pt.insurance || {
                    provider: pt.insurance_provider || "Star Health Premier",
                    policyNumber: pt.policy_number || "SHP-8849201-B",
                    validUntil: "2027-03-31"
                },
                stats: {
                    totalRecords: (window.MEDITRAIL_DATA.timelineRecords || []).length,
                    activePrescriptions: (window.MEDITRAIL_DATA.activeMedications || []).length,
                    hospitalsVisited: Math.max(1, new Set((window.MEDITRAIL_DATA.timelineRecords || []).map(r => r.hospital)).size),
                    sharedDoctors: (window.MEDITRAIL_DATA.sharedAccess || []).length
                }
            };
        } catch (e) {
            console.warn('Error parsing patient session:', e);
        }
    }
    return window.MEDITRAIL_DATA.patient;
}

/**
 * Updates all DOM patient profile tags across the portal UI.
 */
export function updateUiPatientProfile() {
    const pt = getPatientData();
    if (!pt) return;

    const initials = pt.name ? pt.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'PT';

    // Dashboard Banner
    const dashName = document.getElementById('dash-patient-name');
    const dashAge = document.getElementById('dash-patient-age');
    const dashId = document.getElementById('dash-patient-id');
    const dashAvatar = document.getElementById('dash-patient-avatar');

    if (dashName) dashName.textContent = pt.name;
    if (dashAge) dashAge.textContent = `${pt.age} yrs`;
    if (dashId) dashId.textContent = pt.id;
    if (dashAvatar) dashAvatar.textContent = initials;

    // Sidebar User Snippet
    const sideAvatar = document.getElementById('sidebar-user-avatar');
    const sideName = document.getElementById('sidebar-user-name');
    const sideId = document.getElementById('sidebar-user-id');

    if (sideAvatar) sideAvatar.textContent = initials;
    if (sideName) sideName.textContent = pt.name;
    if (sideId) sideId.textContent = pt.id;

    // Fallback for any other classes
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
    document.querySelectorAll('.user-meta-name').forEach(el => el.textContent = pt.name);
    document.querySelectorAll('.user-meta-id').forEach(el => el.textContent = pt.id);

    // Profile & QR Modals
    const emgName = document.getElementById('emg-display-name');
    const profName = document.getElementById('prof-modal-name');
    const qrName = document.getElementById('qr-patient-name');

    if (emgName) emgName.textContent = pt.name;
    if (profName) profName.textContent = pt.name;
    if (qrName) qrName.textContent = pt.name;
}

/**
 * Retrieves all chronological medical records.
 */
export function getMedicalRecords() {
    return window.MEDITRAIL_DATA.timelineRecords || window.MEDITRAIL_DATA.medicalRecords || [];
}

/**
 * Retrieves a single record by unique ID.
 */
export function getRecordById(recordId) {
    const records = getMedicalRecords();
    return records.find(record => record.id === recordId) || null;
}

/**
 * Retrieves active medications.
 */
export function getActiveMedications() {
    return window.MEDITRAIL_DATA.activeMedications || [];
}

/**
 * Retrieves recent diagnostic reports.
 */
export function getRecentReports() {
    return window.MEDITRAIL_DATA.recentReports || [];
}

/**
 * Retrieves list of authorized doctors with access permissions.
 */
export function getSharedAccessList() {
    return window.MEDITRAIL_DATA.sharedAccess || [];
}

/**
 * Syncs derived medications, lab reports, and shared doctor lists from timeline records
 */
export function syncDerivedPatientLists() {
    const records = getMedicalRecords();
    
    const ptSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
    const pt = ptSession ? JSON.parse(ptSession) : null;
    const ptCode = pt ? (pt.patient_code || pt.id) : null;
    const isDemoUser = ptCode === 'MT-10482' || ptCode === 'MT-50298';

    // Preserve rich hardcoded data for demo accounts if they are using the default mock records
    if (records === window.MEDITRAIL_DATA.medicalRecords || records.length === 0) {
        return;
    }

    // 1. Build activeMedications
    let meds = [];
    records.forEach(rec => {
        if (rec.details && Array.isArray(rec.details.medications) && rec.details.medications.length > 0) {
            rec.details.medications.forEach((m, idx) => {
                meds.push({
                    id: `med-${rec.id}-${idx}`,
                    name: typeof m === 'string' ? m : (m.name || 'Prescription'),
                    dosage: typeof m === 'string' ? 'As directed' : (m.dose || 'Standard dose'),
                    frequency: typeof m === 'string' ? 'Daily' : (m.instructions || 'Daily'),
                    purpose: rec.shortDescription || rec.title,
                    prescribedBy: rec.doctor || 'Attending Physician',
                    startDate: rec.date || 'Recent'
                });
            });
        } else if (rec.category === 'Prescriptions' || rec.type === 'Prescription') {
            meds.push({
                id: `med-${rec.id}`,
                name: rec.title,
                dosage: 'As prescribed',
                frequency: 'Daily',
                purpose: rec.shortDescription || 'Treatment Plan',
                prescribedBy: rec.doctor || 'Attending Physician',
                startDate: rec.date || 'Recent'
            });
        }
    });
    
    if (isDemoUser && meds.length === 0) {
        if (window.MEDITRAIL_DATA.activeMedications && window.MEDITRAIL_DATA.activeMedications.length > 0) {
            meds = window.MEDITRAIL_DATA.activeMedications;
        }
    }
    
    window.MEDITRAIL_DATA.activeMedications = meds;

    // 2. Build recentReports
    const reports = [];
    records.forEach((rec, idx) => {
        if (rec.category === 'Diagnostics' || rec.type === 'Diagnostic' || (rec.title && rec.title.toLowerCase().includes('report'))) {
            reports.push({
                id: `rep-${rec.id || idx}`,
                title: rec.title,
                date: rec.date,
                facility: rec.hospital,
                status: rec.status || 'Normal',
                summary: rec.shortDescription,
                fileSize: 'PDF Record'
            });
        }
    });
    
    if (isDemoUser && reports.length === 0) {
        if (window.MEDITRAIL_DATA.recentReports && window.MEDITRAIL_DATA.recentReports.length > 0) {
            reports = window.MEDITRAIL_DATA.recentReports;
        }
    }
    
    window.MEDITRAIL_DATA.recentReports = reports;

    // 3. Build sharedAccess (Doctors who added records for this patient)
    const docsMap = new Map();
    records.forEach(rec => {
        if (rec.doctor && !docsMap.has(rec.doctor)) {
            docsMap.set(rec.doctor, {
                id: `doc-shared-${rec.doctor.replace(/[^a-zA-Z0-9]/g, '')}`,
                doctorName: rec.doctor,
                specialty: rec.department || 'Specialist',
                hospital: rec.hospital || 'Hospital',
                permissions: 'Full Medical History',
                accessGranted: rec.date,
                status: 'Active',
                accessExpiry: 'Permanent'
            });
        }
    });

    let access = Array.from(docsMap.values());
    if (isDemoUser && access.length === 0) {
        if (window.MEDITRAIL_DATA.sharedAccess && window.MEDITRAIL_DATA.sharedAccess.length > 0) {
            access = window.MEDITRAIL_DATA.sharedAccess;
        }
    }
    
    window.MEDITRAIL_DATA.sharedAccess = access;
}

/**
 * Safely formats standard ISO date strings (e.g., '2027-03-31' -> '31 Mar 2027')
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateString;
    }
}


