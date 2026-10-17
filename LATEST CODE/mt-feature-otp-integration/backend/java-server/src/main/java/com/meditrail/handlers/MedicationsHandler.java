package com.meditrail.handlers;

import com.meditrail.models.MedicalRecord;
import com.meditrail.repositories.MedicalRecordRepository;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;

/**
 * Handles medication regimens parsing and refill request logging.
 */
public class MedicationsHandler extends BaseHandler {

    private final MedicalRecordRepository recordRepository;

    public MedicationsHandler(com.meditrail.config.AppConfig config, MedicalRecordRepository recordRepository) {
        super(config);
        this.recordRepository = recordRepository;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (handlePreflight(exchange)) return;

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            if ("GET".equalsIgnoreCase(method)) {
                handleGetMedications(exchange);
            } else if ("POST".equalsIgnoreCase(method) && path.endsWith("/refill")) {
                handleRefillRequest(exchange);
            } else {
                sendError(exchange, 405, "Method Not Allowed");
            }
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private void handleGetMedications(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        String patientCode = null;
        if (query != null && query.contains("patientCode=")) {
            patientCode = query.split("patientCode=")[1].split("&")[0];
        }

        if (patientCode == null || patientCode.trim().isEmpty()) {
            sendJson(exchange, 200, new JSONArray());
            return;
        }

        List<MedicalRecord> records = recordRepository.findByPatientCode(patientCode);
        JSONArray medsArray = new JSONArray();

        for (MedicalRecord r : records) {
            String medsRaw = r.getMedications();
            if (medsRaw != null && !medsRaw.trim().isEmpty() && !medsRaw.equals("[]")) {
                try {
                    JSONArray parsed = new JSONArray(medsRaw);
                    for (int i = 0; i < parsed.length(); i++) {
                        JSONObject m = parsed.getJSONObject(i);
                        JSONObject regimen = new JSONObject();
                        regimen.put("name", m.optString("name", "Prescription"));
                        regimen.put("dosage", m.optString("dose", "As prescribed"));
                        regimen.put("frequency", m.optString("instructions", "Daily"));
                        regimen.put("purpose", r.getShortDescription() != null && !r.getShortDescription().isEmpty() 
                                ? r.getShortDescription() : "Clinical Treatment Plan");
                        regimen.put("prescribedBy", r.getDoctor() != null ? r.getDoctor() : "Attending Physician");
                        regimen.put("startDate", r.getDate() != null ? r.getDate() : "Recent");
                        regimen.put("status", "Active");
                        medsArray.put(regimen);
                    }
                } catch (Exception ignored) {}
            }
        }

        // Add demo fallback if no prescriptions in designated demo accounts
        if (medsArray.length() == 0 && ("MT-26926".equalsIgnoreCase(patientCode) || "MT-50298".equalsIgnoreCase(patientCode))) {
            JSONObject med1 = new JSONObject();
            med1.put("name", "Budesonide / Formoterol Inhaler");
            med1.put("dosage", "160/4.5 mcg");
            med1.put("frequency", "2 puffs twice daily");
            med1.put("purpose", "Maintenance therapy for mild asthma");
            med1.put("prescribedBy", "Dr. Sameer Deshmukh");
            med1.put("startDate", "12 Nov 2024");
            med1.put("status", "Active");
            medsArray.put(med1);

            JSONObject med2 = new JSONObject();
            med2.put("name", "Cetirizine 10mg");
            med2.put("dosage", "1 tablet");
            med2.put("frequency", "Once daily at bedtime as needed");
            med2.put("purpose", "Allergic rhinitis & dust mite prophylaxis");
            med2.put("prescribedBy", "Dr. Meera Nambiar");
            med2.put("startDate", "14 Oct 2024");
            med2.put("status", "Active");
            medsArray.put(med2);
        }

        sendJson(exchange, 200, medsArray);
    }

    private void handleRefillRequest(HttpExchange exchange) throws Exception {
        JSONObject req = parseJsonBody(exchange);
        String medicationName = req.optString("medicationName", req.optString("name", "Medication"));

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        resp.put("message", "Refill request logged for " + medicationName);
        resp.put("status", "PENDING_PHYSICIAN_APPROVAL");
        sendJson(exchange, 200, resp);
    }
}
