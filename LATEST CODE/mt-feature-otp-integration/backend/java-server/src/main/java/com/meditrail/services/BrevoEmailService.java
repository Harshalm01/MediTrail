package com.meditrail.services;

import com.meditrail.config.AppConfig;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Robust transactional email dispatch service using the official Brevo (Sendinblue) v3 API.
 * Handles generation lease decoupling, strict 10-second timeout enforcement, and actionable
 * error translation for IP authorization and credential misconfigurations.
 */
public class BrevoEmailService {

    private static final Logger LOGGER = Logger.getLogger(BrevoEmailService.class.getName());
    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    private final AppConfig config;
    private final HttpClient httpClient;

    public static class BrevoDeliveryException extends Exception {
        private final boolean isTimeout;
        private final int httpStatus;
        private final String errorCode;
        private final String actionableMessage;

        public BrevoDeliveryException(String message, boolean isTimeout, int httpStatus) {
            super(message);
            this.isTimeout = isTimeout;
            this.httpStatus = httpStatus;
            this.errorCode = "UNKNOWN";
            this.actionableMessage = message;
        }

        public BrevoDeliveryException(String message, boolean isTimeout, int httpStatus, String errorCode, String actionableMessage) {
            super(message);
            this.isTimeout = isTimeout;
            this.httpStatus = httpStatus;
            this.errorCode = errorCode;
            this.actionableMessage = actionableMessage;
        }

        public boolean isTimeout() {
            return isTimeout;
        }

        public int getHttpStatus() {
            return httpStatus;
        }

        public String getErrorCode() {
            return errorCode;
        }

        public String getActionableMessage() {
            return actionableMessage;
        }
    }

