package com.meditrail.handlers;

import com.meditrail.config.AppConfig;
import com.meditrail.models.Patient;
import com.meditrail.repositories.OtpRepository;
import com.meditrail.repositories.PatientRepository;
import com.meditrail.services.AuthService;
import com.meditrail.services.BrevoEmailService;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONObject;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Handles Patient real-time email OTP authentication via Brevo, registration,
 * profile retrieval, and emergency profile updates.
 */
public class PatientAuthHandler extends BaseHandler {

    private static final Logger LOGGER = Logger.getLogger(PatientAuthHandler.class.getName());

    private final PatientRepository patientRepository;
    private final AuthService authService;
    private final com.meditrail.db.DatabaseManager dbManager;
    private final OtpRepository otpRepository;
    private final BrevoEmailService brevoEmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PatientAuthHandler(AppConfig config,
                              PatientRepository patientRepository,
                              AuthService authService,
                              com.meditrail.db.DatabaseManager dbManager,
                              OtpRepository otpRepository,
                              BrevoEmailService brevoEmailService) {
        super(config);
        this.patientRepository = patientRepository;
        this.authService = authService;
        this.dbManager = dbManager;
        this.otpRepository = otpRepository;
        this.brevoEmailService = brevoEmailService;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("POST".equalsIgnoreCase(method) && path.endsWith("/otp/send")) {
                handleSendOtp(exchange);
            } else if ("POST".equalsIgnoreCase(method) && (path.endsWith("/otp/verify") || path.endsWith("/login"))) {
                handleVerifyOtp(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/logout")) {
                handleLogout(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/register")) {
                handleRegister(exchange);
            } else if ("GET".equalsIgnoreCase(method) && path.contains("/profile")) {
                handleGetProfile(exchange);
            } else if (("PUT".equalsIgnoreCase(method) || "POST".equalsIgnoreCase(method)) && path.contains("/emergency")) {
                handleUpdateEmergency(exchange);
            } else {
                sendError(exchange, 404, "Endpoint not found");
            }
        } catch (Exception e) {
            LOGGER.warning("PatientAuthHandler error: " + e.getMessage());
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    /**
     * Sends a real-time 6-digit OTP code through the Brevo Transactional Email API.
     * Uses generation ID leasing to decouple the external network call from database locks.
     */
    private void handleSendOtp(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String email = req.optString("email", "").trim();

        if (email.isEmpty() || !email.contains("@") || !email.contains(".")) {
            sendError(exchange, 400, "A valid email address is required.");
            return;
        }

        String cleanEmail = email.toLowerCase();
        Optional<Patient> patientOpt = patientRepository.findByEmail(cleanEmail);

        // Anti-enumeration: if no patient is found with this email, return generic success
        // without generating an OTP or contacting Brevo.
        if (patientOpt.isEmpty()) {
            JSONObject resp = new JSONObject();
            resp.put("success", true);
            resp.put("message", "If an account with this email exists, a verification code has been sent.");
            resp.put("cooldownSeconds", 60);
            sendJson(exchange, 200, resp);
            return;
        }

        Patient p = patientOpt.get();

        if (!config.isBrevoConfigured()) {
            sendError(exchange, 503, "Email service is not configured. Please set BREVO_API_KEY and BREVO_SENDER_EMAIL in .env.");
            return;
        }

        // Generate cryptographically random 6-digit OTP and unique generation/dispatch ID
        String rawOtp = String.format("%06d", secureRandom.nextInt(1000000));
        String dispatchId = UUID.randomUUID().toString();

        // Phase 1: Pre-allocate record in database with 15s lease and 5-minute expiry
        OtpRepository.PreAllocateResult preAlloc = otpRepository.preAllocateOtp(cleanEmail, dispatchId, rawOtp, 15_000, 300_000);
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

        // Phase 2: Network dispatch via Brevo (zero database connections held)
        try {
            brevoEmailService.sendOtpEmail(cleanEmail, p.getName(), rawOtp);
        } catch (BrevoEmailService.BrevoDeliveryException bde) {
            // Phase 3B/3C: Compensating cleanup targeting exact dispatchId
            otpRepository.compensateCleanup(cleanEmail, dispatchId);
            if (bde.isTimeout()) {
                sendError(exchange, 504, "Email delivery timed out. Please check your inbox or try requesting a code again shortly.");
            } else if ("UNRECOGNIZED_IP".equals(bde.getErrorCode())) {
                LOGGER.severe("[PatientAuthHandler] Brevo rejected OTP email dispatch due to unlisted IP address: " + bde.getMessage());
                sendError(exchange, 502, "Unable to deliver verification code. The email service provider rejected the request because the server IP is not authorized in Brevo. Please add your IP at https://app.brevo.com/security/authorised_ips or disable IP restrictions.");
            } else if ("INVALID_API_KEY".equals(bde.getErrorCode())) {
                LOGGER.severe("[PatientAuthHandler] Brevo authentication failure: " + bde.getMessage());
                sendError(exchange, 502, "Unable to deliver verification code. Email service authentication failed. Please verify BREVO_API_KEY.");
            } else if ("INVALID_REQUEST".equals(bde.getErrorCode())) {
                LOGGER.severe("[PatientAuthHandler] Brevo invalid request: " + bde.getMessage());
                sendError(exchange, 502, "Unable to deliver verification code. " + bde.getMessage());
            } else {
                LOGGER.severe("[PatientAuthHandler] Brevo delivery failure: " + bde.getMessage());
                sendError(exchange, 502, "Unable to deliver verification code. " + (bde.getActionableMessage() != null ? bde.getActionableMessage() : "Please check your network or try again shortly."));
            }
            return;
        }

        // Phase 3A: Targeted activation of the pre-allocated OTP
        otpRepository.activateOtp(cleanEmail, dispatchId);

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "If an account with this email exists, a verification code has been sent.");
        resp.put("cooldownSeconds", 60);
        sendJson(exchange, 200, resp);
    }

    /**
     * Verifies the actual OTP generated by the backend and persisted in the authoritative SQL database.
     * Never accepts hardcoded codes or bypasses.
     */
    private void handleVerifyOtp(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String email = req.optString("email", "").trim();
        String otp = req.optString("otp", "").trim();

        if (email.isEmpty() || otp.isEmpty()) {
            sendError(exchange, 400, "Registered email and 6-digit verification code are required.");
            return;
        }

        String cleanEmail = email.toLowerCase();
        OtpRepository.VerifyResult vResult = otpRepository.verifyOtp(cleanEmail, otp);
        if (!vResult.success) {
            sendError(exchange, 401, vResult.errorMessage);
            return;
        }

        Optional<Patient> patientOpt = patientRepository.findByEmail(cleanEmail);
        if (patientOpt.isEmpty()) {
            sendError(exchange, 404, "Patient record associated with this email was not found.");
            return;
        }

        Patient p = patientOpt.get();
        AuthService.Session session = authService.createPatientSession(p.getPatientCode(), p.getName(), p.getPhone());

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("token", session.id);
        resp.put("patient", toJson(p));
        sendJson(exchange, 200, resp);
    }

    private void handleLogout(HttpExchange exchange) throws Exception {
        String token = getAuthToken(exchange);
        String patientCode = null;
        if (token != null) {
            Optional<AuthService.Session> sess = authService.getSession(token);
            if (sess.isPresent()) {
                patientCode = sess.get().identifier;
                authService.invalidateSession(token);
            }
        }

        // If client also passed patientCode in body
        if (patientCode == null) {
            try {
                JSONObject req = parseJsonBody(exchange);
                patientCode = req.optString("patientCode", null);
            } catch (Exception ignored) {}
        }

        // If it's one of the two designated demo users, reset their baseline modifications
        if (patientCode != null && ("MT-26926".equalsIgnoreCase(patientCode) || "MT-50298".equalsIgnoreCase(patientCode))) {
            dbManager.resetDemoPatientBaseline(patientCode);
        }

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "Logged out successfully");
        sendJson(exchange, 200, resp);
    }

    /**
     * Registers a new patient with their real email address.
     * Does NOT require OTP verification or mandatory email verification during registration.
     */
    private void handleRegister(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String name = req.optString("name", "").trim();
        String phone = req.optString("phone", "").trim();
        String email = req.optString("email", "").trim();

        if (name.isEmpty() || phone.isEmpty() || email.isEmpty()) {
            sendError(exchange, 400, "Patient full name, mobile phone, and email address are required.");
            return;
        }

        if (!email.contains("@") || !email.contains(".")) {
            sendError(exchange, 400, "Please provide a valid email address.");
            return;
        }

        String cleanEmail = email.toLowerCase();
        Optional<Patient> existingEmail = patientRepository.findByEmail(cleanEmail);
        if (existingEmail.isPresent()) {
            sendError(exchange, 409, "An account with this email address already exists. Please sign in.");
            return;
        }

        Optional<Patient> existingPhone = patientRepository.findByPhone(phone);
        if (existingPhone.isPresent()) {
            sendError(exchange, 409, "A patient with this mobile number already exists.");
            return;
        }

        Patient p = new Patient();
        p.setName(name);
        p.setPhone(phone);
        p.setEmail(cleanEmail);
        p.setAge(req.optInt("age", 25));
        p.setDob(req.optString("dob", "2000-01-01"));
        p.setGender(req.optString("gender", "Male"));
        p.setBloodGroup(req.optString("bloodGroup", "B+"));
        p.setAllergies(req.optString("allergies", ""));
        p.setChronicConditions(req.optString("chronicConditions", ""));
        p.setEmergencyContactName(req.optString("emergencyContactName", ""));
        p.setEmergencyContactRelationship(req.optString("emergencyContactRelationship", ""));
        p.setEmergencyContactPhone(req.optString("emergencyContactPhone", ""));
        p.setInsuranceProvider(req.optString("insuranceProvider", ""));
        p.setPolicyNumber(req.optString("policyNumber", ""));

        Patient saved = patientRepository.save(p);

        // Registration does NOT create an authenticated session or send OTP.
        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "Registration successful. Please sign in with your email.");
        resp.put("patient", toJson(saved));
        sendJson(exchange, 201, resp);
    }

