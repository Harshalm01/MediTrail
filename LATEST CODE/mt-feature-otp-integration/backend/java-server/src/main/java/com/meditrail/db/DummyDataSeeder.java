package com.meditrail.db;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * ============================================================================
 * MEDITRAIL DEMO DUMMY DATA SEEDER
 * ============================================================================
 * NOTICE:
 * This class is dedicated exclusively to populating fictional dummy/demo clinical 
 * datasets for prototype evaluation, investor demos, and test suites.
 *
 * It provisions:
 * 1. Demo Patients: Dev Mandora (MT-26926), Harshal Mehta (MT-50298)
 * 2. Demo Hospitals: St. Jude, CityCare, Metro Community, Apollo, etc.
 * 3. Demo Staff / Attending Doctors: Administrators, Surgeons, Pulmonologists
 * 4. Rich Clinical Timeline: 15 comprehensive historical medical records
 * 5. Doctor Access Authorizations: Active and expiring access delegations
 *
 * IN PRODUCTION:
 * When connecting to live Hospital Information Systems (HIS) or HL7/FHIR EHRs,
 * this seeder can be completely omitted, replaced, or disabled via configuration.
 * ============================================================================
 */
public final class DummyDataSeeder {

    private DummyDataSeeder() {
        // Prevent instantiation of static utility seeder
    }

    /**
     * Seeds all mock demo clinical entities into the database.
     * Safe to run repeatedly; inserts are performed with idempotency checks.
     *
     * @param conn Active JDBC connection
     * @throws SQLException on database execution error
     */
    public static void seedDemoData(Connection conn) throws SQLException {
        // Do not auto-seed dummy hospitals; only user-onboarded hospitals are stored
        seedDemoStaff(conn);
        seedDemoPatients(conn);
        seedDemoMedicalRecords(conn);
        seedDemoSharedAccess(conn);
    }

    /**
     * Restores demo patient profile baseline when logging out of demo accounts.
     *
     * @param conn Active JDBC connection
     * @param patientCode Target patient code to restore (e.g. MT-26926)
     * @throws SQLException on database execution error
     */
    public static void resetPatientBaseline(Connection conn, String patientCode) throws SQLException {
        if (patientCode == null) return;

        if ("MT-26926".equalsIgnoreCase(patientCode)) {
            // Restore Dev Mandora baseline
            upsertPatient(conn, "pt-26926", "MT-26926", "Dev Mandora", 21, "2005-01-16", "Male", "O+", "9820480534", "dev.mandora@somaiya.edu",
                    "Penicillin, Dust Mites", "Mild Asthma (controlled)",
                    "Sunita Mehta", "Mother", "+91 98765 43210",
                    "Star Health Premier", "SHP-8849201-B");
        } else if ("MT-50298".equalsIgnoreCase(patientCode)) {
            // Restore Harshal Mehta baseline
            upsertPatient(conn, "pt-50298", "MT-50298", "Harshal Mehta", 19, "2007-04-15", "Male", "B+", "9324476116", "harshal.mehta@somaiya.edu",
                    "Dust Mites", "None",
                    "Ramesh Mehta", "Father", "+91 93244 76110",
                    "Care Health Protect", "CHP-1102938-A");
        }
    }

    // ------------------------------------------------------------------------
    // Demo Hospitals Seeding (Disabled: hospitals must only be added by user)
    // ------------------------------------------------------------------------
    private static void seedDemoHospitals(Connection conn) throws SQLException {
        // No dummy hospitals auto-seeded
    }

    // ------------------------------------------------------------------------
    // Demo RBAC Staff & Attending Doctors Seeding
    // ------------------------------------------------------------------------
    private static void seedDemoStaff(Connection conn) throws SQLException {
        // Manager Development Account
        seedStaff(conn, "usr-super-admin-dev", "Manager", "superadmin@gmail.com",
                "super_admin", "hosp-1", "MediTrail Platform", "Platform Administration", "SA-00100-IN", "admin123");
    }

