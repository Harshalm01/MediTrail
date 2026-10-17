package com.meditrail.handlers;

import com.meditrail.config.AppConfig;
import com.meditrail.db.DatabaseManager;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;

/**
 * Health check handler returning JSON status, database connectivity, and table counts.
 */
public class HealthHandler implements HttpHandler {

    private final AppConfig config;
    private final DatabaseManager dbManager;
    private final com.meditrail.services.StorageService storageService;

    public HealthHandler(AppConfig config, DatabaseManager dbManager, com.meditrail.services.StorageService storageService) {
        this.config = config;
        this.dbManager = dbManager;
        this.storageService = storageService;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // Set CORS Headers
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendJsonResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            return;
        }

        boolean dbConnected = false;
        int patientCount = 0;
        int recordsCount = 0;
        int staffCount = 0;
        String dbError = null;

        try (Connection conn = dbManager.getConnection()) {
            dbConnected = true;

            try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM patients");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) patientCount = rs.getInt(1);
            }

            try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM medical_records");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) recordsCount = rs.getInt(1);
            }

            try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM staff_profiles");
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) staffCount = rs.getInt(1);
            }
        } catch (Exception e) {
            dbConnected = false;
            dbError = e.getMessage().replace("\"", "'");
        }

        boolean r2Configured = (storageService != null && storageService.isConfigured());
        boolean hasAccId = config.getR2AccountId() != null && !config.getR2AccountId().trim().isEmpty();
        boolean hasKeyId = config.getR2AccessKeyId() != null && !config.getR2AccessKeyId().trim().isEmpty();
        boolean hasSecKey = config.getR2SecretAccessKey() != null && !config.getR2SecretAccessKey().trim().isEmpty();
        boolean hasEp = config.getR2Endpoint() != null && !config.getR2Endpoint().trim().isEmpty();

        StringBuilder json = new StringBuilder();
        json.append("{")
            .append("\"status\":\"").append(dbConnected ? "UP" : "DOWN").append("\",")
            .append("\"timestamp\":\"").append(Instant.now().toString()).append("\",")
            .append("\"version\":\"1.0.0\",")
            .append("\"database\":{")
                .append("\"type\":\"").append(config.getDbType()).append("\",")
                .append("\"connected\":").append(dbConnected).append(",")
                .append("\"patientCount\":").append(patientCount).append(",")
                .append("\"recordsCount\":").append(recordsCount).append(",")
                .append("\"staffCount\":").append(staffCount);
        if (dbError != null) {
            json.append(",\"error\":\"").append(dbError).append("\"");
        }
        json.append("},")
            .append("\"storage\":{")
                .append("\"configured\":").append(r2Configured).append(",")
                .append("\"bucket\":\"").append(config.getR2BucketName()).append("\",")
                .append("\"hasAccountId\":").append(hasAccId).append(",")
                .append("\"hasAccessKeyId\":").append(hasKeyId).append(",")
                .append("\"hasSecretAccessKey\":").append(hasSecKey).append(",")
                .append("\"hasEndpoint\":").append(hasEp)
            .append("}}");

        sendJsonResponse(exchange, dbConnected ? 200 : 503, json.toString());
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, String responseJson) throws IOException {
        byte[] bytes = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
