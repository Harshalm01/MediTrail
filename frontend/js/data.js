/**
 * MediTrail - Dummy Data Store
 * 
 * Contains realistic fictional data for prototyping the patient portal.
 * Structured to facilitate simple migration to Java backend REST endpoints.
 */

const MEDITRAIL_DATA = {
    // Current logged-in patient profile
    patient: {
        id: "MT-10482",
        name: "Aarnav Mehta",
        age: 24,
        dob: "2002-04-15",
        gender: "Male",
        bloodGroup: "B+",
        allergies: ["Penicillin", "Dust Mites"],
        chronicConditions: ["Mild Asthma (controlled)"],
        emergencyContact: {
            name: "Sunita Mehta",
            relation: "Mother",
            phone: "+91 98765 43210"
        },
        insurance: {
            provider: "Star Health Premier",
            policyNumber: "SHP-8849201-B",
            validUntil: "2027-03-31"
        },
        stats: {
            totalRecords: 14,
            activePrescriptions: 3,
            hospitalsVisited: 5,
            sharedDoctors: 3
        }
    },

    // Active ongoing medications
    activeMedications: [
        {
            id: "med-1",
            name: "Budesonide Inhaler",
            dosage: "200 mcg",
            frequency: "1 puff as needed",
            purpose: "Mild Asthma relief",
            prescribedBy: "Dr. Rajesh Kulkarni",
            startDate: "2024-03-10"
        },
        {
            id: "med-2",
            name: "Vitamin D3 (Cholecalciferol)",
            dosage: "60,000 IU",
            frequency: "Once weekly (Sundays)",
            purpose: "Bone & Immune Support",
            prescribedBy: "Dr. Ananya Sharma",
            startDate: "2026-08-18"
        },
        {
            id: "med-3",
            name: "Montelukast Sodium",
            dosage: "10 mg",
            frequency: "Once daily (Night)",
            purpose: "Allergic rhinitis prevention",
            prescribedBy: "Dr. Rajesh Kulkarni",
            startDate: "2026-05-12"
        },
        {
            id: "med-4",
            name: "Levocetirizine Dihydrochloride",
            dosage: "5 mg",
            frequency: "As needed for dust allergy",
            purpose: "Antihistamine for seasonal flare-ups",
            prescribedBy: "Dr. Rajesh Kulkarni",
            startDate: "2026-06-04"
        },
        {
            id: "med-5",
            name: "Omega-3 Fish Oil Concentrate",
            dosage: "1000 mg",
            frequency: "Once daily with breakfast",
            purpose: "Cardiovascular & cellular wellness",
            prescribedBy: "Dr. Ananya Sharma",
            startDate: "2026-08-20"
        }
    ],

    // Recent lab & diagnostic reports
    recentReports: [
        {
            id: "rep-1",
            title: "Comprehensive Metabolic & CBC Panel",
            date: "02 Jul 2026",
            facility: "HealthLab Diagnostics",
            status: "Normal",
            summary: "All parameters within reference intervals. Serum Ferritin optimal.",
            fileSize: "1.4 MB PDF"
        },
        {
            id: "rep-2",
            title: "Abdominal Ultrasound & CT Post-Op Review",
            date: "10 Jan 2026",
            facility: "CityCare Hospital",
            status: "Resolved",
            summary: "Satisfactory post-appendectomy healing. No fluid collection.",
            fileSize: "4.8 MB PDF"
        },
        {
            id: "rep-3",
            title: "High-Resolution Chest Radiograph (CXR)",
            date: "12 Apr 2025",
            facility: "Apex Imaging Center",
            status: "Clear",
            summary: "Clear lung fields, normal cardiothoracic ratio, no infiltrates.",
            fileSize: "2.3 MB PDF"
        },
        {
            id: "rep-4",
            title: "Tetanus Antibody Titer Check",
            date: "15 Sep 2024",
            facility: "Metro Community Health",
            status: "Protected",
            summary: "Booster efficacy confirmed following prophylaxis injection.",
            fileSize: "840 KB PDF"
        },
        {
            id: "rep-5",
            title: "12-Lead Electrocardiogram (ECG) Tracing",
            date: "18 Aug 2026",
            facility: "CityCare Cardiology Wing",
            status: "Normal",
            summary: "Normal sinus rhythm at 68 bpm, no ST-T segment variations or arrhythmia.",
            fileSize: "920 KB PDF"
        },
        {
            id: "rep-6",
            title: "Pulmonary Spirometry & Lung Mechanics",
            date: "10 Mar 2024",
            facility: "Apollo Specialty Clinic",
            status: "Controlled",
            summary: "FEV1 89% predicted, normal diffusion capacity, reversible bronchospasm.",
            fileSize: "1.6 MB PDF"
        },
        {
            id: "rep-7",
            title: "Bilateral Ankle Radiography Examination",
            date: "22 Oct 2023",
            facility: "St. Jude Orthopedic Care",
            status: "Clear",
            summary: "Soft tissue edema without bony cortical breach or osteochondral lesion.",
            fileSize: "3.7 MB PDF"
        }
    ],

    // Doctors currently granted access
    sharedAccess: [
        {
            id: "doc-1",
            doctorName: "Dr. Ananya Sharma",
            specialty: "General Surgeon",
            hospital: "CityCare Hospital",
            accessGranted: "12 Dec 2025",
            accessExpiry: "Permanent (Primary Physician)",
            permissions: "Full History (Excl. Psych)",
            status: "Active"
        },
        {
            id: "doc-2",
            doctorName: "Dr. Rajesh Kulkarni",
            specialty: "Pulmonologist",
            hospital: "Apollo Specialty Clinic",
            accessGranted: "10 Mar 2024",
            accessExpiry: "Expires in 45 days",
            permissions: "Respiratory & Lab Records Only",
            status: "Active"
        },
        {
            id: "doc-3",
            doctorName: "Dr. Vikram Sen",
            specialty: "Consultant Cardiologist",
            hospital: "Fortis Heart Institute",
            accessGranted: "05 Jun 2026",
            accessExpiry: "Expires in 90 days",
            permissions: "ECG, Vitals & Blood Chemistry",
            status: "Active"
        },
        {
            id: "doc-4",
            doctorName: "Dr. Meera Iyer",
            specialty: "Endocrinologist",
            hospital: "Max Healthcare Institute",
            accessGranted: "18 Jan 2026",
            accessExpiry: "Expires in 60 days",
            permissions: "Endocrine & Metabolic Labs",
            status: "Active"
        },
        {
            id: "doc-5",
            doctorName: "Dr. Sandeep Varma",
            specialty: "Consultant Pathologist",
            hospital: "HealthLab Diagnostics",
            accessGranted: "02 Feb 2026",
            accessExpiry: "Expires in 30 days",
            permissions: "Biochemistry & Hematology Reports",
            status: "Active"
        },
        {
            id: "doc-6",
            doctorName: "Dr. Priya Nambiar",
            specialty: "Dermatologist & Allergist",
            hospital: "SkinHealth Super-Specialty",
            accessGranted: "14 Nov 2025",
            accessExpiry: "Permanent (Allergy Care)",
            permissions: "Allergy Panels & Prescription Logs",
            status: "Active"
        },
        {
            id: "doc-7",
            doctorName: "Dr. Rohan Deshmukh",
            specialty: "Orthopedic Surgeon",
            hospital: "St. Jude Orthopedic Center",
            accessGranted: "28 Oct 2025",
            accessExpiry: "Expires in 15 days",
            permissions: "Radiology, X-Ray & MRI Scans",
            status: "Active"
        },
        {
            id: "doc-8",
            doctorName: "Dr. Kavita Bansal",
            specialty: "Ophthalmologist",
            hospital: "Netra Eye Foundation",
            accessGranted: "19 Dec 2025",
            accessExpiry: "Expires in 120 days",
            permissions: "Ophthalmic & Retinal Imaging",
            status: "Active"
        },
        {
            id: "doc-9",
            doctorName: "Dr. Arvind Swaminathan",
            specialty: "Neurologist",
            hospital: "Manipal Brain & Spine Center",
            accessGranted: "08 Jan 2026",
            accessExpiry: "Expires in 75 days",
            permissions: "Neuro Vitals & Brain Scans",
            status: "Active"
        },
        {
            id: "doc-10",
            doctorName: "Dr. Sunita Patel",
            specialty: "Gastroenterologist",
            hospital: "Lilavati Digestive Health",
            accessGranted: "22 Feb 2026",
            accessExpiry: "Expires in 90 days",
            permissions: "Endoscopy & Liver Function Panels",
            status: "Active"
        }
    ],

    // Chronological medical events (newest first)
    medicalRecords: [
        {
            id: "rec-2026-01",
            year: 2026,
            date: "18 Aug 2026",
            type: "Checkup",
            category: "Treatments",
            title: "Annual Preventative Health Assessment",
            hospital: "CityCare Hospital",
            doctor: "Dr. Ananya Sharma",
            department: "Internal Medicine",
            shortDescription: "Annual physical checkup, vitals evaluation, and preventative wellness counseling.",
            status: "Completed",
            badgeColor: "teal",
            details: {
                diagnosis: "Healthy young adult with mild seasonal allergic sensitivity.",
                procedure: "Physical examination, resting ECG, blood pressure check (118/76 mmHg), BMI calculation (22.4).",
                clinicalNotes: "Patient reports optimal recovery from previous year's appendectomy. Stamina and physical exercise routine resumed without post-surgical discomfort. Advised to maintain hydration and continue weekly vitamin D supplements.",
                treatmentPlan: "No immediate interventions required. Schedule next routine screening in August 2027.",
                medications: [
                    { name: "Vitamin D3", dose: "60,000 IU", instructions: "1 capsule weekly after breakfast for 8 weeks" }
                ],
                attachments: [
                    { name: "Annual_Checkup_Summary_2026.pdf", size: "1.2 MB" },
                    { name: "Resting_ECG_Report.pdf", size: "950 KB" }
                ]
            }
        },
        {
            id: "rec-2026-02",
            year: 2026,
            date: "02 Jul 2026",
            type: "Diagnostic",
            category: "Reports",
            title: "Routine Diagnostic Blood Panel (CBC & Lipid)",
            hospital: "HealthLab Diagnostics",
            doctor: "Dr. Sandeep Varma (Pathologist)",
            department: "Clinical Pathology",
            shortDescription: "Comprehensive blood work to assess lipid profile, liver function, and complete blood count.",
            status: "Normal",
            badgeColor: "blue",
            details: {
                diagnosis: "Normocytic, normochromic blood picture. All lipid indicators within ideal bounds.",
                procedure: "Venipuncture - Fasting blood sample collection.",
                clinicalNotes: "Hemoglobin 14.8 g/dL, Total Cholesterol 164 mg/dL, Fasting Blood Glucose 88 mg/dL. No anomalies detected.",
                treatmentPlan: "Continue balanced dietary habits and aerobic exercise.",
                medications: [],
                attachments: [
                    { name: "Pathology_Lab_Results_02Jul2026.pdf", size: "1.8 MB" },
                    { name: "Biochemical_Chart.pdf", size: "620 KB" }
                ]
            }
        },
        {
            id: "rec-2025-01",
            year: 2025,
            date: "14 Dec 2025",
            type: "Surgery",
            category: "Surgeries",
            title: "Laparoscopic Appendectomy",
            hospital: "CityCare Hospital",
            doctor: "Dr. Ananya Sharma (Lead Surgeon)",
            department: "General & Laparoscopic Surgery",
            shortDescription: "Minimally invasive surgical excision of inflamed appendix following acute presentation.",
            status: "Resolved",
            badgeColor: "rose",
            details: {
                diagnosis: "Acute suppurative appendicitis without perforation.",
                procedure: "Three-port Laparoscopic Appendectomy under General Anesthesia. Appendix mobilized, mesoappendix coagulated, base ligated with Endoloop.",
                clinicalNotes: "Uncomplicated procedure. Operative time: 42 minutes. Minimal blood loss (<15 mL). Patient tolerated anesthesia well. Post-operative vital signs stable. Liquid diet commenced Day 1 post-op, discharged on Day 3 with wound care guidelines.",
                treatmentPlan: "Complete 5-day oral antibiotic course. Avoid lifting heavy objects for 4 weeks. Sutures are absorbable.",
                medications: [
                    { name: "Cefixime", dose: "200 mg", instructions: "Twice daily after meals for 5 days" },
                    { name: "Paracetamol", dose: "650 mg", instructions: "Every 6-8 hours if required for pain" },
                    { name: "Pantoprazole", dose: "40 mg", instructions: "Once daily before breakfast for 5 days" }
                ],
                attachments: [
                    { name: "Operative_Surgery_Notes.pdf", size: "3.1 MB" },
                    { name: "Hospital_Discharge_Summary.pdf", size: "2.4 MB" },
                    { name: "Post_Op_Prescription.pdf", size: "480 KB" },
                    { name: "Histopathology_Biopsy_Report.pdf", size: "890 KB" }
                ]
            }
        },
        {
            id: "rec-2025-02",
            year: 2025,
            date: "20 Nov 2025",
            type: "Diagnosis",
            category: "Diseases",
            title: "Acute Appendicitis Presentation & Emergency Evaluation",
            hospital: "CityCare Hospital",
            doctor: "Dr. Keith Pinto (ER In-charge)",
            department: "Emergency Medicine",
            shortDescription: "Emergency admission with localized right lower quadrant pain, low-grade fever, and rebound tenderness.",
            status: "Escalated to Surgery",
            badgeColor: "amber",
            details: {
                diagnosis: "Suspected acute appendicitis; positive McBurney's point tenderness and elevated leukocytosis (14,200/uL).",
                procedure: "Emergency abdominal ultrasound and contrast-enhanced CT scan.",
                clinicalNotes: "Patient presented at 11:30 PM complaining of periumbilical pain migrating to right iliac fossa over 18 hours. CT confirmed 8.2 mm distended non-compressible appendix. Surgical consultation called immediately.",
                treatmentPlan: "Immediate admission to surgical ward, IV fluids, IV antibiotic prophylaxis, preparation for next-day laparoscopic resection.",
                medications: [
                    { name: "IV Cefuroxime", dose: "1.5 g", instructions: "Pre-operative IV stat" },
                    { name: "IV Normal Saline", dose: "500 mL", instructions: "Continuous hydration infusion" }
                ],
                attachments: [
                    { name: "Emergency_Admission_Record.pdf", size: "1.1 MB" },
                    { name: "Abdominal_CT_Scan_Report.pdf", size: "5.2 MB" }
                ]
            }
        },
        {
            id: "rec-2025-03",
            year: 2025,
            date: "12 May 2025",
            type: "Vaccination",
            category: "Vaccinations",
            title: "Influenza Quadrivalent Annual Vaccine",
            hospital: "Metro Community Health",
            doctor: "Dr. Reena Desai",
            department: "Preventative Immunization",
            shortDescription: "Annual seasonal influenza immunization shot administered via intramuscular injection.",
            status: "Completed",
            badgeColor: "green",
            details: {
                diagnosis: "Routine seasonal immunization.",
                procedure: "0.5 mL Intramuscular injection in left deltoid muscle.",
                clinicalNotes: "Observed for 15 minutes post-administration. No signs of immediate hypersensitivity or adverse reaction.",
                treatmentPlan: "Annual booster recommended before onset of monsoon season.",
                medications: [],
                attachments: [
                    { name: "Vaccine_Certificate_Flu2025.pdf", size: "510 KB" }
                ]
            }
        },
        {
            id: "rec-2024-01",
            year: 2024,
            date: "14 Nov 2024",
            type: "Donation",
            category: "Donations",
            title: "Voluntary Whole Blood Donation",
            hospital: "Rotary Blood Bank & Red Cross",
            doctor: "Dr. Vikram Sen",
            department: "Transfusion Medicine",
            shortDescription: "Successful 450 mL voluntary whole blood donation. Pre-donation vitals and hemoglobin verified.",
            status: "Completed",
            badgeColor: "rose",
            details: {
                diagnosis: "Healthy donor evaluation.",
                procedure: "450 mL whole blood collection via sterile single-use blood bag with citrate anticoagulant.",
                clinicalNotes: "Pre-donation Hb: 15.2 g/dL, Pulse: 72 bpm, BP: 120/80 mmHg. Donor tolerated procedure well with no dizziness or syncope.",
                treatmentPlan: "Oral hydration, rest for 20 minutes with high-protein snack. Next donation eligible in 90 days.",
                medications: [],
                attachments: [
                    { name: "Donor_Appreciation_Certificate.pdf", size: "820 KB" },
                    { name: "Donor_Health_Screen_Pass.pdf", size: "340 KB" }
                ]
            }
        },
        {
            id: "rec-2024-02",
            year: 2024,
            date: "15 Sep 2024",
            type: "Vaccination",
            category: "Vaccinations",
            title: "Tetanus Toxoid Booster Prophylaxis",
            hospital: "Metro Community Health",
            doctor: "Dr. Reena Desai",
            department: "Immunization",
            shortDescription: "Tetanus booster administered after superficial abrasion sustained during outdoor cycling.",
            status: "Completed",
            badgeColor: "green",
            details: {
                diagnosis: "Superficial dermal abrasion, right forearm. Minor dirt contamination.",
                procedure: "Wound debridement, sterile saline irrigation, 0.5 mL TT injection (IM).",
                clinicalNotes: "No deep tissue involvement or foreign bodies. Clean epithelial margins.",
                treatmentPlan: "Keep dressing clean and dry. Apply topical mupirocin twice daily.",
                medications: [
                    { name: "Mupirocin 2% Ointment", dose: "Topical", instructions: "Apply twice daily for 5 days" }
                ],
                attachments: [
                    { name: "Immunization_Booster_Record.pdf", size: "430 KB" }
                ]
            }
        },
        {
            id: "rec-2024-03",
            year: 2024,
            date: "10 Mar 2024",
            type: "Treatment",
            category: "Treatments",
            title: "Asthma Consultation & Pulmonary Function Review",
            hospital: "Apollo Specialty Clinic",
            doctor: "Dr. Rajesh Kulkarni",
            department: "Pulmonology & Respiratory Medicine",
            shortDescription: "Spirometry evaluation and maintenance inhaler prescription for mild cold-weather bronchial hyperreactivity.",
            status: "Controlled",
            badgeColor: "teal",
            details: {
                diagnosis: "Mild intermittent asthma with cold-air sensitivity.",
                procedure: "Spirometry (FEV1: 89% predicted, FEV1/FVC: 82%).",
                clinicalNotes: "No nocturnal wheezing reported. Good baseline lung capacity. Prescribed prophylactic low-dose budesonide for flare-ups.",
                treatmentPlan: "Carry inhaler during strenuous outdoor running. Avoid abrupt dust exposure.",
                medications: [
                    { name: "Budesonide Inhaler", dose: "200 mcg", instructions: "1 puff as needed before heavy exercise" }
                ],
                attachments: [
                    { name: "Spirometry_Report_2024.pdf", size: "1.6 MB" },
                    { name: "Pulmonary_Care_Guideline.pdf", size: "680 KB" }
                ]
            }
        },
        {
            id: "rec-2023-01",
            year: 2023,
            date: "22 Oct 2023",
            type: "Treatment",
            category: "Treatments",
            title: "Left Ankle Inversion Sprain & Physical Rehabilitation",
            hospital: "St. Jude Orthopedic Care",
            doctor: "Dr. Meera Nambiar",
            department: "Orthopedics & Sports Medicine",
            shortDescription: "Grade 1 lateral ligament sprain after athletic misstep. Rest, ice, compression, and rehab exercises prescribed.",
            status: "Resolved",
            badgeColor: "teal",
            details: {
                diagnosis: "Grade 1 strain of anterior talofibular ligament (ATFL). No fracture detected on X-Ray.",
                procedure: "Digital bilateral ankle radiographs, crepe bandage immobilization.",
                clinicalNotes: "Mild swelling over lateral malleolus. Weight-bearing tolerated with slight limp. Neurological exam intact.",
                treatmentPlan: "RICE protocol for 72 hours, followed by eccentric calf and proprioception exercises.",
                medications: [
                    { name: "Aceclofenac + Paracetamol", dose: "100mg/325mg", instructions: "Twice daily after meals for 3 days" }
                ],
                attachments: [
                    { name: "Left_Ankle_XRay_Digital.pdf", size: "3.7 MB" },
                    { name: "Physiotherapy_Protocol_Chart.pdf", size: "910 KB" }
                ]
            }
        },
        {
            id: "rec-2023-02",
            year: 2023,
            date: "04 Feb 2023",
            type: "Donation",
            category: "Donations",
            title: "Campus Blood Drive Contribution",
            hospital: "National Blood Transfusion Council",
            doctor: "Dr. P. K. Saxena",
            department: "Transfusion Services",
            shortDescription: "Voluntary donor contribution at university health center camp.",
            status: "Completed",
            badgeColor: "rose",
            details: {
                diagnosis: "Eligible voluntary donor.",
                procedure: "Whole blood phlebotomy (350 mL).",
                clinicalNotes: "Uneventful collection. Blood grouped as B Rh Positive.",
                treatmentPlan: "Donor certificate issued.",
                medications: [],
                attachments: [
                    { name: "Blood_Donation_Card_2023.pdf", size: "420 KB" }
                ]
            }
        },
        {
            id: "rec-2022-01",
            year: 2022,
            date: "14 Nov 2022",
            type: "Vaccination",
            category: "Vaccinations",
            title: "Hepatitis B Recombinant Booster Dose",
            hospital: "CityCare Immunization Center",
            doctor: "Dr. Kavita Verma",
            department: "Preventative Medicine",
            shortDescription: "Ten-year recombinant booster administered to ensure continued active viral hepatitis prophylaxis.",
            status: "Completed",
            badgeColor: "green",
            details: {
                diagnosis: "Routine occupational & adult immunization update.",
                procedure: "Intramuscular injection (1.0 mL Engerix-B) into left deltoid.",
                clinicalNotes: "Patient tolerated injection well without local induration or systemic fever. No known past vaccine hypersensitivity.",
                treatmentPlan: "Post-vaccination observational interval (15 mins) uneventful. Full protection documented.",
                medications: [],
                attachments: [
                    { name: "Hepatitis_B_Vaccination_Certificate.pdf", size: "620 KB" }
                ]
            }
        },
        {
            id: "rec-2022-02",
            year: 2022,
            date: "18 Jun 2022",
            type: "Treatment",
            category: "Treatments",
            title: "Ultrasonic Dental Scaling & Oral Prophylaxis",
            hospital: "SmileCraft Dental Specialists",
            doctor: "Dr. Siddharth Roy",
            department: "Dentistry",
            shortDescription: "Complete subgingival ultrasonic plaque and calculus debridement with topical fluoridation.",
            status: "Completed",
            badgeColor: "teal",
            details: {
                diagnosis: "Mild localized marginal gingivitis with calculus deposits.",
                procedure: "Full-mouth ultrasonic scaling, rotary polishing with fine pumice paste, 2.0% sodium fluoride gel application.",
                clinicalNotes: "Gingival tissues showed minor bleeding on probing at lower anteriors. No active caries detected on panoramic examination.",
                treatmentPlan: "Twice-daily soft-bristle brushing with fluoridated toothpaste, daily flossing routine. Schedule 6-month check.",
                medications: [
                    { name: "Chlorhexidine Gluconate 0.2%", dose: "10 mL", instructions: "Rinse mouth twice daily for 7 days" }
                ],
                attachments: [
                    { name: "Dental_Chart_Panoramic_Report.pdf", size: "2.1 MB" }
                ]
            }
        },
        {
            id: "rec-2021-01",
            year: 2021,
            date: "28 Sep 2021",
            type: "Vaccination",
            category: "Vaccinations",
            title: "Seasonal Quadrivalent Influenza Immunization",
            hospital: "Metro Community Health Clinic",
            doctor: "Dr. P. K. Saxena",
            department: "Public Health",
            shortDescription: "Annual seasonal influenza immunization administered prior to winter respiratory transmission window.",
            status: "Completed",
            badgeColor: "green",
            details: {
                diagnosis: "Elective preventative adult immunization.",
                procedure: "Intramuscular deltoid administration of quadrivalent inactivated split-virion vaccine.",
                clinicalNotes: "No immediate localized hypersensitivity. Mild tenderness at injection site expected for 24 hours.",
                treatmentPlan: "Symptomatic cold compress if soreness develops. Annual reminder logged.",
                medications: [],
                attachments: [
                    { name: "Flu_Vaccine_Verification_Record.pdf", size: "480 KB" }
                ]
            }
        }
    ],

    // Hospital RBAC & Doctor Management Store
    hospitals: [
        { id: "hosp-1", name: "St. Jude Orthopedic Care", code: "STJUDE-01", city: "Mumbai", totalDoctors: 12 },
        { id: "hosp-2", name: "City Health Center", code: "CITY-02", city: "Delhi", totalDoctors: 18 },
        { id: "hosp-3", name: "KJ Somaiya Hospital & Research Centre", code: "KJS-04", city: "Mumbai", totalDoctors: 8 }
    ],

    rbacUsers: [
        {
            id: "usr-admin-1",
            name: "Dr. Arthur Vance (Super Admin)",
            email: "admin@stjude.org",
            role: "super_admin",
            hospitalId: "hosp-1",
            hospitalName: "MediTrail Platform",
            password: "admin123"
        },
        {
            id: "usr-hosp-admin-1",
            name: "Karan Johar (Hospital Main Admin)",
            email: "hospadmin@stjude.org",
            role: "hospital_admin",
            hospitalId: "hosp-1",
            hospitalName: "St. Jude Orthopedic Care",
            password: "hosp123"
        },
        {
            id: "usr-hosp-admin-2",
            name: "Vikram Malhotra (Hospital Main Admin)",
            email: "admin@kjsomaiya.org",
            role: "hospital_admin",
            hospitalId: "hosp-3",
            hospitalName: "KJ Somaiya Hospital & Research Centre",
            password: "somaiya123"
        },
        {
            id: "usr-doc-1",
            name: "Dr. Meera Nambiar",
            email: "dr.nambiar@stjude.org",
            role: "doctor",
            hospitalId: "hosp-1",
            hospitalName: "St. Jude Orthopedic Care",
            department: "Orthopedics & Sports Medicine",
            licenseId: "MCI-88942-IN",
            password: "doc123"
        },
        {
            id: "usr-doc-2",
            name: "Dr. Sameer Deshmukh",
            email: "dr.deshmukh@kjsomaiya.org",
            role: "doctor",
            hospitalId: "hosp-3",
            hospitalName: "KJ Somaiya Hospital & Research Centre",
            department: "General Surgery & Laparoscopy",
            licenseId: "MCI-33108-IN",
            password: "doc123"
        }
    ],

    doctorsList: [
        {
            id: "doc-101",
            name: "Dr. Meera Nambiar",
            email: "dr.nambiar@stjude.org",
            licenseId: "MCI-88942-IN",
            department: "Orthopedics & Sports Medicine",
            specialization: "Joint Replacement & Arthroscopy",
            hospitalId: "hosp-1",
            status: "Active",
            patientsVisited: 142
        },
        {
            id: "doc-102",
            name: "Dr. Rajesh Kulkarni",
            email: "dr.kulkarni@stjude.org",
            licenseId: "MCI-44109-IN",
            department: "Pulmonology",
            specialization: "Asthma & Airway Disorders",
            hospitalId: "hosp-1",
            status: "Active",
            patientsVisited: 98
        },
        {
            id: "doc-103",
            name: "Dr. Ananya Sharma",
            email: "dr.sharma@stjude.org",
            licenseId: "MCI-99231-IN",
            department: "Endocrinology",
            specialization: "Metabolic Health & Diabetes",
            hospitalId: "hosp-1",
            status: "Active",
            patientsVisited: 115
        }
    ],

    auditLogs: [
        {
            id: "log-1",
            timestamp: new Date().toISOString(),
            doctorName: "Dr. Meera Nambiar",
            patientId: "MT-10482",
            hospitalName: "St. Jude Orthopedic Care",
            action: "Viewed Timeline Record (Left Ankle Inversion Sprain)",
            ipAddress: "192.168.1.42"
        },
        {
            id: "log-2",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            doctorName: "Dr. Rajesh Kulkarni",
            patientId: "MT-10482",
            hospitalName: "St. Jude Orthopedic Care",
            action: "Issued Prescriptions (Budesonide Inhaler)",
            ipAddress: "192.168.1.18"
        }
    ]
};

// Create a backup of the raw dummy data so services can recover it if cleared
window.MEDITRAIL_DATA_RAW = {
    activeMedications: JSON.parse(JSON.stringify(MEDITRAIL_DATA.activeMedications)),
    recentReports: JSON.parse(JSON.stringify(MEDITRAIL_DATA.recentReports)),
    sharedAccess: JSON.parse(JSON.stringify(MEDITRAIL_DATA.sharedAccess)),
    medicalRecords: JSON.parse(JSON.stringify(MEDITRAIL_DATA.medicalRecords))
};

// Export to window object for access across vanilla JS scripts
window.MEDITRAIL_DATA = MEDITRAIL_DATA;