    // ------------------------------------------------------------------------
    // Demo Patients Seeding
    // ------------------------------------------------------------------------
    private static void seedDemoPatients(Connection conn) throws SQLException {
        // 1. Dev Mandora (9820480534) - Primary Demo Patient
        seedPatient(conn, "pt-26926", "MT-26926", "Dev Mandora", 21, "2005-01-16", "Male", "O+", "9820480534", "dev.mandora@somaiya.edu",
                "Penicillin, Dust Mites", "Mild Asthma (controlled)",
                "Sunita Mehta", "Mother", "+91 98765 43210",
                "Star Health Premier", "SHP-8849201-B");

        // 2. Harshal Mehta (9324476116) - Secondary Demo Patient
        seedPatient(conn, "pt-50298", "MT-50298", "Harshal Mehta", 19, "2007-04-15", "Male", "B+", "9324476116", "harshal.mehta@somaiya.edu",
                "Dust Mites", "None",
                "Ramesh Mehta", "Father", "+91 93244 76110",
                "Care Health Protect", "CHP-1102938-A");
    }

    // ------------------------------------------------------------------------
    // Demo Clinical Records Seeding (Dev Mandora - MT-26926)
    // ------------------------------------------------------------------------
    private static void seedDemoMedicalRecords(Connection conn) throws SQLException {
        seedRecord(conn, "rec-2026-01", "pt-26926", "MT-26926", 2026, "18 Aug 2026", "Checkup", "Treatments",
                "Annual Preventative Health Assessment", "CityCare Hospital", "Dr. Ananya Sharma", "Internal Medicine",
                "Annual physical checkup, vitals evaluation, and preventative wellness counseling.",
                "Healthy young adult with mild seasonal allergic sensitivity.",
                "Physical examination, resting ECG, blood pressure check (118/76 mmHg), BMI calculation (22.4).",
                "Patient reports optimal recovery from previous year",
                "No immediate interventions required. Schedule next routine screening in August 2027.",
                "[{\"name\": \"Vitamin D3\", \"dose\": \"60,000 IU\", \"instructions\": \"1 capsule weekly after breakfast for 8 weeks\"}]",
                "[{\"name\": \"Annual_Checkup_Summary_2026.pdf\", \"size\": \"1.2 MB\"}, {\"name\": \"Resting_ECG_Report.pdf\", \"size\": \"950 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-2026-02", "pt-26926", "MT-26926", 2026, "02 Jul 2026", "Diagnostic", "Reports",
                "Routine Diagnostic Blood Panel (CBC & Lipid)", "HealthLab Diagnostics", "Dr. Sandeep Varma (Pathologist)", "Clinical Pathology",
                "Comprehensive blood work to assess lipid profile, liver function, and complete blood count.",
                "Normocytic, normochromic blood picture. All lipid indicators within ideal bounds.",
                "Venipuncture - Fasting blood sample collection.",
                "Hemoglobin 14.8 g/dL, Total Cholesterol 164 mg/dL, Fasting Blood Glucose 88 mg/dL. No anomalies detected.",
                "Continue balanced dietary habits and aerobic exercise.",
                "[]",
                "[{\"name\": \"Pathology_Lab_Results_02Jul2026.pdf\", \"size\": \"1.8 MB\"}, {\"name\": \"Biochemical_Chart.pdf\", \"size\": \"620 KB\"}]",
                "Normal");

        seedRecord(conn, "rec-2025-01", "pt-26926", "MT-26926", 2025, "14 Dec 2025", "Surgery", "Surgeries",
                "Laparoscopic Appendectomy", "CityCare Hospital", "Dr. Ananya Sharma (Lead Surgeon)", "General & Laparoscopic Surgery",
                "Minimally invasive surgical excision of inflamed appendix following acute presentation.",
                "Acute suppurative appendicitis without perforation.",
                "Three-port Laparoscopic Appendectomy under General Anesthesia. Appendix mobilized, mesoappendix coagulated, base ligated with Endoloop.",
                "Uncomplicated procedure. Operative time: 42 minutes. Minimal blood loss (<15 mL). Patient tolerated anesthesia well. Post-operative vital signs stable. Liquid diet commenced Day 1 post-op, discharged on Day 3 with wound care guidelines.",
                "Complete 5-day oral antibiotic course. Avoid lifting heavy objects for 4 weeks. Sutures are absorbable.",
                "[{\"name\": \"Cefixime\", \"dose\": \"200 mg\", \"instructions\": \"Twice daily after meals for 5 days\"}, {\"name\": \"Paracetamol\", \"dose\": \"650 mg\", \"instructions\": \"Every 6-8 hours if required for pain\"}, {\"name\": \"Pantoprazole\", \"dose\": \"40 mg\", \"instructions\": \"Once daily before breakfast for 5 days\"}]",
                "[{\"name\": \"Operative_Surgery_Notes.pdf\", \"size\": \"3.1 MB\"}, {\"name\": \"Hospital_Discharge_Summary.pdf\", \"size\": \"2.4 MB\"}, {\"name\": \"Post_Op_Prescription.pdf\", \"size\": \"480 KB\"}, {\"name\": \"Histopathology_Biopsy_Report.pdf\", \"size\": \"890 KB\"}]",
                "Resolved");

        seedRecord(conn, "rec-2025-02", "pt-26926", "MT-26926", 2025, "20 Nov 2025", "Diagnosis", "Diseases",
                "Acute Appendicitis Presentation & Emergency Evaluation", "CityCare Hospital", "Dr. Keith Pinto (ER In-charge)", "Emergency Medicine",
                "Emergency admission with localized right lower quadrant pain, low-grade fever, and rebound tenderness.",
                "Suspected acute appendicitis; positive McBurney",
                "Emergency abdominal ultrasound and contrast-enhanced CT scan.",
                "Patient presented at 11:30 PM complaining of periumbilical pain migrating to right iliac fossa over 18 hours. CT confirmed 8.2 mm distended non-compressible appendix. Surgical consultation called immediately.",
                "Immediate admission to surgical ward, IV fluids, IV antibiotic prophylaxis, preparation for next-day laparoscopic resection.",
                "[{\"name\": \"IV Cefuroxime\", \"dose\": \"1.5 g\", \"instructions\": \"Pre-operative IV stat\"}, {\"name\": \"IV Normal Saline\", \"dose\": \"500 mL\", \"instructions\": \"Continuous hydration infusion\"}]",
                "[{\"name\": \"Emergency_Admission_Record.pdf\", \"size\": \"1.1 MB\"}, {\"name\": \"Abdominal_CT_Scan_Report.pdf\", \"size\": \"5.2 MB\"}]",
                "Escalated to Surgery");

        seedRecord(conn, "rec-2025-03", "pt-26926", "MT-26926", 2025, "12 May 2025", "Vaccination", "Vaccinations",
                "Influenza Quadrivalent Annual Vaccine", "Metro Community Health", "Dr. Reena Desai", "Preventative Immunization",
                "Annual seasonal influenza immunization shot administered via intramuscular injection.",
                "Routine seasonal immunization.",
                "0.5 mL Intramuscular injection in left deltoid muscle.",
                "Observed for 15 minutes post-administration. No signs of immediate hypersensitivity or adverse reaction.",
                "Annual booster recommended before onset of monsoon season.",
                "[]",
                "[{\"name\": \"Vaccine_Certificate_Flu2025.pdf\", \"size\": \"510 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-2024-01", "pt-26926", "MT-26926", 2024, "14 Nov 2024", "Donation", "Donations",
                "Voluntary Whole Blood Donation", "Rotary Blood Bank & Red Cross", "Dr. Vikram Sen", "Transfusion Medicine",
                "Successful 450 mL voluntary whole blood donation. Pre-donation vitals and hemoglobin verified.",
                "Healthy donor evaluation.",
                "450 mL whole blood collection via sterile single-use blood bag with citrate anticoagulant.",
                "Pre-donation Hb: 15.2 g/dL, Pulse: 72 bpm, BP: 120/80 mmHg. Donor tolerated procedure well with no dizziness or syncope.",
                "Oral hydration, rest for 20 minutes with high-protein snack. Next donation eligible in 90 days.",
                "[]",
                "[{\"name\": \"Donor_Appreciation_Certificate.pdf\", \"size\": \"820 KB\"}, {\"name\": \"Donor_Health_Screen_Pass.pdf\", \"size\": \"340 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-2024-02", "pt-26926", "MT-26926", 2024, "15 Sep 2024", "Vaccination", "Vaccinations",
                "Tetanus Toxoid Booster Prophylaxis", "Metro Community Health", "Dr. Reena Desai", "Immunization",
                "Tetanus booster administered after superficial abrasion sustained during outdoor cycling.",
                "Superficial dermal abrasion, right forearm. Minor dirt contamination.",
                "Wound debridement, sterile saline irrigation, 0.5 mL TT injection (IM).",
                "No deep tissue involvement or foreign bodies. Clean epithelial margins.",
                "Keep dressing clean and dry. Apply topical mupirocin twice daily.",
                "[{\"name\": \"Mupirocin 2% Ointment\", \"dose\": \"Topical\", \"instructions\": \"Apply twice daily for 5 days\"}]",
                "[{\"name\": \"Immunization_Booster_Record.pdf\", \"size\": \"430 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-2024-03", "pt-26926", "MT-26926", 2024, "10 Mar 2024", "Treatment", "Treatments",
                "Asthma Consultation & Pulmonary Function Review", "Apollo Specialty Clinic", "Dr. Rajesh Kulkarni", "Pulmonology & Respiratory Medicine",
                "Spirometry evaluation and maintenance inhaler prescription for mild cold-weather bronchial hyperreactivity.",
                "Mild intermittent asthma with cold-air sensitivity.",
                "Spirometry (FEV1: 89% predicted, FEV1/FVC: 82%).",
                "No nocturnal wheezing reported. Good baseline lung capacity. Prescribed prophylactic low-dose budesonide for flare-ups.",
                "Carry inhaler during strenuous outdoor running. Avoid abrupt dust exposure.",
                "[{\"name\": \"Budesonide Inhaler\", \"dose\": \"200 mcg\", \"instructions\": \"1 puff as needed before heavy exercise\"}]",
                "[{\"name\": \"Spirometry_Report_2024.pdf\", \"size\": \"1.6 MB\"}, {\"name\": \"Pulmonary_Care_Guideline.pdf\", \"size\": \"680 KB\"}]",
                "Controlled");

        seedRecord(conn, "rec-2023-01", "pt-26926", "MT-26926", 2023, "22 Oct 2023", "Treatment", "Treatments",
                "Left Ankle Inversion Sprain & Physical Rehabilitation", "St. Jude Orthopedic Care", "Dr. Meera Nambiar", "Orthopedics & Sports Medicine",
                "Grade 1 lateral ligament sprain after athletic misstep. Rest, ice, compression, and rehab exercises prescribed.",
                "Grade 1 strain of anterior talofibular ligament (ATFL). No fracture detected on X-Ray.",
                "Digital bilateral ankle radiographs, crepe bandage immobilization.",
                "Mild swelling over lateral malleolus. Weight-bearing tolerated with slight limp. Neurological exam intact.",
                "RICE protocol for 72 hours, followed by eccentric calf and proprioception exercises.",
                "[{\"name\": \"Aceclofenac + Paracetamol\", \"dose\": \"100mg/325mg\", \"instructions\": \"Twice daily after meals for 3 days\"}]",
                "[{\"name\": \"Left_Ankle_XRay_Digital.pdf\", \"size\": \"3.7 MB\"}, {\"name\": \"Physiotherapy_Protocol_Chart.pdf\", \"size\": \"910 KB\"}]",
                "Resolved");

        seedRecord(conn, "rec-2023-02", "pt-26926", "MT-26926", 2023, "04 Feb 2023", "Donation", "Donations",
                "Campus Blood Drive Contribution", "National Blood Transfusion Council", "Dr. P. K. Saxena", "Transfusion Services",
                "Voluntary donor contribution at university health center camp.",
                "Eligible voluntary donor.",
                "Whole blood phlebotomy (350 mL).",
                "Uneventful collection. Blood grouped as B Rh Positive.",
                "Donor certificate issued.",
                "[]",
                "[{\"name\": \"Blood_Donation_Card_2023.pdf\", \"size\": \"420 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-2022-01", "pt-26926", "MT-26926", 2022, "14 Nov 2022", "Vaccination", "Vaccinations",
                "Hepatitis B Recombinant Booster Dose", "CityCare Immunization Center", "Dr. Kavita Verma", "Preventative Medicine",
                "Ten-year recombinant booster administered to ensure continued active viral hepatitis prophylaxis.",
                "Routine occupational & adult immunization update.",
                "Intramuscular injection (1.0 mL Engerix-B) into left deltoid.",
                "Patient tolerated injection well without local induration or systemic fever. No known past vaccine hypersensitivity.",
                "Post-vaccination observational interval (15 mins) uneventful. Full protection documented.",
                "[]",
                "[{\"name\": \"Hepatitis_B_Vaccination_Certificate.pdf\", \"size\": \"620 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-2022-02", "pt-26926", "MT-26926", 2022, "18 Jun 2022", "Treatment", "Treatments",
                "Ultrasonic Dental Scaling & Oral Prophylaxis", "SmileCraft Dental Specialists", "Dr. Siddharth Roy", "Dentistry",
                "Complete subgingival ultrasonic plaque and calculus debridement with topical fluoridation.",
                "Mild localized marginal gingivitis with calculus deposits.",
                "Full-mouth ultrasonic scaling, rotary polishing with fine pumice paste, 2.0% sodium fluoride gel application.",
                "Gingival tissues showed minor bleeding on probing at lower anteriors. No active caries detected on panoramic examination.",
                "Twice-daily soft-bristle brushing with fluoridated toothpaste, daily flossing routine. Schedule 6-month check.",
                "[{\"name\": \"Chlorhexidine Gluconate 0.2%\", \"dose\": \"10 mL\", \"instructions\": \"Rinse mouth twice daily for 7 days\"}]",
                "[{\"name\": \"Dental_Chart_Panoramic_Report.pdf\", \"size\": \"2.1 MB\"}]",
                "Completed");

        seedRecord(conn, "rec-2021-01", "pt-26926", "MT-26926", 2021, "28 Sep 2021", "Vaccination", "Vaccinations",
                "Seasonal Quadrivalent Influenza Immunization", "Metro Community Health Clinic", "Dr. P. K. Saxena", "Public Health",
                "Annual seasonal influenza immunization administered prior to winter respiratory transmission window.",
                "Elective preventative adult immunization.",
                "Intramuscular deltoid administration of quadrivalent inactivated split-virion vaccine.",
                "No immediate localized hypersensitivity. Mild tenderness at injection site expected for 24 hours.",
                "Symptomatic cold compress if soreness develops. Annual reminder logged.",
                "[]",
                "[{\"name\": \"Flu_Vaccine_Verification_Record.pdf\", \"size\": \"480 KB\"}]",
                "Completed");

        seedRecord(conn, "rec-1", "pt-26926", "MT-26926", 2024, "14 Oct 2024", "Surgery", "Orthopedics",
                "ACL Reconstruction & Meniscal Repair", "St. Jude Orthopedic Care", "Dr. Meera Nambiar", "Orthopedics & Sports Medicine",
                "Arthroscopic reconstruction of the anterior cruciate ligament with hamstring autograft.",
                "Complete tear of the anterior cruciate ligament (ACL) with medial meniscus posterior horn tear.",
                "Diagnostic arthroscopy confirmed complete ACL rupture. Quadrupled semitendinosus/gracilis graft passed through femoral and tibial tunnels.",
                "Patient tolerated procedure well. Neurovascular check intact post-operatively.",
                "Phase I rehabilitation: partial weight-bearing with crutches for 2 weeks. Cryotherapy 4x daily.",
                "[{\"name\": \"Budesonide Inhaler\", \"dose\": \"200 mcg\", \"instructions\": \"1 puff as needed for asthma relief\"}, {\"name\": \"Montelukast Sodium\", \"dose\": \"10 mg\", \"instructions\": \"Once daily (Night)\"}, {\"name\": \"Levocetirizine\", \"dose\": \"5 mg\", \"instructions\": \"As needed for dust allergy\"}]",
                "[]",
                "Completed");

        seedRecord(conn, "rec-2", "pt-26926", "MT-26926", 2024, "15 Sep 2024", "Diagnostics", "Diagnostics",
                "Pre-Operative MRI Right Knee", "City Health Center", "Dr. Vikram Malhotra", "Diagnostic Imaging",
                "High-resolution 3.0T MRI right knee joint with multiplanar sequences.",
                "High-grade full thickness tear of the ACL fibers with bone contusion of lateral femoral condyle.",
                "Scans performed using dedicated knee coil on Siemens 3T Vida system.",
                "No joint effusion with significant hemarthrosis.",
                "Surgical reconstruction recommended based on ligament disruption.",
                "[]",
                "[]",
                "Completed");

    }