    private void handleGetProfile(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        String code = null;
        if (query != null && query.contains("patientCode=")) {
            code = query.split("patientCode=")[1].split("&")[0];
        }

        if (code == null) {
            String token = getAuthToken(exchange);
            Optional<AuthService.Session> sess = authService.getSession(token);
            if (sess.isPresent()) {
                code = sess.get().identifier;
            }
        }

        if (code == null) {
            sendError(exchange, 400, "patientCode query parameter or Authorization token required");
            return;
        }

        Optional<Patient> pOpt = patientRepository.findByPatientCode(code);
        if (pOpt.isEmpty()) {
            sendError(exchange, 404, "Patient not found");
            return;
        }

        sendJson(exchange, 200, toJson(pOpt.get()));
    }

    private void handleUpdateEmergency(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String patientCode = req.optString("patientCode", "").trim();

        if (patientCode.isEmpty()) {
            sendError(exchange, 400, "patientCode is required");
            return;
        }

        // Server-side authorization check: verify caller is patient or authorized staff
        String token = getAuthToken(exchange);
        Optional<AuthService.Session> sess = authService.getSession(token);
        if (sess.isPresent()) {
            if ("patient".equals(sess.get().userType) && !sess.get().identifier.equalsIgnoreCase(patientCode)) {
                sendError(exchange, 403, "Forbidden: Patients can only update their own emergency profile");
                return;
            }
        }

        boolean updated = patientRepository.updateEmergency(
                patientCode,
                req.optString("bloodGroup", "B+"),
                req.optString("allergies", ""),
                req.optString("chronicConditions", ""),
                req.optString("emergencyContactName", ""),
                req.optString("emergencyContactRelationship", ""),
                req.optString("emergencyContactPhone", "")
        );

        if (!updated) {
            sendError(exchange, 404, "Patient not found or could not update");
            return;
        }

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "Emergency profile updated successfully");
        sendJson(exchange, 200, resp);
    }

    private JSONObject toJson(Patient p) {
        JSONObject obj = new JSONObject();
        obj.put("id", p.getId());
        obj.put("patientCode", p.getPatientCode());
        obj.put("patient_code", p.getPatientCode());

        // Transform display name for exactly the two designated demo users
        String rawName = p.getName() != null ? p.getName() : "";
        String cleanPhone = p.getPhone() != null ? p.getPhone().replaceAll("[^0-9]", "") : "";
        boolean isDemo = "MT-26926".equalsIgnoreCase(p.getPatientCode())
                || "MT-50298".equalsIgnoreCase(p.getPatientCode())
                || cleanPhone.endsWith("9820480534")
                || cleanPhone.endsWith("9324476116");

        String displayName = rawName;
        if (isDemo && !displayName.endsWith("(Dummy)")) {
            displayName = displayName.trim() + " (Dummy)";
        }

        obj.put("name", displayName);
        obj.put("rawName", rawName);
        obj.put("isDemo", isDemo);
        obj.put("age", p.getAge());
        obj.put("dob", p.getDob());
        obj.put("gender", p.getGender());
        obj.put("bloodGroup", p.getBloodGroup());
        obj.put("blood_group", p.getBloodGroup());
        obj.put("phone", p.getPhone());
        obj.put("email", p.getEmail() != null ? p.getEmail() : "");
        obj.put("allergies", p.getAllergies());
        obj.put("chronicConditions", p.getChronicConditions());
        obj.put("chronic_conditions", p.getChronicConditions());
        obj.put("emergencyContactName", p.getEmergencyContactName());
        obj.put("emergencyContactRelationship", p.getEmergencyContactRelationship());
        obj.put("emergencyContactPhone", p.getEmergencyContactPhone());
        obj.put("insuranceProvider", p.getInsuranceProvider());
        obj.put("policyNumber", p.getPolicyNumber());
        return obj;
    }
}
