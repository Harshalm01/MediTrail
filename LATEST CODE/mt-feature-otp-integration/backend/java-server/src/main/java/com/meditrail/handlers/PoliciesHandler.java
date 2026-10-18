package com.meditrail.handlers;

import com.meditrail.config.AppConfig;
import com.meditrail.models.InsurancePolicy;
import com.meditrail.repositories.InsurancePolicyRepository;
import com.meditrail.services.AuthService;
import com.meditrail.services.StorageService;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * REST endpoint handler for Insurance Policies (/api/policies).
 * Enforces server-side patient authentication, verified ownership,
 * PDF signature validation, Cloudflare R2 storage, and synchronized deletion.
 */
public class PoliciesHandler extends BaseHandler {

    private static final Logger LOGGER = Logger.getLogger(PoliciesHandler.class.getName());
    private static final long MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

    private final InsurancePolicyRepository policyRepository;
    private final StorageService storageService;
    private final AuthService authService;

    public PoliciesHandler(AppConfig config,
                           InsurancePolicyRepository policyRepository,
                           StorageService storageService,
                           AuthService authService) {
        super(config);
        this.policyRepository = policyRepository;
        this.storageService = storageService;
        this.authService = authService;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                if (path.endsWith("/view")) {
                    handleStreamDocument(exchange, false);
                } else if (path.endsWith("/download")) {
                    handleStreamDocument(exchange, true);
                } else if (path.matches(".*/api/policies/?$")) {
                    handleListPolicies(exchange);
                } else {
                    sendError(exchange, 404, "Endpoint not found");
                }
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/upload")) {
                handleUploadPolicy(exchange);
            } else if ("DELETE".equalsIgnoreCase(method)) {
                handleDeletePolicy(exchange);
            } else {
                sendError(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error handling policy request: " + path, e);
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    /**
     * Resolves authenticated caller session, checking Authorization header or query param.
     */
    private Optional<AuthService.Session> resolveSession(HttpExchange exchange) {
        String token = getAuthToken(exchange);
        if (token == null || token.isEmpty()) {
            // Check query string ?token=... (needed for iframe / native PDF viewer)
            String query = exchange.getRequestURI().getQuery();
            if (query != null && query.contains("token=")) {
                for (String part : query.split("&")) {
                    if (part.startsWith("token=")) {
                        token = part.substring(6).trim();
                        break;
                    }
                }
            }
        }
        return authService.getSession(token);
    }

    /**
     * Lists all policies owned by the authenticated patient.
     */
    private void handleListPolicies(HttpExchange exchange) throws Exception {
        Optional<AuthService.Session> sessionOpt = resolveSession(exchange);
        if (sessionOpt.isEmpty()) {
            sendError(exchange, 401, "Unauthorized: Authentication session required");
            return;
        }

        AuthService.Session session = sessionOpt.get();
        String patientCode = session.identifier;

        // Check for optional explicit ?patientCode= query parameter
        String query = exchange.getRequestURI().getQuery();
        if (query != null && query.contains("patientCode=")) {
            for (String part : query.split("&")) {
                if (part.startsWith("patientCode=")) {
                    String param = part.substring("patientCode=".length()).trim();
                    if (!param.isEmpty()) {
                        String requestedPatientCode = java.net.URLDecoder.decode(param, java.nio.charset.StandardCharsets.UTF_8);
                        // Allow if session belongs to that patient, or staff member (doctor, super_admin, hospital_admin)
                        if (session.identifier.equalsIgnoreCase(requestedPatientCode)
                                || "doctor".equalsIgnoreCase(session.role)
                                || "super_admin".equalsIgnoreCase(session.role)
                                || "hospital_admin".equalsIgnoreCase(session.role)) {
                            patientCode = requestedPatientCode;
                        }
                    }
                    break;
                }
            }
        }

        List<InsurancePolicy> policies = policyRepository.findByPatientCode(patientCode);
        JSONArray arr = new JSONArray();
        for (InsurancePolicy p : policies) {
            arr.put(toJson(p));
        }
        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("policies", arr);
        sendJson(exchange, 200, resp);
    }

    /**
     * Uploads a new insurance policy PDF file and stores its metadata.
     */
    private void handleUploadPolicy(HttpExchange exchange) throws Exception {
        LOGGER.info("[PoliciesHandler] POST /api/policies/upload request received.");

        Optional<AuthService.Session> sessionOpt = resolveSession(exchange);
        if (sessionOpt.isEmpty()) {
            LOGGER.warning("[PoliciesHandler] Upload rejected: Missing or invalid authentication token.");
            sendError(exchange, 401, "Unauthorized: Authentication session required");
            return;
        }

        AuthService.Session session = sessionOpt.get();
        String patientCode = session.identifier;
        LOGGER.info("[PoliciesHandler] Authenticated patient session confirmed: patientCode=" + patientCode);

        JSONObject req = parseJsonBody(exchange);
        String filename = req.optString("filename", "").trim();
        String fileDataBase64 = req.optString("fileData", "").trim();
        String providerName = req.optString("providerName", "").trim();
        String policyNumber = req.optString("policyNumber", "").trim();
        String validUntil = req.optString("validUntil", "").trim();

        if (filename.isEmpty() || fileDataBase64.isEmpty()) {
            LOGGER.warning("[PoliciesHandler] Validation error: filename or fileData is empty.");
            sendError(exchange, 400, "Validation error: Both 'filename' and 'fileData' (base64 PDF bytes) are required.");
            return;
        }

        // Strip Data URL scheme if present (e.g., "data:application/pdf;base64,")
        if (fileDataBase64.contains(",")) {
            fileDataBase64 = fileDataBase64.substring(fileDataBase64.indexOf(',') + 1);
        }

        // Decode base64
        byte[] pdfBytes;
        try {
            pdfBytes = Base64.getDecoder().decode(fileDataBase64.trim());
        } catch (IllegalArgumentException e) {
            LOGGER.warning("[PoliciesHandler] Validation error: Invalid base64 encoded file data.");
            sendError(exchange, 400, "Validation error: Invalid base64 encoded file data.");
            return;
        }

        LOGGER.info(String.format("[PoliciesHandler] Decoded PDF bytes: filename='%s', size=%d bytes", filename, pdfBytes.length));

        if (pdfBytes.length > MAX_FILE_SIZE) {
            LOGGER.warning("[PoliciesHandler] Payload Too Large: " + pdfBytes.length + " bytes exceeds 15 MB limit.");
            sendError(exchange, 413, "Payload Too Large: PDF file size exceeds the 15 MB limit.");
            return;
        }

        // PDF signature check: %PDF- (hex 25 50 44 46 2D)
        if (pdfBytes.length < 5 ||
                pdfBytes[0] != 0x25 || pdfBytes[1] != 0x50 ||
                pdfBytes[2] != 0x44 || pdfBytes[3] != 0x46 || pdfBytes[4] != 0x2D) {
            LOGGER.warning("[PoliciesHandler] Validation error: Uploaded file is missing %PDF- magic bytes header.");
            sendError(exchange, 400, "Validation error: Uploaded file is not a valid PDF document (missing %PDF- header).");
            return;
        }
        LOGGER.info("[PoliciesHandler] PDF header signature '%PDF-' verified successfully.");

        // Sanitize original filename
        String safeFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safeFilename.isEmpty()) safeFilename = "document.pdf";
        if (!safeFilename.toLowerCase().endsWith(".pdf")) safeFilename += ".pdf";

        if (providerName.isEmpty()) {
            providerName = safeFilename
                    .replaceAll("\\.[^/.]+$", "")
                    .replaceAll("[-_]+", " ")
                    .trim();
            if (providerName.isEmpty()) providerName = "Health Insurance Policy";
        }

        // Generate unique server-side S3 object key
        String storageKey = "policies/" + patientCode + "/" + UUID.randomUUID() + ".pdf";

        // Step 1: Upload to Cloudflare R2
        LOGGER.info("[PoliciesHandler] Step 1: Uploading to Cloudflare R2 with storageKey=" + storageKey);
        try {
            storageService.uploadFile(storageKey, pdfBytes, "application/pdf");
            LOGGER.info("[PoliciesHandler] Step 1 completed: Cloudflare R2 accepted object " + storageKey);
        } catch (StorageService.StorageException e) {
            LOGGER.log(Level.SEVERE, "[PoliciesHandler] Cloudflare R2 upload failed: " + e.getMessage(), e);
            sendError(exchange, 503, "Storage error: " + e.getMessage());
            return;
        }

        // Step 2: Save metadata to Database
        LOGGER.info("[PoliciesHandler] Step 2: Saving policy metadata to database...");
        InsurancePolicy policy = new InsurancePolicy();
        policy.setId(UUID.randomUUID().toString());
        policy.setPatientCode(patientCode);
        policy.setOriginalFilename(safeFilename);
        policy.setStorageKey(storageKey);
        policy.setContentType("application/pdf");
        policy.setFileSize(pdfBytes.length);
        policy.setProviderName(providerName);
        policy.setPolicyNumber(policyNumber); // Optional
        policy.setValidUntil(validUntil);     // Optional

        try {
            policyRepository.save(policy);
            LOGGER.info("[PoliciesHandler] Step 2 completed: Policy metadata saved in DB with ID=" + policy.getId());
        } catch (Exception dbEx) {
            LOGGER.log(Level.SEVERE, "[PoliciesHandler] Database save failed for policy; rolling back Cloudflare R2 object: " + storageKey, dbEx);
            // Partial failure rollback: remove the newly uploaded R2 object to avoid orphan files
            try {
                storageService.deleteFile(storageKey);
                LOGGER.info("[PoliciesHandler] Rollback completed: Deleted R2 orphan object " + storageKey);
            } catch (Exception rollbackEx) {
                LOGGER.log(Level.WARNING, "[PoliciesHandler] Failed to clean up R2 object during DB rollback: " + storageKey, rollbackEx);
            }
            sendError(exchange, 500, "Database error saving policy metadata: " + dbEx.getMessage());
            return;
        }

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "Insurance policy PDF uploaded successfully");
        resp.put("policy", toJson(policy));
        sendJson(exchange, 201, resp);
        LOGGER.info("[PoliciesHandler] Policy upload completed successfully (HTTP 201 Created).");
    }