    // ------------------------------------------------------------------------
    // Demo Shared Doctor Access Seeding (Dev Mandora - MT-26926)
    // ------------------------------------------------------------------------
    private static void seedDemoSharedAccess(Connection conn) throws SQLException {
        seedSharedAccess(conn, "sh-1", "MT-26926", "Dr. Ananya Sharma", "CityCare Hospital", "General Surgeon", "Full Medical History", "Active", "12 Dec 2025", "Permanent (Primary Physician)");
        seedSharedAccess(conn, "sh-2", "MT-26926", "Dr. Rajesh Kulkarni", "Apollo Specialty Clinic", "Pulmonologist", "Respiratory & Lab Records Only", "Active", "10 Mar 2024", "Expires in 45 days");
        seedSharedAccess(conn, "sh-3", "MT-26926", "Dr. Meera Nambiar", "St. Jude Orthopedic Care", "Orthopedics & Sports Medicine", "Full Medical History", "Active", "14 Oct 2024", "Permanent");
        seedSharedAccess(conn, "sh-4", "MT-26926", "Dr. Sameer Deshmukh", "KJ Somaiya Hospital & Research Centre", "General Surgery & Laparoscopy", "Full Medical History", "Active", "12 Nov 2024", "Permanent");
        seedSharedAccess(conn, "sh-5", "MT-26926", "Dr. Sandeep Varma", "HealthLab Diagnostics", "Clinical Pathology", "Biochemistry & Hematology Reports", "Active", "02 Feb 2026", "Expires in 30 days");
    }

