package com.meditrail.handlers;

import com.meditrail.config.AppConfig;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public abstract class BaseHandler implements HttpHandler {

    protected final AppConfig config;

    public BaseHandler(AppConfig config) {
        this.config = config;
    }

    protected void setCors(HttpExchange exchange) {
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if (config != null && config.isOriginAllowed(origin)) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", origin != null ? origin : "*");
        } else if (config == null) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        }
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Patient-Code");
        exchange.getResponseHeaders().set("Access-Control-Allow-Credentials", "true");
    }

    protected boolean handlePreflight(HttpExchange exchange) throws IOException {
        setCors(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return true;
        }
        return false;
    }

    protected String readRequestBody(HttpExchange exchange) throws IOException {
        try (java.io.InputStream is = exchange.getRequestBody();
             java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream()) {
            byte[] buffer = new byte[16384];
            int n;
            while ((n = is.read(buffer)) != -1) {
                baos.write(buffer, 0, n);
            }
            return baos.toString(StandardCharsets.UTF_8);
        }
    }

    protected JSONObject parseJsonBody(HttpExchange exchange) throws IOException {
        String body = readRequestBody(exchange);
        if (body == null || body.trim().isEmpty()) {
            return new JSONObject();
        }
        return new JSONObject(body);
    }

    protected void sendJson(HttpExchange exchange, int statusCode, Object data) throws IOException {
        setCors(exchange);
        byte[] bytes = data.toString().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    protected void sendError(HttpExchange exchange, int statusCode, String message) throws IOException {
        JSONObject err = new JSONObject();
        err.put("error", message);
        err.put("status", statusCode);
        sendJson(exchange, statusCode, err);
    }

    protected String getAuthToken(HttpExchange exchange) {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }

    protected String getClientIp(HttpExchange exchange) {
        String xForwardedFor = exchange.getRequestHeaders().getFirst("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.trim().isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        if (exchange.getRemoteAddress() != null && exchange.getRemoteAddress().getAddress() != null) {
            return exchange.getRemoteAddress().getAddress().getHostAddress();
        }
        return "127.0.0.1";
    }
}

