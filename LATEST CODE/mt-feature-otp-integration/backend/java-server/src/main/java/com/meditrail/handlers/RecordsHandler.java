package com.meditrail.handlers;

import com.meditrail.config.AppConfig;
import com.meditrail.models.MedicalRecord;
import com.meditrail.repositories.AuditRepository;
import com.meditrail.repositories.MedicalRecordRepository;
import com.meditrail.repositories.PatientAccessOtpRepository;
import com.meditrail.repositories.SharedAccessRepository;
import com.meditrail.services.AuthService;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Handles medical records retrieval, creation, and authorization enforcement.
 */
public class RecordsHandler extends BaseHandler {

    private final MedicalRecordRepository recordRepository;
    private final SharedAccessRepository sharedAccessRepository;
    private final AuditRepository auditRepository;
    private final AuthService authService;
    private final PatientAccessOtpRepository patientAccessOtpRepository;

    public RecordsHandler(AppConfig config,
                          MedicalRecordRepository recordRepository, 
                          SharedAccessRepository sharedAccessRepository,
                          AuditRepository auditRepository,
                          AuthService authService,
                          PatientAccessOtpRepository patientAccessOtpRepository) {
        super(config);
        this.recordRepository = recordRepository;
        this.sharedAccessRepository = sharedAccessRepository;
        this.auditRepository = auditRepository;
        this.authService = authService;
        this.patientAccessOtpRepository = patientAccessOtpRepository;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (handlePreflight(exchange)) return;

        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                handleGetRecords(exchange);
            } else if ("POST".equalsIgnoreCase(method)) {
                handleCreateRecord(exchange);
            } else {
                sendError(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private void handleGetRecords(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        String patientCode = null;
        if (query != null && query.contains("patientCode=")) {
            patientCode = query.split("patientCode=")[1].split("&")[0];
        }

        // Authorization check: If token is provided, enforce access rules
        String token = getAuthToken(exchange);
        if (token != null) {
            Optional<AuthService.Session> sessionOpt = authService.getSession(token);
            if (sessionOpt.isPresent()) {
                AuthService.Session sess = sessionOpt.get();
                if ("patient".equals(sess.userType)) {
                    // Patient can only view their own records
                    if (patientCode != null && !patientCode.equalsIgnoreCase(sess.identifier)) {
                        sendError(exchange, 403, "Forbidden: Cannot access another patient's medical records");
                        return;
                    }
                    patientCode = sess.identifier;
                } else if ("staff".equals(sess.userType)) {
                    // Doctor / Staff access check: Must have verified Patient Access OTP
                    if (patientCode != null) {
                        boolean isAuthorized = patientAccessOtpRepository != null &&
                                patientAccessOtpRepository.hasActiveVerifiedAccess(patientCode, sess.identifier, sess.name);
                        if (!isAuthorized) {
                            sendError(exchange, 403, "Forbidden: Doctor not authorized to view patient records without verified Patient Access OTP");
                            return;
                        }
                    }
                }
            }
        }


        if (patientCode == null || patientCode.trim().isEmpty()) {
            sendJson(exchange, 200, new JSONArray());
            return;
        }

        List<MedicalRecord> list = recordRepository.findByPatientCode(patientCode);
        JSONArray arr = new JSONArray();
        for (MedicalRecord r : list) {
            arr.put(toJson(r));
        }

        sendJson(exchange, 200, arr);
    }

    private void handleCreateRecord(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);

        String patientCode = req.optString("patientCode", req.optString("patient_code", "MT-10482"));
        String title = req.optString("title", "").trim();

        if (title.isEmpty()) {
            sendError(exchange, 400, "Record title is required");
            return;
        }

        // Server-side authorization check: Only authorized staff/doctors can create clinical records
        String token = getAuthToken(exchange);
        if (token != null) {
            Optional<AuthService.Session> sess = authService.getSession(token);
            if (sess.isPresent() && "patient".equals(sess.get().userType)) {
                sendError(exchange, 403, "Forbidden: Patients cannot self-author clinical medical records");
                return;
            }
        }

        MedicalRecord rec = new MedicalRecord();
        rec.setPatientCode(patientCode);
        rec.setPatientId(req.optString("patientId", null));
        rec.setYear(req.optInt("year", 2024));
        rec.setDate(req.optString("date", req.optString("event_date", "Today")));
        rec.setType(req.optString("type", "Consultation"));
        rec.setCategory(req.optString("category", "Consultations"));
        rec.setTitle(title);
        rec.setHospital(req.optString("hospital", req.optString("hospital_name", "MediTrail Hospital")));
        rec.setDoctor(req.optString("doctor", req.optString("doctor_name", "Attending Physician")));
        rec.setDepartment(req.optString("department", "General Medicine"));
        rec.setShortDescription(req.optString("shortDescription", req.optString("short_description", "")));
        rec.setDiagnosis(req.optString("diagnosis", ""));
        rec.setProcedureNotes(req.optString("procedureNotes", req.optString("procedure_notes", "")));
        rec.setClinicalNotes(req.optString("clinicalNotes", req.optString("clinical_notes", "")));
        rec.setTreatmentPlan(req.optString("treatmentPlan", req.optString("treatment_plan", "")));

        Object meds = req.opt("medications");
        rec.setMedications(meds != null ? meds.toString() : "[]");

        Object atts = req.opt("attachments");
        rec.setAttachments(atts != null ? atts.toString() : "[]");

        rec.setStatus(req.optString("status", "Completed"));

        MedicalRecord saved = recordRepository.save(rec);
        sendJson(exchange, 201, toJson(saved));
    }

    private JSONObject toJson(MedicalRecord r) {
        JSONObject obj = new JSONObject();
        obj.put("id", r.getId());
        obj.put("patientCode", r.getPatientCode());
        obj.put("patient_code", r.getPatientCode());
        obj.put("year", r.getYear());
        obj.put("date", r.getDate());
        obj.put("event_date", r.getDate());
        obj.put("type", r.getType());
        obj.put("category", r.getCategory());
        obj.put("title", r.getTitle());
        obj.put("hospital", r.getHospital());
        obj.put("hospital_name", r.getHospital());
        obj.put("doctor", r.getDoctor());
        obj.put("doctor_name", r.getDoctor());
        obj.put("department", r.getDepartment());
        obj.put("shortDescription", r.getShortDescription());
        obj.put("short_description", r.getShortDescription());
        obj.put("status", r.getStatus());

        JSONObject details = new JSONObject();
        details.put("diagnosis", r.getDiagnosis());
        details.put("procedure", r.getProcedureNotes());
        details.put("clinicalNotes", r.getClinicalNotes());
        details.put("treatmentPlan", r.getTreatmentPlan());
        try {
            details.put("medications", new JSONArray(r.getMedications() != null ? r.getMedications() : "[]"));
        } catch (Exception e) {
            details.put("medications", new JSONArray());
        }
        try {
            details.put("attachments", new JSONArray(r.getAttachments() != null ? r.getAttachments() : "[]"));
        } catch (Exception e) {
            details.put("attachments", new JSONArray());
        }
        obj.put("details", details);

        return obj;
    }
}