    // ------------------------------------------------------------------------
    // SQL Helper Utilities
    // ------------------------------------------------------------------------
    private static void seedHospital(Connection conn, String id, String name, String code, String city) throws SQLException {
        String sql = "SELECT COUNT(*) FROM hospitals WHERE code = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, code);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    String insert = "INSERT INTO hospitals (id, name, code, city) VALUES (?, ?, ?, ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insert)) {
                        ins.setString(1, id);
                        ins.setString(2, name);
                        ins.setString(3, code);
                        ins.setString(4, city);
                        ins.executeUpdate();
                    }
                }
            }
        }
    }

    private static void seedStaff(Connection conn, String id, String name, String email, String role, 
                                  String hospitalId, String hospitalName, String department, String licenseId, String password) throws SQLException {
        String sql = "SELECT id, password_hash FROM staff_profiles WHERE LOWER(email) = LOWER(?)";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    String insert = "INSERT INTO staff_profiles (id, name, email, role, hospital_id, hospital_name, department, license_id, status, password_hash) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insert)) {
                        ins.setString(1, id);
                        ins.setString(2, name);
                        ins.setString(3, email.toLowerCase());
                        ins.setString(4, role);
                        ins.setString(5, hospitalId);
                        ins.setString(6, hospitalName);
                        ins.setString(7, department);
                        ins.setString(8, licenseId);
                        String pwdHash = (password != null && (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")))
                                ? password : com.meditrail.services.AuthService.hashPassword(password);
                        ins.setString(9, pwdHash);
                        ins.executeUpdate();
                    }
                } else {
                    String existingHash = rs.getString("password_hash");
                    boolean match = false;
                    try {
                        if (existingHash != null && org.mindrot.jbcrypt.BCrypt.checkpw(password, existingHash)) {
                            match = true;
                        }
                    } catch (Exception e) {
                        match = false;
                    }
                    if (!match) {
                        String update = "UPDATE staff_profiles SET password_hash = ? WHERE LOWER(email) = LOWER(?)";
                        try (PreparedStatement up = conn.prepareStatement(update)) {
                            String pwdHash = (password != null && (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")))
                                    ? password : com.meditrail.services.AuthService.hashPassword(password);
                            up.setString(1, pwdHash);
                            up.setString(2, email);
                            up.executeUpdate();
                        }
                    }
                }
            }
        }
    }

    private static void seedPatient(Connection conn, String id, String code, String name, int age, String dob, 
                                    String gender, String bloodGroup, String phone, String email, String allergies, String conditions,
                                    String emgName, String emgRel, String emgPhone, String insProvider, String policyNum) throws SQLException {
        String sql = "SELECT COUNT(*) FROM patients WHERE patient_code = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, code);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    String insert = "INSERT INTO patients (id, patient_code, name, age, dob, gender, blood_group, phone, email, "
                            + "allergies, chronic_conditions, emergency_contact_name, emergency_contact_relationship, "
                            + "emergency_contact_phone, insurance_provider, policy_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insert)) {
                        ins.setString(1, id);
                        ins.setString(2, code);
                        ins.setString(3, name);
                        ins.setInt(4, age);
                        ins.setDate(5, java.sql.Date.valueOf(dob));
                        ins.setString(6, gender);
                        ins.setString(7, bloodGroup);
                        ins.setString(8, phone);
                        ins.setString(9, email);
                        ins.setString(10, allergies);
                        ins.setString(11, conditions);
                        ins.setString(12, emgName);
                        ins.setString(13, emgRel);
                        ins.setString(14, emgPhone);
                        ins.setString(15, insProvider);
                        ins.setString(16, policyNum);
                        ins.executeUpdate();
                    }
                }
            }
        }
    }

    private static void upsertPatient(Connection conn, String id, String code, String name, int age, String dob, 
                                      String gender, String bloodGroup, String phone, String email, String allergies, String conditions,
                                      String emgName, String emgRel, String emgPhone, String insProvider, String policyNum) throws SQLException {
        String sql = "SELECT COUNT(*) FROM patients WHERE patient_code = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, code);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) {
                    String update = "UPDATE patients SET name = ?, age = ?, dob = ?, gender = ?, blood_group = ?, "
                            + "phone = ?, email = ?, allergies = ?, chronic_conditions = ?, emergency_contact_name = ?, "
                            + "emergency_contact_relationship = ?, emergency_contact_phone = ?, "
                            + "insurance_provider = ?, policy_number = ? WHERE patient_code = ?";
                    try (PreparedStatement up = conn.prepareStatement(update)) {
                        up.setString(1, name);
                        up.setInt(2, age);
                        up.setDate(3, java.sql.Date.valueOf(dob));
                        up.setString(4, gender);
                        up.setString(5, bloodGroup);
                        up.setString(6, phone);
                        up.setString(7, email);
                        up.setString(8, allergies);
                        up.setString(9, conditions);
                        up.setString(10, emgName);
                        up.setString(11, emgRel);
                        up.setString(12, emgPhone);
                        up.setString(13, insProvider);
                        up.setString(14, policyNum);
                        up.setString(15, code);
                        up.executeUpdate();
                    }
                } else {
                    seedPatient(conn, id, code, name, age, dob, gender, bloodGroup, phone, email, allergies, conditions,
                            emgName, emgRel, emgPhone, insProvider, policyNum);
                }
            }
        }
    }

    private static void seedRecord(Connection conn, String id, String ptId, String ptCode, int year, String date,
                                    String type, String category, String title, String hosp, String doc, String dept,
                                    String shortDesc, String diag, String proc, String clinical, String plan,
                                    String medsJson, String attachJson, String status) throws SQLException {
        String sql = "SELECT COUNT(*) FROM medical_records WHERE id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    String insert = "INSERT INTO medical_records (id, patient_id, patient_code, record_year, event_date, type, category, "
                            + "title, hospital_name, doctor_name, department, short_description, diagnosis, procedure_notes, "
                            + "clinical_notes, treatment_plan, medications, attachments, status) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insert)) {
                        ins.setString(1, id);
                        ins.setString(2, ptId);
                        ins.setString(3, ptCode);
                        ins.setInt(4, year);
                        ins.setString(5, date);
                        ins.setString(6, type);
                        ins.setString(7, category);
                        ins.setString(8, title);
                        ins.setString(9, hosp);
                        ins.setString(10, doc);
                        ins.setString(11, dept);
                        ins.setString(12, shortDesc);
                        ins.setString(13, diag);
                        ins.setString(14, proc);
                        ins.setString(15, clinical);
                        ins.setString(16, plan);
                        ins.setString(17, medsJson);
                        ins.setString(18, attachJson);
                        ins.setString(19, status);
                        ins.executeUpdate();
                    }
                }
            }
        }
    }

    private static void seedSharedAccess(Connection conn, String id, String ptCode, String docName, String hosp, String dept,
                                         String perms, String status, String granted, String expiry) throws SQLException {
        String sql = "SELECT COUNT(*) FROM shared_access WHERE id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) == 0) {
                    String insert = "INSERT INTO shared_access (id, patient_code, doctor_name, hospital_name, department, "
                            + "permissions, status, access_granted, access_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                    try (PreparedStatement ins = conn.prepareStatement(insert)) {
                        ins.setString(1, id);
                        ins.setString(2, ptCode);
                        ins.setString(3, docName);
                        ins.setString(4, hosp);
                        ins.setString(5, dept);
                        ins.setString(6, perms);
                        ins.setString(7, status);
                        ins.setString(8, granted);
                        ins.setString(9, expiry);
                        ins.executeUpdate();
                    }
                }
            }
        }
    }
}