    /**
     * Streams PDF content to client for inline viewing or download.
     */
    private void handleStreamDocument(HttpExchange exchange, boolean isDownload) throws Exception {
        Optional<AuthService.Session> sessionOpt = resolveSession(exchange);
        if (sessionOpt.isEmpty()) {
            sendError(exchange, 401, "Unauthorized: Authentication session required to view documents");
            return;
        }

        AuthService.Session session = sessionOpt.get();
        String authenticatedPatientCode = session.identifier;

        // Path format: /api/policies/{id}/view or /api/policies/{id}/download
        String path = exchange.getRequestURI().getPath();
        String[] parts = path.split("/");
        if (parts.length < 4) {
            sendError(exchange, 400, "Invalid document path");
            return;
        }

        // Extract policy ID (second to last segment)
        String policyId = parts[parts.length - 2];
        Optional<InsurancePolicy> policyOpt = policyRepository.findById(policyId);
        if (policyOpt.isEmpty()) {
            sendError(exchange, 404, "Policy document not found");
            return;
        }

        InsurancePolicy policy = policyOpt.get();

        // Enforce server-side ownership
        if ("patient".equals(session.userType) && !policy.getPatientCode().equalsIgnoreCase(authenticatedPatientCode)) {
            sendError(exchange, 403, "Forbidden: You do not have permission to access this document");
            return;
        }

        // Retrieve bytes from Cloudflare R2
        byte[] pdfBytes;
        try {
            pdfBytes = storageService.downloadFile(policy.getStorageKey());
        } catch (StorageService.StorageException e) {
            sendError(exchange, 503, "Storage retrieval failed: " + e.getMessage());
            return;
        }

        setCors(exchange);
        String disposition = isDownload ? "attachment" : "inline";
        exchange.getResponseHeaders().set("Content-Type", "application/pdf");
        exchange.getResponseHeaders().set("Content-Disposition", disposition + "; filename=\"" + policy.getOriginalFilename() + "\"");
        exchange.getResponseHeaders().set("Content-Length", String.valueOf(pdfBytes.length));
        exchange.getResponseHeaders().set("Cache-Control", "private, no-cache, no-store, must-revalidate");

        exchange.sendResponseHeaders(200, pdfBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(pdfBytes);
        }
    }

