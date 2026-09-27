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

            const isAarnav = ptId === 'MT-10482' || (pt.name || '').toLowerCase().includes('aarnav');
            const ptName = pt.name || (isAarnav ? "Aarnav Mehta" : "Patient");

            window.MEDITRAIL_DATA.patient = {
                id: ptId,
                name: ptName,
                age: pt.age || 24,
                dob: pt.dob || "2002-04-15",
                gender: pt.gender || "Male",
                bloodGroup: pt.blood_group || pt.bloodGroup || "B+",
                allergies: (pt.allergies && pt.allergies.length > 0) ? pt.allergies : (isAarnav ? ["Penicillin", "Dust Mites"] : []),
                chronicConditions: (pt.chronic_conditions || pt.chronicConditions) ? (pt.chronic_conditions || pt.chronicConditions) : (isAarnav ? ["Mild Asthma (controlled)"] : []),
                chronicConditionNotes: pt.chronicConditionNotes || "",
                conditionsDetailed: pt.conditionsDetailed || null,
                policies: pt.policies || null,
                emergencyContact: pt.emergency_contact || pt.emergencyContact || (isAarnav ? {
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
    const sideAvatars = document.querySelectorAll('.user-avatar');
    const sideNames = document.querySelectorAll('.user-meta-name');
    const sideIds = document.querySelectorAll('.user-meta-id');

    sideAvatars.forEach(el => el.textContent = initials);
    sideNames.forEach(el => el.textContent = pt.name);
    sideIds.forEach(el => el.textContent = pt.id);

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
    const records = window.MEDITRAIL_DATA.timelineRecords || [];

    // 1. Build activeMedications
    const meds = [];
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
    window.MEDITRAIL_DATA.sharedAccess = Array.from(docsMap.values());
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


