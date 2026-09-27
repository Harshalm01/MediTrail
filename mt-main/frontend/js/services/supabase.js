/**
 * MediTrail - Supabase Integration Service Client
 * Project: zxcqicubcrqsxubnnmpp
 */

export const SUPABASE_CONFIG = {
    url: 'https://zxcqicubcrqsxubnnmpp.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Y3FpY3ViY3Jxc3h1Ym5ubXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODQ4MjYsImV4cCI6MjEwNjA2MDgyNn0.NrFhY5HUGmxCGFegyNNIvb_jSMJZ7_R7qDcl4mO4vok'
};

let supabaseClient = null;

/**
 * Initializes and returns the Supabase Client singleton.
 */
export function getSupabase() {
    if (!supabaseClient) {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('⚡ MediTrail Supabase Client Initialized [Project: zxcqicubcrqsxubnnmpp]');
        } else {
            console.warn('Supabase SDK not loaded on window. Will fall back to local mock data.');
        }
    }
    return supabaseClient;
}

/**
 * Patient OTP Authentication via Supabase Auth
 * @param {string} phone
 * @param {string} otp
 */
export async function authenticatePatientSupabase(phone, otp) {
    const sb = getSupabase();
    if (!sb) return { success: false, fallback: true };

    try {
        // Fetch patient by phone from Supabase public.patients
        const { data, error } = await sb
            .from('patients')
            .select('*')
            .eq('phone', phone.replace(/[^0-9]/g, ''))
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Supabase patient query:', error.message);
        }

        if (data) {
            return { success: true, patient: data };
        }
    } catch (e) {
        console.warn('Supabase auth catch:', e);
    }

    return { success: false, fallback: true };
}

/**
 * Staff / Doctor Authentication via Supabase
 * @param {string} email
 * @param {string} password
 */
export async function authenticateStaffSupabase(email, password) {
    const sb = getSupabase();
    if (!sb) return { success: false, fallback: true };

    try {
        // Query public.staff_profiles
        const { data, error } = await sb
            .from('staff_profiles')
            .select('*')
            .eq('email', email.trim())
            .single();

        if (error) {
            console.warn('Supabase staff query error:', error.message);
            return { success: false, fallback: true };
        }

        if (data) {
            return { success: true, staff: data };
        }
    } catch (e) {
        console.warn('Supabase staff auth error:', e);
    }

    return { success: false, fallback: true };
}

/**
 * Fetch patient medical records from Supabase
 * @param {string} patientCode
 */
export async function fetchMedicalRecordsSupabase(patientCode = 'MT-10482') {
    const sb = getSupabase();
    if (!sb) return null;

    try {
        const { data, error } = await sb
            .from('medical_records')
            .select('*')
            .eq('patient_code', patientCode)
            .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
            return data.map(r => ({
                id: r.id,
                year: r.year,
                date: r.event_date,
                type: r.type,
                category: r.category,
                title: r.title,
                hospital: r.hospital_name,
                doctor: r.doctor_name,
                department: r.department,
                shortDescription: r.short_description,
                status: r.status,
                badgeColor: "teal",
                details: {
                    diagnosis: r.diagnosis,
                    procedure: r.procedure_notes,
                    clinicalNotes: r.clinical_notes,
                    treatmentPlan: r.treatment_plan,
                    medications: r.medications || [],
                    attachments: r.attachments || []
                }
            }));
        }
    } catch (e) {
        console.warn('Supabase fetch records error:', e);
    }
    return null;
}

/**
 * Insert new clinical record to Supabase
 * @param {object} record
 */
export async function insertClinicalRecordSupabase(record) {
    const sb = getSupabase();
    if (!sb) return false;

    try {
        const { data, error } = await sb
            .from('medical_records')
            .insert([{
                patient_code: record.patientCode || 'MT-10482',
                year: record.year || new Date().getFullYear(),
                event_date: record.date,
                type: record.type,
                category: record.category,
                title: record.title,
                hospital_name: record.hospital,
                doctor_name: record.doctor,
                department: record.department || 'General Medicine',
                short_description: record.shortDescription,
                diagnosis: record.details.diagnosis,
                procedure_notes: record.details.procedure,
                clinical_notes: record.details.clinicalNotes,
                treatment_plan: record.details.treatmentPlan,
                medications: record.details.medications || [],
                attachments: record.details.attachments || [],
                status: record.status || 'Completed'
            }]);

        if (error) {
            console.warn('Supabase insert record error:', error.message);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Supabase insert record catch:', e);
        return false;
    }
}

/**
 * Log audit event to Supabase
 * @param {object} auditData
 */
export async function logAuditEventSupabase(auditData) {
    const sb = getSupabase();
    if (!sb) return false;

    try {
        await sb.from('audit_logs').insert([{
            doctor_name: auditData.doctorName,
            patient_code: auditData.patientId || 'MT-10482',
            hospital_name: auditData.hospitalName,
            action: auditData.action,
            ip_address: auditData.ipAddress || '192.168.1.1'
        }]);
        return true;
    } catch (e) {
        console.warn('Supabase log audit error:', e);
        return false;
    }
}

/**
 * Search patient in Supabase by phone or patient code
 * @param {string} query
 */
export async function searchPatientSupabase(query) {
    const sb = getSupabase();
    if (!sb || !query) return null;

    const queryDigits = query.replace(/[^0-9]/g, '');
    const queryClean = query.trim().toUpperCase();

    try {
        let q = sb.from('patients').select('*');
        if (queryDigits.length >= 7) {
            q = q.or(`phone.eq.${queryDigits},patient_code.eq.${queryClean}`);
        } else {
            q = q.eq('patient_code', queryClean);
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
            return data[0];
        }
    } catch (e) {
        console.warn('Supabase search patient error:', e);
    }
    return null;
}

/**
 * Insert or register new patient profile into Supabase
 * @param {object} patientData
 */
export async function createPatientSupabase(patientData) {
    const sb = getSupabase();
    if (!sb) return null;

    try {
        const { data, error } = await sb
            .from('patients')
            .insert([{
                patient_code: patientData.patient_code || patientData.id,
                name: patientData.name || 'New Patient',
                phone: patientData.phone ? patientData.phone.replace(/[^0-9]/g, '') : '',
                dob: patientData.dob || '2000-01-01',
                gender: patientData.gender || 'Male',
                blood_group: patientData.blood_group || patientData.bloodGroup || 'B+',
                allergies: patientData.allergies || [],
                chronic_conditions: patientData.chronic_conditions || patientData.chronicConditions || []
            }])
            .select()
            .single();

        if (!error && data) {
            return data;
        }
    } catch (e) {
        console.warn('Supabase create patient error:', e);
    }
    return null;
}

// Auto init on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        getSupabase();
    });
}

