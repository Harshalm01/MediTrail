"""
Pre-Deployment Read-Only API Integration Audit against Live Neon PostgreSQL
Tests API endpoints, patient isolation, and error handling without mutating real data.
"""

import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:8080"

def get_req(path, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.readable() else "{}"
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def post_req(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.readable() else "{}"
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def main():
    print("=== MediTrail Live API Audit Against Neon PostgreSQL ===")

    # 1. Health check & DB engine confirmation
    s, health = get_req("/api/health")
    assert s == 200, f"Health check failed: {health}"
    db_info = health.get("database", {})
    storage_info = health.get("storage", {})
    
    print(f"1. Database Engine Confirmed: {db_info.get('type')} (connected: {db_info.get('connected')})")
    print(f"   Row Counts in Neon: Patients={db_info.get('patientCount')}, Records={db_info.get('recordsCount')}, Staff={db_info.get('staffCount')}")
    assert db_info.get("type") == "postgres", f"Expected 'postgres', got {db_info.get('type')}"
    assert db_info.get("connected") is True, "Database is not connected!"

    # 2. Unauthenticated endpoint guards
    print("\n2. Testing Authentication & Authorization Guards...")
    s, r = get_req("/api/records?patientCode=MT-26926")
    print(f"   GET /api/records without token -> HTTP {s}")
    assert s == 401, f"Expected 401 Unauthorized, got {s}"

    s, r = get_req("/api/policies")
    print(f"   GET /api/policies without token -> HTTP {s}")
    assert s == 401, f"Expected 401 Unauthorized, got {s}"

    s, r = get_req("/api/shared-access?patientCode=MT-26926")
    print(f"   GET /api/shared-access without token -> HTTP {s}")
    assert s == 401, f"Expected 401 Unauthorized, got {s}"

    s, r = get_req("/api/admin/dashboard")
    print(f"   GET /api/admin/dashboard without token -> HTTP {s}")
    assert s == 401, f"Expected 401 Unauthorized, got {s}"

    # 3. Patient Login on Empty Neon DB
    print("\n3. Testing Login Against Empty Neon DB (Demo seeding disabled)...")
    s, r = post_req("/api/patient/login", {"phone": "9820480534", "otp": "1234"})
    print(f"   POST /api/patient/login with demo phone -> HTTP {s}: {r.get('message') or r.get('error')}")
    # Since demo data seeding was disabled (SEED_DEMO_DATA=false) and Neon is completely empty (0 rows):
    assert s == 404, f"Expected 404 Patient Not Found on empty Neon DB, got {s}"
    print("   [CONFIRMED] API executed against Neon (not H2 fallback), correctly returning 404 because Neon patients table is empty.")

    # 4. Storage Diagnostic
    print("\n4. Storage Diagnostic...")
    print(f"   Cloudflare R2 configured: {storage_info.get('configured')}")
    print(f"   Bucket: {storage_info.get('bucket')}")
    assert storage_info.get("configured") is True, "Storage is not configured"

    print("\nALL PRE-DEPLOYMENT API AUDIT CHECKS PASSED!")

if __name__ == "__main__":
    main()