    public BrevoEmailService(AppConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Sends a 6-digit verification code to the patient's registered email address for sign-in.
     * Treats HTTP 2xx as API acceptance, not guaranteed inbox delivery.
     *
     * @param recipientEmail Clean recipient email address
     * @param recipientName  Recipient display name
     * @param otpCode        The generated 6-digit OTP code
     * @throws BrevoDeliveryException if dispatch fails or times out
     */
    public void sendOtpEmail(String recipientEmail, String recipientName, String otpCode) throws BrevoDeliveryException {
        if (!config.isBrevoConfigured()) {
            throw new BrevoDeliveryException("Email service is not configured. Please set BREVO_API_KEY and BREVO_SENDER_EMAIL.", false, 503);
        }

        String displayName = (recipientName != null && !recipientName.trim().isEmpty()) ? recipientName.trim() : "Patient";
        String senderEmail = config.getBrevoSenderEmail();
        String senderName = config.getBrevoSenderName();

        JSONObject payload = new JSONObject();

        JSONObject sender = new JSONObject();
        sender.put("email", senderEmail);
        sender.put("name", senderName);
        payload.put("sender", sender);

        JSONArray toArray = new JSONArray();
        JSONObject toObj = new JSONObject();
        toObj.put("email", recipientEmail.trim());
        toObj.put("name", displayName);
        toArray.put(toObj);
        payload.put("to", toArray);

        payload.put("subject", "Your MediTrail Verification Code: " + otpCode);
        payload.put("htmlContent", buildHtmlTemplate(displayName, otpCode));

        dispatchPayload(payload);
    }

    /**
     * Sends a dedicated 6-digit Patient Access OTP code to the patient's registered contact
     * when an attending doctor requests access to view the patient's medical records.
     *
     * @param recipientEmail Clean recipient email address
     * @param recipientName  Recipient patient display name
     * @param doctorName     Attending doctor name requesting access
     * @param hospitalName   Hospital / Clinic name
     * @param otpCode        The generated 6-digit access OTP code
     * @throws BrevoDeliveryException if dispatch fails or times out
     */
    public void sendPatientAccessOtpEmail(String recipientEmail, String recipientName, String doctorName, String hospitalName, String otpCode) throws BrevoDeliveryException {
        if (!config.isBrevoConfigured()) {
            throw new BrevoDeliveryException("Email service is not configured. Please set BREVO_API_KEY and BREVO_SENDER_EMAIL.", false, 503);
        }

        String displayName = (recipientName != null && !recipientName.trim().isEmpty()) ? recipientName.trim() : "Patient";
        String docDisplay = (doctorName != null && !doctorName.trim().isEmpty()) ? doctorName.trim() : "Attending Doctor";
        String hospDisplay = (hospitalName != null && !hospitalName.trim().isEmpty()) ? hospitalName.trim() : "MediTrail Care Network";
        String senderEmail = config.getBrevoSenderEmail();
        String senderName = config.getBrevoSenderName();

        JSONObject payload = new JSONObject();

        JSONObject sender = new JSONObject();
        sender.put("email", senderEmail);
        sender.put("name", senderName);
        payload.put("sender", sender);

        JSONArray toArray = new JSONArray();
        JSONObject toObj = new JSONObject();
        toObj.put("email", recipientEmail.trim());
        toObj.put("name", displayName);
        toArray.put(toObj);
        payload.put("to", toArray);

        payload.put("subject", "MediTrail Record Access Request: Authorization Code " + otpCode);
        payload.put("htmlContent", buildAccessHtmlTemplate(displayName, docDisplay, hospDisplay, otpCode));

        dispatchPayload(payload);
    }

    private void dispatchPayload(JSONObject payload) throws BrevoDeliveryException {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BREVO_ENDPOINT))
                    .header("api-key", config.getBrevoApiKey())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10)) // Strict 10-second request timeout
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString(), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            int status = response.statusCode();
            String responseBody = response.body();

            if (status >= 200 && status < 300) {
                // 2xx indicates Brevo accepted the email for dispatch
                LOGGER.info("[Brevo] Email accepted for delivery (status " + status + ").");
            } else {
                // Parse error details safely without leaking secrets or personal data
                String brevoCode = "UNKNOWN_ERROR";
                String brevoMessage = "No details provided by email service.";

                if (responseBody != null && !responseBody.trim().isEmpty()) {
                    try {
                        JSONObject errJson = new JSONObject(responseBody);
                        if (errJson.has("code")) {
                            brevoCode = errJson.optString("code", "UNKNOWN_ERROR");
                        }
                        if (errJson.has("message")) {
                            brevoMessage = errJson.optString("message", brevoMessage);
                        }
                    } catch (Exception ignored) {
                        brevoMessage = responseBody.length() > 200 ? responseBody.substring(0, 200) : responseBody;
                    }
                }

                if (status == 401) {
                    String lowerMsg = brevoMessage.toLowerCase();
                    if (lowerMsg.contains("unrecognised ip") || lowerMsg.contains("unrecognized ip")
                            || lowerMsg.contains("authorised_ips") || lowerMsg.contains("authorized ip")) {
                        LOGGER.severe("[Brevo Error 401 - IP Authorization Required] Brevo rejected request: " + brevoMessage
                                + " -> Action required: Add this IP address at https://app.brevo.com/security/authorised_ips");
                        throw new BrevoDeliveryException(
                                "Server IP is not authorized in Brevo. Add IP at https://app.brevo.com/security/authorised_ips",
                                false, 401, "UNRECOGNIZED_IP", brevoMessage
                        );
                    } else {
                        LOGGER.severe("[Brevo Error 401 - Unauthorized] Invalid or revoked Brevo API key: " + brevoMessage);
                        throw new BrevoDeliveryException(
                                "Invalid or revoked Brevo API key. Check BREVO_API_KEY in .env.",
                                false, 401, "INVALID_API_KEY", brevoMessage
                        );
                    }
                } else if (status == 403) {
                    LOGGER.severe("[Brevo Error 403 - Forbidden] Brevo access forbidden: " + brevoMessage);
                    throw new BrevoDeliveryException(
                            "Brevo account access forbidden. Check account status.",
                            false, 403, "FORBIDDEN", brevoMessage
                    );
                } else if (status == 400 || status == 422) {
                    LOGGER.severe("[Brevo Error " + status + " - Invalid Request] " + brevoMessage);
                    throw new BrevoDeliveryException(
                            "Email dispatch rejected by Brevo (verify BREVO_SENDER_EMAIL): " + brevoMessage,
                            false, status, brevoCode, brevoMessage
                    );
                } else if (status == 429) {
                    LOGGER.warning("[Brevo Error 429 - Rate Limit Exceeded] " + brevoMessage);
                    throw new BrevoDeliveryException(
                            "Email service rate limit reached. Please wait a moment before trying again.",
                            false, 429, "RATE_LIMIT", brevoMessage
                    );
                } else {
                    LOGGER.severe("[Brevo Error " + status + "] " + brevoMessage);
                    throw new BrevoDeliveryException(
                            "Email service provider rejected delivery (status " + status + "): " + brevoMessage,
                            false, status, brevoCode, brevoMessage
                    );
                }
            }
        } catch (HttpTimeoutException e) {
            LOGGER.log(Level.WARNING, "[Brevo Timeout] HTTP request to Brevo timed out after 10 seconds.");
            throw new BrevoDeliveryException("Email service request timed out.", true, 504);
        } catch (BrevoDeliveryException e) {
            throw e;
        } catch (IOException e) {
            LOGGER.log(Level.WARNING, "[Brevo Network Error] Network error contacting Brevo: " + e.getMessage());
            throw new BrevoDeliveryException("Network communication failure with email provider.", false, 502);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BrevoDeliveryException("Email delivery thread interrupted.", false, 500);
        }
    }

    private String buildHtmlTemplate(String name, String otp) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
                + "<body style='margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #0f172a;'>"
                + "  <div style='max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>"
                + "    <div style='text-align: center; margin-bottom: 28px;'>"
                + "      <div style='display: inline-block; background: #0f172a; color: #ffffff; font-weight: 700; font-size: 20px; padding: 10px 22px; border-radius: 12px; letter-spacing: -0.02em;'>MediTrail</div>"
                + "    </div>"
                + "    <h2 style='font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; text-align: center;'>Your Sign-In Verification Code</h2>"
                + "    <p style='font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; text-align: center;'>Hello " + escapeHtml(name) + ", use the 6-digit code below to securely access your medical records:</p>"
                + "    <div style='background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;'>"
                + "      <span style='font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: \"SFMono-Regular\", Consolas, monospace;'>" + otp + "</span>"
                + "    </div>"
                + "    <div style='background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;'>"
                + "      <p style='font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;'><strong>Important:</strong> This verification code will expire in <strong>5 minutes</strong>. Never share this code with anyone.</p>"
                + "    </div>"
                + "    <p style='font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0; text-align: center;'>If you did not request this sign-in code, you can safely ignore this email.</p>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }

    private String buildAccessHtmlTemplate(String name, String doctorName, String hospitalName, String otp) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
                + "<body style='margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #0f172a;'>"
                + "  <div style='max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);'>"
                + "    <div style='text-align: center; margin-bottom: 24px;'>"
                + "      <div style='display: inline-block; background: #0d9488; color: #ffffff; font-weight: 700; font-size: 18px; padding: 8px 20px; border-radius: 10px; letter-spacing: -0.01em;'>MediTrail • Clinical Authorization</div>"
                + "    </div>"
                + "    <h2 style='font-size: 22px; font-weight: 700; color: #0f2744; margin-top: 0; margin-bottom: 12px; text-align: center;'>Doctor Record Access Request</h2>"
                + "    <p style='font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 20px; text-align: center;'>"
                + "      Hello <strong>" + escapeHtml(name) + "</strong>,<br>"
                + "      <strong>Dr. " + escapeHtml(doctorName) + "</strong> from <strong>" + escapeHtml(hospitalName) + "</strong> is requesting permission to access your medical records on MediTrail."
                + "    </p>"
                + "    <div style='background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;'>"
                + "      <div style='font-size: 12px; text-transform: uppercase; font-weight: 700; color: #0d9488; letter-spacing: 1px; margin-bottom: 6px;'>Single-Use Access Authorization Code</div>"
                + "      <span style='font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f2744; font-family: \"SFMono-Regular\", Consolas, monospace;'>" + otp + "</span>"
                + "    </div>"
                + "    <div style='background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;'>"
                + "      <p style='font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;'>"
                + "        <strong>Security Notice:</strong> Only provide this 6-digit code to Dr. " + escapeHtml(doctorName) + " if you authorize them to review your medical history. This code is single-use and will expire in <strong>5 minutes</strong>."
                + "      </p>"
                + "    </div>"
                + "    <p style='font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0; text-align: center;'>If you did not authorize this consultation, do not share this code. Your medical records remain encrypted and inaccessible without your authorization.</p>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