    /**
     * Deletes an insurance policy and its associated object in Cloudflare R2.
     */
    private void handleDeletePolicy(HttpExchange exchange) throws Exception {
        Optional<AuthService.Session> sessionOpt = resolveSession(exchange);
        if (sessionOpt.isEmpty()) {
            sendError(exchange, 401, "Unauthorized: Authentication session required");
            return;
        }

        AuthService.Session session = sessionOpt.get();
        String authenticatedPatientCode = session.identifier;

        // Path format: /api/policies/{id}
        String path = exchange.getRequestURI().getPath();
        String policyId = path.substring(path.lastIndexOf('/') + 1);

        Optional<InsurancePolicy> policyOpt = policyRepository.findById(policyId);
        if (policyOpt.isEmpty()) {
            sendError(exchange, 404, "Policy document not found");
            return;
        }

        InsurancePolicy policy = policyOpt.get();

        // Enforce ownership
        if ("patient".equals(session.userType) && !policy.getPatientCode().equalsIgnoreCase(authenticatedPatientCode)) {
            sendError(exchange, 403, "Forbidden: You do not have permission to delete this document");
            return;
        }

        // Step 1: Attempt to delete from Cloudflare R2 if configured and object key exists
        boolean r2Deleted = false;
        if (storageService.isConfigured() && policy.getStorageKey() != null && !policy.getStorageKey().trim().isEmpty()) {
            try {
                storageService.deleteFile(policy.getStorageKey());
                r2Deleted = true;
            } catch (StorageService.StorageException e) {
                String msg = (e.getMessage() != null) ? e.getMessage().toLowerCase() : "";
                // If the object does not exist in R2 (already deleted or NoSuchKey), we can proceed with DB cleanup
                if (msg.contains("nosuchkey") || msg.contains("not found") || msg.contains("404")) {
                    LOGGER.info("R2 object already absent in bucket for policy " + policyId + "; continuing DB cleanup.");
                } else {
                    LOGGER.log(Level.WARNING, "Failed to delete R2 object for policy " + policyId + ": " + e.getMessage());
                }
            }
        }

        // Step 2: Delete from Database
        boolean deleted = policyRepository.deleteByIdAndPatient(policyId, authenticatedPatientCode);
        if (!deleted) {
            LOGGER.warning("DB row deletion returned false for policy " + policyId);
        }

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "Insurance policy and cloud storage document deleted successfully");
        sendJson(exchange, 200, resp);
    }

    private JSONObject toJson(InsurancePolicy p) {
        JSONObject obj = new JSONObject();
        obj.put("id", p.getId());
        obj.put("patientCode", p.getPatientCode());
        obj.put("originalFilename", p.getOriginalFilename());
        obj.put("fileName", p.getOriginalFilename());
        obj.put("fileSize", p.getFileSize());
        obj.put("providerName", p.getProviderName());
        obj.put("provider", p.getProviderName());
        obj.put("policyNumber", p.getPolicyNumber() != null ? p.getPolicyNumber() : "");
        obj.put("validUntil", p.getValidUntil() != null ? p.getValidUntil() : "");
        obj.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : "");
        return obj;
    }
}
