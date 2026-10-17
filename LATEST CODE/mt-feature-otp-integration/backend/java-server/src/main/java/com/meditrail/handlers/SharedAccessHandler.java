package com.meditrail.handlers;

import com.meditrail.models.SharedAccess;
import com.meditrail.repositories.AuditRepository;
import com.meditrail.repositories.SharedAccessRepository;
import com.meditrail.services.AuthService;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Handles controlled doctor record sharing, access duration, and revocation.
 */
public class SharedAccessHandler extends BaseHandler {

    private final SharedAccessRepository sharedAccessRepository;
    private final AuditRepository auditRepository;
    private final AuthService authService;

    public SharedAccessHandler(com.meditrail.config.AppConfig config,
                               SharedAccessRepository sharedAccessRepository,
                               AuditRepository auditRepository,
                               AuthService authService) {
        super(config);
        this.sharedAccessRepository = sharedAccessRepository;
        this.auditRepository = auditRepository;
        this.authService = authService;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                handleGetSharedAccess(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/grant")) {
                handleGrantAccess(exchange);
            } else if (("POST".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)) && path.endsWith("/revoke")) {
                handleRevokeAccess(exchange);
            } else {
                sendError(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private void handleGetSharedAccess(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        String patientCode = null;
        if (query != null && query.contains("patientCode=")) {
            patientCode = query.split("patientCode=")[1].split("&")[0];
        }

        if (patientCode == null || patientCode.trim().isEmpty()) {
            sendJson(exchange, 200, new JSONArray());
            return;
        }

        List<SharedAccess> list = sharedAccessRepository.findByPatientCode(patientCode);
        JSONArray arr = new JSONArray();
        for (SharedAccess s : list) {
            arr.put(toJson(s));
        }
        sendJson(exchange, 200, arr);
    }

    private void handleGrantAccess(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String patientCode = req.optString("patientCode", "MT-10482");
        String doctorName = req.optString("doctorName", "").trim();

        if (doctorName.isEmpty()) {
            sendError(exchange, 400, "Doctor name is required");
            return;
        }

        SharedAccess s = new SharedAccess();
        s.setPatientCode(patientCode);
        s.setDoctorName(doctorName);
        s.setHospitalName(req.optString("hospitalName", "Attending Care"));
        s.setDepartment(req.optString("department", "Specialist"));
        s.setPermissions(req.optString("permissions", "Full Medical History"));
        s.setStatus("Active");
        s.setAccessGranted(req.optString("accessGranted", "Today"));
        s.setAccessExpiry(req.optString("accessExpiry", "Permanent"));

        SharedAccess saved = sharedAccessRepository.save(s);
        sendJson(exchange, 201, toJson(saved));
    }

    private void handleRevokeAccess(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String patientCode = req.optString("patientCode", "MT-10482");
        String doctorName = req.optString("doctorName", req.optString("id", "")).trim();

        if (doctorName.isEmpty()) {
            sendError(exchange, 400, "Doctor name or authorization ID required");
            return;
        }

        boolean revoked = sharedAccessRepository.revoke(patientCode, doctorName);
        JSONObject resp = new JSONObject();
        resp.put("success", revoked);
        resp.put("message", "Authorization revoked successfully for " + doctorName);
        sendJson(exchange, 200, resp);
    }

    private JSONObject toJson(SharedAccess s) {
        JSONObject obj = new JSONObject();
        obj.put("id", s.getId());
        obj.put("patientCode", s.getPatientCode());
        obj.put("doctorName", s.getDoctorName());
        obj.put("specialty", s.getDepartment() != null ? s.getDepartment() : "Specialist");
        obj.put("department", s.getDepartment());
        obj.put("hospital", s.getHospitalName());
        obj.put("hospitalName", s.getHospitalName());
        obj.put("permissions", s.getPermissions());
        obj.put("status", s.getStatus());
        obj.put("accessGranted", s.getAccessGranted());
        obj.put("accessExpiry", s.getAccessExpiry());
        return obj;
    }
}
