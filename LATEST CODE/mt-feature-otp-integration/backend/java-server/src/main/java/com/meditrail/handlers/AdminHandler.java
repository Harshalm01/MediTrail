package com.meditrail.handlers;

import com.meditrail.models.AuditLog;
import com.meditrail.models.Hospital;
import com.meditrail.models.Patient;
import com.meditrail.models.SharedAccess;
import com.meditrail.models.StaffProfile;
import com.meditrail.repositories.AuditRepository;
import com.meditrail.repositories.PatientAccessOtpRepository;
import com.meditrail.repositories.PatientRepository;
import com.meditrail.repositories.SharedAccessRepository;
import com.meditrail.repositories.StaffRepository;
import com.meditrail.services.AuthService;
import com.meditrail.services.BrevoEmailService;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles hospital staff authentication, RBAC management, doctor lists,
 * audit logs, and dedicated Patient Access OTP operations.
 */
public class AdminHandler extends BaseHandler {

    private static final java.util.logging.Logger LOGGER = java.util.logging.Logger.getLogger(AdminHandler.class.getName());

    private final StaffRepository staffRepository;
    private final PatientRepository patientRepository;
    private final AuditRepository auditRepository;
    private final AuthService authService;
    private final PatientAccessOtpRepository patientAccessOtpRepository;
    private final BrevoEmailService brevoEmailService;
    private final SharedAccessRepository sharedAccessRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminHandler(com.meditrail.config.AppConfig config,
                        StaffRepository staffRepository,
                        PatientRepository patientRepository,
                        AuditRepository auditRepository,
                        AuthService authService,
                        PatientAccessOtpRepository patientAccessOtpRepository,
                        BrevoEmailService brevoEmailService,
                        SharedAccessRepository sharedAccessRepository) {
        super(config);
        this.staffRepository = staffRepository;
        this.patientRepository = patientRepository;
        this.auditRepository = auditRepository;
        this.authService = authService;
        this.patientAccessOtpRepository = patientAccessOtpRepository;
        this.brevoEmailService = brevoEmailService;
        this.sharedAccessRepository = sharedAccessRepository;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("POST".equalsIgnoreCase(method) && path.endsWith("/login")) {
                handleLogin(exchange);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/stats")) {
                handleGetStats(exchange);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/hospitals")) {
                handleGetHospitals(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/hospitals")) {
                handleCreateHospital(exchange);
            } else if ("DELETE".equalsIgnoreCase(method) && path.contains("/hospitals")) {
                handleDeleteHospital(exchange);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/doctors")) {
                handleGetDoctors(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/doctors")) {
                handleCreateDoctor(exchange);
            } else if ("DELETE".equalsIgnoreCase(method) && path.contains("/doctors")) {
                handleDeleteDoctor(exchange);
            } else if ("PUT".equalsIgnoreCase(method) && path.endsWith("/doctors/role")) {
                handleUpdateDoctorRole(exchange);
            } else if ("PUT".equalsIgnoreCase(method) && path.endsWith("/doctors/status")) {
                handleUpdateDoctorStatus(exchange);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/patient-search")) {
                handleSearchPatient(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/patient-access/request-otp")) {
                handleRequestAccessOtp(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/patient-access/verify-otp")) {
                handleVerifyAccessOtp(exchange);
            } else if ("GET".equalsIgnoreCase(method) && path.endsWith("/audit-logs")) {
                handleGetAuditLogs(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/audit-logs")) {
                handleCreateAuditLog(exchange);
            } else {
                sendError(exchange, 404, "Admin endpoint not found");
            }
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }


    private AuthService.Session requireStaffSession(HttpExchange exchange) throws IOException {
        String token = getAuthToken(exchange);
        if (token == null || token.trim().isEmpty()) {
            sendError(exchange, 401, "Unauthorized: Authentication token required");
            return null;
        }
        Optional<AuthService.Session> sessOpt = authService.getSession(token);
        if (sessOpt.isEmpty()) {
            sendError(exchange, 401, "Unauthorized: Invalid or expired session token");
            return null;
        }
        AuthService.Session sess = sessOpt.get();
        if (!"staff".equals(sess.userType)) {
            sendError(exchange, 403, "Forbidden: Access restricted to hospital staff");
            return null;
        }
        return sess;
    }

    private void handleLogin(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String email = req.optString("email", "").trim();
        String password = req.optString("password", "").trim();

        if (email.isEmpty() || password.isEmpty()) {
            sendError(exchange, 400, "Hospital email and password are required");
            return;
        }

        Optional<AuthService.Session> sessionOpt = authService.authenticateStaff(email, password);
        if (sessionOpt.isEmpty()) {
            sendError(exchange, 401, "Invalid hospital email or password");
            return;
        }

        AuthService.Session sess = sessionOpt.get();
        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("token", sess.id);

        JSONObject user = new JSONObject();
        user.put("email", sess.identifier);
        user.put("name", sess.name);
        user.put("role", sess.role);
        user.put("hospitalName", sess.hospitalName != null ? sess.hospitalName : "MediTrail Platform");
        user.put("hospitalId", sess.hospitalId != null ? sess.hospitalId : "");
        resp.put("user", user);

        sendJson(exchange, 200, resp);
    }

    private void handleGetStats(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        boolean isSuperAdmin = "super_admin".equalsIgnoreCase(sess.role) || "manager".equalsIgnoreCase(sess.role);
        JSONObject stats = staffRepository.getSystemStats(sess.hospitalName, isSuperAdmin);
        stats.put("role", sess.role);
        stats.put("userEmail", sess.identifier);
        sendJson(exchange, 200, stats);
    }

    private void handleGetHospitals(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        List<Hospital> list = staffRepository.findAllHospitals();
        JSONArray arr = new JSONArray();
        for (Hospital h : list) {
            JSONObject obj = new JSONObject();
            obj.put("id", h.getId());
            obj.put("name", h.getName());
            obj.put("code", h.getCode());
            obj.put("city", h.getCity());
            obj.put("status", "Active");
            arr.put(obj);
        }
        sendJson(exchange, 200, arr);
    }

    private void handleCreateHospital(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        // Role-based privilege check: Only SuperAdmin / Manager can onboard hospitals
        if (!"super_admin".equalsIgnoreCase(sess.role) && !"manager".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Only Managers can onboard new empanelled hospitals");
            return;
        }

        JSONObject req = parseJsonBody(exchange);
        String hospName = req.optString("name", "").trim();
        String hospCode = req.optString("code", "").trim();
        String hospCity = req.optString("city", "Mumbai").trim();

        if (hospName.isEmpty() || hospCode.isEmpty()) {
            sendError(exchange, 400, "Hospital name and unique code are required");
            return;
        }

        String customId = req.optString("id", "").trim();
        Hospital h = new Hospital(customId.isEmpty() ? null : customId, hospName, hospCode, hospCity);
        Hospital saved = staffRepository.saveHospital(h);

        // If initial hospital admin credentials were provided during hospital onboarding, provision the admin account
        String adminEmail = req.optString("adminEmail", "").trim().toLowerCase();
        String adminPassword = req.optString("adminPassword", "").trim();
        String adminName = req.optString("adminName", "").trim();

        if (!adminEmail.isEmpty() && !adminPassword.isEmpty()) {
            StaffProfile adminProfile = new StaffProfile();
            adminProfile.setName(adminName.isEmpty() ? "Main Admin (" + hospName + ")" : adminName);
            adminProfile.setEmail(adminEmail);
            adminProfile.setRole("hospital_admin");
            adminProfile.setHospitalId(saved.getId());
            adminProfile.setHospitalName(saved.getName());
            adminProfile.setDepartment("Hospital Administration");
            adminProfile.setLicenseId("ADM-" + hospCode + "-IN");
            adminProfile.setStatus("Active");
            adminProfile.setPasswordHash(AuthService.hashPassword(adminPassword));
            staffRepository.save(adminProfile);
        }

        JSONObject obj = new JSONObject();
        obj.put("id", saved.getId());
        obj.put("name", saved.getName());
        obj.put("code", saved.getCode());
        obj.put("city", saved.getCity());
        sendJson(exchange, 201, obj);
    }

    private void handleDeleteHospital(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        // Role-based privilege check: Only SuperAdmin / Manager can delete hospitals
        if (!"super_admin".equalsIgnoreCase(sess.role) && !"manager".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Only Managers can delete empanelled hospitals");
            return;
        }

        String query = exchange.getRequestURI().getRawQuery();
        if (query == null) {
            query = exchange.getRequestURI().getQuery();
        }
        String idOrName = "";
        if (query != null && query.contains("id=")) {
            idOrName = query.split("id=")[1].split("&")[0];
        } else if (query != null && query.contains("name=")) {
            idOrName = query.split("name=")[1].split("&")[0];
        }

        if (idOrName.isEmpty()) {
            sendError(exchange, 400, "Hospital ID or name parameter is required");
            return;
        }

        idOrName = java.net.URLDecoder.decode(idOrName, java.nio.charset.StandardCharsets.UTF_8);

        boolean ok = staffRepository.deleteHospital(idOrName);
        JSONObject resp = new JSONObject();
        resp.put("success", ok);
        sendJson(exchange, 200, resp);
    }

    private void handleGetDoctors(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        List<StaffProfile> list;
        if ("super_admin".equalsIgnoreCase(sess.role) || "manager".equalsIgnoreCase(sess.role)) {
            // Manager / SuperAdmin views all staff across all hospitals
            list = staffRepository.findAllStaff();
        } else if ("hospital_admin".equalsIgnoreCase(sess.role)) {
            // HospitalAdmin views staff for their hospital
            list = staffRepository.findStaffByHospital(sess.hospitalName);
        } else {
            // Doctor views fellow doctors in their hospital
            list = staffRepository.findStaffByHospital(sess.hospitalName);
        }

        JSONArray arr = new JSONArray();
        for (StaffProfile s : list) {
            JSONObject obj = new JSONObject();
            obj.put("id", s.getId());
            obj.put("name", s.getName());
            obj.put("email", s.getEmail());
            obj.put("role", s.getRole());
            obj.put("department", s.getDepartment());
            obj.put("licenseId", s.getLicenseId());
            obj.put("status", s.getStatus());
            obj.put("hospitalName", s.getHospitalName());
            arr.put(obj);
        }
        sendJson(exchange, 200, arr);
    }

    private void handleCreateDoctor(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        // Doctors cannot create any staff accounts
        if ("doctor".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Attending doctors cannot create staff accounts");
            return;
        }

        JSONObject req = parseJsonBody(exchange);
        String name = req.optString("name", "Doctor").trim();
        String email = req.optString("email", "").trim().toLowerCase();
        String targetRole = req.optString("role", "doctor").trim();
        String password = req.optString("password", "doc123").trim();

        if (email.isEmpty()) {
            sendError(exchange, 400, "Staff email address is required");
            return;
        }

        // HospitalAdmin restrictions:
        // Cannot create super_admin accounts; forced to assign their own hospital
        String hospitalId = req.optString("hospitalId", "").trim();
        String hospitalName = req.optString("hospitalName", "").trim();

        if ("hospital_admin".equalsIgnoreCase(sess.role)) {
            if ("super_admin".equalsIgnoreCase(targetRole) || "manager".equalsIgnoreCase(targetRole)) {
                sendError(exchange, 403, "Forbidden: Hospital administrators cannot create Manager accounts");
                return;
            }
            hospitalName = sess.hospitalName != null ? sess.hospitalName : hospitalName;
        }

        // Dynamically resolve valid hospitalId from database
        List<Hospital> allHospitals = staffRepository.findAllHospitals();
        if (!hospitalName.isEmpty()) {
            for (Hospital h : allHospitals) {
                if (h.getName().equalsIgnoreCase(hospitalName) || (h.getId() != null && h.getId().equalsIgnoreCase(hospitalId))) {
                    hospitalId = h.getId();
                    hospitalName = h.getName();
                    break;
                }
            }
        }
        if (hospitalId.isEmpty() && !allHospitals.isEmpty()) {
            hospitalId = allHospitals.get(0).getId();
            if (hospitalName.isEmpty()) hospitalName = allHospitals.get(0).getName();
        }

        StaffProfile s = new StaffProfile();
        s.setName(name);
        s.setEmail(email);
        s.setRole(targetRole);
        s.setHospitalId(hospitalId);
        s.setHospitalName(hospitalName);
        s.setDepartment(req.optString("department", "General Medicine"));
        s.setLicenseId(req.optString("licenseId", "MCI-00100-IN"));
        s.setStatus(req.optString("status", "Active"));
        s.setPasswordHash(AuthService.hashPassword(password));

        StaffProfile saved = staffRepository.save(s);
        JSONObject obj = new JSONObject();
        obj.put("id", saved.getId());
        obj.put("name", saved.getName());
        obj.put("email", saved.getEmail());
        obj.put("role", saved.getRole());
        obj.put("hospitalName", saved.getHospitalName());
        sendJson(exchange, 201, obj);
    }

    private void handleDeleteDoctor(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        // Doctors cannot delete accounts
        if ("doctor".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Doctors cannot delete staff accounts");
            return;
        }

        String query = exchange.getRequestURI().getQuery();
        String idOrEmail = "";
        if (query != null && query.contains("email=")) {
            idOrEmail = query.split("email=")[1].split("&")[0];
        } else if (query != null && query.contains("id=")) {
            idOrEmail = query.split("id=")[1].split("&")[0];
        }

        if (idOrEmail.isEmpty()) {
            sendError(exchange, 400, "Staff ID or email parameter is required");
            return;
        }

        // Prevent deleting own session account
        if (sess.identifier.equalsIgnoreCase(idOrEmail)) {
            sendError(exchange, 400, "Bad Request: Cannot delete your own active staff account");
            return;
        }

        Optional<StaffProfile> targetOpt = staffRepository.findByIdOrEmail(idOrEmail);
        if (targetOpt.isPresent()) {
            StaffProfile target = targetOpt.get();
            // HospitalAdmin cannot delete Manager or staff from other hospitals
            if ("hospital_admin".equalsIgnoreCase(sess.role)) {
                if ("super_admin".equalsIgnoreCase(target.getRole()) || "manager".equalsIgnoreCase(target.getRole())) {
                    sendError(exchange, 403, "Forbidden: Cannot delete Manager accounts");
                    return;
                }
                if (target.getHospitalName() != null && sess.hospitalName != null 
                        && !target.getHospitalName().equalsIgnoreCase(sess.hospitalName)) {
                    sendError(exchange, 403, "Forbidden: Cannot delete staff from another hospital");
                    return;
                }
            }
        }

        boolean ok = staffRepository.deleteStaff(idOrEmail);
        JSONObject resp = new JSONObject();
        resp.put("success", ok);
        sendJson(exchange, 200, resp);
    }

    private void handleUpdateDoctorRole(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        // Role-based privilege check: Only SuperAdmin / Manager can manage administrative roles and permissions
        if (!"super_admin".equalsIgnoreCase(sess.role) && !"manager".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Only Managers can manage administrative roles and permissions");
            return;
        }

        JSONObject req = parseJsonBody(exchange);
        String idOrEmail = req.optString("id", req.optString("email", "")).trim();
        String newRole = req.optString("role", "").trim();

        if (idOrEmail.isEmpty() || newRole.isEmpty()) {
            sendError(exchange, 400, "Staff identifier (id or email) and target role are required");
            return;
        }

        // Validate role values
        if (!"doctor".equalsIgnoreCase(newRole) && !"hospital_admin".equalsIgnoreCase(newRole) && !"super_admin".equalsIgnoreCase(newRole) && !"manager".equalsIgnoreCase(newRole)) {
            sendError(exchange, 400, "Invalid role. Must be 'doctor', 'hospital_admin', or 'manager'");
            return;
        }

        boolean ok = staffRepository.updateRole(idOrEmail, newRole.toLowerCase());
        JSONObject resp = new JSONObject();
        resp.put("success", ok);
        resp.put("role", newRole.toLowerCase());
        sendJson(exchange, 200, resp);
    }

    private void handleUpdateDoctorStatus(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        if ("doctor".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Attending doctors cannot modify account statuses");
            return;
        }

        JSONObject req = parseJsonBody(exchange);
        String idOrEmail = req.optString("id", req.optString("email", "")).trim();
        String newStatus = req.optString("status", "").trim();

        if (idOrEmail.isEmpty() || newStatus.isEmpty()) {
            sendError(exchange, 400, "Staff identifier (id or email) and status are required");
            return;
        }

        // Hospital admins cannot toggle SuperAdmin status
        if ("hospital_admin".equalsIgnoreCase(sess.role)) {
            Optional<StaffProfile> targetOpt = staffRepository.findByIdOrEmail(idOrEmail);
            if (targetOpt.isPresent() && ("super_admin".equalsIgnoreCase(targetOpt.get().getRole()) || "manager".equalsIgnoreCase(targetOpt.get().getRole()))) {
                sendError(exchange, 403, "Forbidden: Hospital administrators cannot modify Manager status");
                return;
            }
        }

        boolean ok = staffRepository.updateStatus(idOrEmail, newStatus);
        JSONObject resp = new JSONObject();
        resp.put("success", ok);
        resp.put("status", newStatus);
        sendJson(exchange, 200, resp);
    }

    private void handleSearchPatient(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        String query = exchange.getRequestURI().getQuery();
        String q = "";
        if (query != null && query.contains("query=")) {
            q = query.split("query=")[1].split("&")[0];
        }

        Optional<Patient> pOpt = Optional.empty();
        if (q.startsWith("MT-")) {
            pOpt = patientRepository.findByPatientCode(q);
        } else {
            pOpt = patientRepository.findByPhone(q);
        }

        if (pOpt.isEmpty()) {
            sendError(exchange, 404, "Patient not found");
            return;
        }

        Patient p = pOpt.get();
        JSONObject obj = new JSONObject();
        obj.put("id", p.getId());
        obj.put("patientCode", p.getPatientCode());
        obj.put("patient_code", p.getPatientCode());
        obj.put("name", p.getName());
        obj.put("age", p.getAge());
        obj.put("dob", p.getDob());
        obj.put("gender", p.getGender());
        obj.put("bloodGroup", p.getBloodGroup());
        obj.put("blood_group", p.getBloodGroup());
        obj.put("phone", p.getPhone());
        sendJson(exchange, 200, obj);
    }

    private void handleGetAuditLogs(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        // Doctors do not have access to administrative audit logs
        if ("doctor".equalsIgnoreCase(sess.role)) {
            sendError(exchange, 403, "Forbidden: Doctors are not authorized to access security audit logs");
            return;
        }

        List<AuditLog> list;
        if ("super_admin".equalsIgnoreCase(sess.role) || "manager".equalsIgnoreCase(sess.role)) {
            // Manager / SuperAdmin views all audit logs platform-wide
            list = auditRepository.findAll();
        } else {
            // HospitalAdmin views audit logs scoped to their hospital
            list = auditRepository.findByHospital(sess.hospitalName);
        }

        JSONArray arr = new JSONArray();
        for (AuditLog a : list) {
            JSONObject obj = new JSONObject();
            obj.put("id", a.getId());
            obj.put("doctorName", a.getDoctorName());
            obj.put("patientId", a.getPatientCode());
            obj.put("hospitalName", a.getHospitalName());
            obj.put("action", a.getAction());
            obj.put("ipAddress", a.getIpAddress());
            obj.put("timestamp", a.getCreatedAt());
            arr.put(obj);
        }
        sendJson(exchange, 200, arr);
    }

    private void handleCreateAuditLog(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        JSONObject req = parseJsonBody(exchange);
        AuditLog a = new AuditLog();
        a.setDoctorName(req.optString("doctorName", sess.name != null ? sess.name : "Physician"));
        a.setPatientCode(req.optString("patientId", req.optString("patient_code", "MT-10482")));
        a.setHospitalName(req.optString("hospitalName", sess.hospitalName != null ? sess.hospitalName : "MediTrail Platform"));
        a.setAction(req.optString("action", "Medical Record Access"));
        a.setIpAddress(req.optString("ipAddress", "127.0.0.1"));
        AuditLog saved = auditRepository.save(a);
        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("id", saved.getId());
        sendJson(exchange, 201, resp);
    }

    /**
     * Handles doctor initiation of Patient Access OTP flow.
     * Generates a single-use 6-digit access code and dispatches it to the patient's registered contact via Brevo.
     */
    private void handleRequestAccessOtp(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        JSONObject req = parseJsonBody(exchange);
        String patientCode = req.optString("patientCode", req.optString("patient_code", req.optString("query", ""))).trim();

        if (patientCode.isEmpty()) {
            sendError(exchange, 400, "Patient code or mobile phone is required to initiate access authorization.");
            return;
        }

        Optional<Patient> pOpt;
        if (patientCode.toUpperCase().startsWith("MT-")) {
            pOpt = patientRepository.findByPatientCode(patientCode.toUpperCase());
        } else {
            pOpt = patientRepository.findByPhone(patientCode);
            if (pOpt.isEmpty()) {
                pOpt = patientRepository.findByPatientCode(patientCode);
            }
        }

        if (pOpt.isEmpty()) {
            sendError(exchange, 404, "Patient record was not found for code/phone: " + patientCode);
            return;
        }

        Patient patient = pOpt.get();

        String recipientEmail = patient.getEmail();
        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            if ("MT-26926".equalsIgnoreCase(patient.getPatientCode())) {
                recipientEmail = config.getDemoPatientEmail() != null ? config.getDemoPatientEmail() : "dev.mandora@somaiya.edu";
            } else if ("MT-50298".equalsIgnoreCase(patient.getPatientCode())) {
                recipientEmail = "harshal.mehta@somaiya.edu";
            } else {
                recipientEmail = config.getBrevoSenderEmail();
            }
        }

        if (!config.isBrevoConfigured()) {
            sendError(exchange, 503, "Email delivery infrastructure is not configured. Please set BREVO_API_KEY and BREVO_SENDER_EMAIL in .env.");
            return;
        }

        String rawOtp = String.format("%06d", secureRandom.nextInt(1000000));
        String accessRequestId = UUID.randomUUID().toString();
        String dispatchId = UUID.randomUUID().toString();

        PatientAccessOtpRepository.PreAllocateResult preAlloc = patientAccessOtpRepository.preAllocateAccessOtp(
                accessRequestId,
                patient.getPatientCode(),
                sess.identifier,
                sess.name,
                sess.hospitalName,
                recipientEmail,
                dispatchId,
                rawOtp,
                15_000,
                300_000
        );

        if (!preAlloc.success) {
            if (preAlloc.isCooldown) {
                JSONObject errResp = new JSONObject();
                errResp.put("success", false);
                errResp.put("error", preAlloc.errorMessage);
                errResp.put("remainingSeconds", preAlloc.remainingCooldownSeconds);
                sendJson(exchange, 429, errResp);
                return;
            } else if (preAlloc.isInFlight) {
                sendError(exchange, 429, preAlloc.errorMessage);
                return;
            } else {
                sendError(exchange, 500, preAlloc.errorMessage);
                return;
            }
        }

        try {
            brevoEmailService.sendPatientAccessOtpEmail(
                    recipientEmail,
                    patient.getName(),
                    sess.name,
                    sess.hospitalName != null ? sess.hospitalName : "MediTrail Care Network",
                    rawOtp
            );
        } catch (BrevoEmailService.BrevoDeliveryException bde) {
            patientAccessOtpRepository.compensateCleanup(accessRequestId, dispatchId);
            if (bde.isTimeout()) {
                sendError(exchange, 504, "Email delivery timed out. Please try requesting access code again.");
            } else {
                sendError(exchange, 502, "Unable to deliver access authorization code: " + bde.getMessage());
            }
            return;
        }

        patientAccessOtpRepository.activateAccessOtp(accessRequestId, dispatchId);

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("accessRequestId", accessRequestId);
        resp.put("patientCode", patient.getPatientCode());
        resp.put("patientName", patient.getName());
        resp.put("maskedContact", maskEmail(recipientEmail));
        resp.put("cooldownSeconds", 60);
        resp.put("expiresInSeconds", 300);
        resp.put("message", "Patient Access OTP has been dispatched to patient's registered contact.");
        if (!config.isProduction()) {
            resp.put("debugOtp", rawOtp);
        }
        sendJson(exchange, 200, resp);
    }

    /**
     * Handles doctor submission and authoritative verification of Patient Access OTP.
     * Enforces single-use consumption and activates verified consultation record access.
     */
    private void handleVerifyAccessOtp(HttpExchange exchange) throws Exception {
        AuthService.Session sess = requireStaffSession(exchange);
        if (sess == null) return;

        JSONObject req = parseJsonBody(exchange);
        String accessRequestId = req.optString("accessRequestId", "").trim();
        String patientCode = req.optString("patientCode", req.optString("patient_code", "")).trim();
        String otp = req.optString("otp", "").trim();

        if (accessRequestId.isEmpty() || patientCode.isEmpty() || otp.isEmpty()) {
            sendError(exchange, 400, "Access request ID, patient code, and 6-digit authorization code are required.");
            return;
        }

        if (otp.length() != 6 || !otp.matches("\\d{6}")) {
            sendError(exchange, 400, "Authorization code must be a 6-digit numeric code.");
            return;
        }

        PatientAccessOtpRepository.VerifyResult vResult = patientAccessOtpRepository.verifyAccessOtp(
                accessRequestId,
                patientCode,
                sess.identifier,
                otp
        );

        if (!vResult.success) {
            JSONObject errResp = new JSONObject();
            errResp.put("success", false);
            errResp.put("error", vResult.errorMessage);
            errResp.put("remainingAttempts", vResult.remainingAttempts);
            sendJson(exchange, 401, errResp);
            return;
        }

        // Verification succeeded: Persist active record in shared_access table
        try {
            SharedAccess s = new SharedAccess();
            s.setPatientCode(patientCode.toUpperCase());
            s.setDoctorName(sess.name);
            s.setHospitalName(sess.hospitalName != null ? sess.hospitalName : "MediTrail Platform");
            s.setDepartment("Attending Care");
            s.setPermissions("Full Medical History");
            s.setStatus("Active");
            s.setAccessGranted("Today");
            s.setAccessExpiry("24 Hours");
            sharedAccessRepository.save(s);
        } catch (Exception e) {
            LOGGER.warning("Could not persist shared_access record on OTP verification: " + e.getMessage());
        }

        // Record security audit entry
        try {
            AuditLog log = new AuditLog();
            log.setDoctorName(sess.name);
            log.setPatientCode(patientCode.toUpperCase());
            log.setHospitalName(sess.hospitalName != null ? sess.hospitalName : "MediTrail Platform");
            log.setAction("Verified Patient Access OTP - Granted Medical Record Access");
            log.setIpAddress(getClientIp(exchange));
            auditRepository.save(log);
        } catch (Exception e) {
            LOGGER.warning("Could not persist audit log on OTP verification: " + e.getMessage());
        }

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("patientCode", patientCode.toUpperCase());
        resp.put("doctorName", sess.name);
        resp.put("message", "Patient Access OTP successfully verified. Medical record access granted.");
        sendJson(exchange, 200, resp);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***@***.com";
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) {
            return local.charAt(0) + "***" + domain;
        }
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}

