# Automated Test Suite for MediTrail Real Email OTP & Patient Authentication
import urllib.request
import urllib.parse
import urllib.error
import json
import time
import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import runner

BASE_URL = "http://localhost:8080"

def post_json(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.readable() else "{}"
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def get_json(path, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.readable() else "{}"
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def run_tests():
    print("============================================================")
    print(" MediTrail Email OTP & Backend Integrity Test Suite")
    print("============================================================")

    # 1. Start Java backend using runner
    print("\n[Step 1] Launching Java Backend via runner...")
    runner.start_java_backend(did_compile=False)

    try:
        # 2. Verify Health & Database connection
        print("\n[Step 2] Checking /api/health...")
        status, health = get_json("/api/health")
        assert status == 200, f"Expected 200 from /api/health, got {status}"
        assert health.get("status") == "UP", f"Expected UP, got {health.get('status')}"
        db_info = health.get("database", {})
        assert db_info.get("connected") is True, "Database not connected"
        patient_count = db_info.get("patientCount", 0)
        print(f"Health: UP | DB Connected: True | Existing Patients: {patient_count}")
        assert patient_count >= 2, f"Expected at least 2 existing patients, found {patient_count}"

        # 3. Anti-Enumeration Test: Request OTP for unknown email
        print("\n[Step 3] Testing Anti-Account-Enumeration for unregistered email...")
        unknown_email = f"unknown_{int(time.time())}@example.com"
        status, resp = post_json("/api/patient/otp/send", {"email": unknown_email})
        print(f"Response status: {status}, body: {resp}")
        assert status == 200, f"Expected 200 generic response, got {status}"
        assert resp.get("success") is True, "Expected success: true"
        assert "If an account with this email exists" in resp.get("message", ""), "Missing anti-enumeration message"
        print("[PASS] Anti-enumeration returns generic success without leaking account existence.")

        # 4. Patient Registration: Real Email, NO OTP REQUIRED
        print("\n[Step 4] Testing Patient Registration with Email (NO OTP REQUIRED)...")
        test_email = f"testpatient_{int(time.time())}@example.com"
        test_phone = f"91{int(time.time()) % 100000000:08d}"
        reg_payload = {
            "name": "Integration Test User",
            "email": test_email,
            "phone": test_phone,
            "age": 30,
            "dob": "1994-03-21",
            "gender": "Female",
            "bloodGroup": "O+",
            "allergies": "None",
            "chronicConditions": "",
            "emergencyContactName": "Family Contact",
            "emergencyContactRelationship": "Spouse",
            "emergencyContactPhone": "9876543210"
        }
        status, reg_resp = post_json("/api/patient/register", reg_payload)
        print(f"Registration status: {status}, body: {reg_resp}")
        assert status == 201, f"Expected 201 Created, got {status}: {reg_resp}"
        assert reg_resp.get("success") is True, "Expected registration success"
        patient_code = reg_resp.get("patient", {}).get("patientCode")
        print(f"Registered patientCode: {patient_code}, Email: {test_email}")
        assert patient_code is not None, "Missing patientCode in response"

        # 5. Duplicate Email Conflict Check
        print("\n[Step 5] Testing Duplicate Email Rejection...")
        dup_payload = reg_payload.copy()
        dup_payload["phone"] = f"92{int(time.time()) % 100000000:08d}"
        status, dup_resp = post_json("/api/patient/register", dup_payload)
        assert status == 409, f"Expected 409 Conflict for duplicate email, got {status}"
        print(f"[PASS] Duplicate email rejected with 409 Conflict: {dup_resp.get('error')}")

        # 6. Request OTP for Registered Patient
        print("\n[Step 6] Requesting Email OTP for registered user...")
        status, otp_send_resp = post_json("/api/patient/otp/send", {"email": test_email})
        print(f"OTP Send Status: {status}, response: {otp_send_resp}")
        # If Brevo is unconfigured in local test environment, it must fail safely with 503
        if status == 503:
            print("[PASS] Unconfigured Brevo correctly returns 503 with helpful config prompt.")
            assert "Email service is not configured" in otp_send_resp.get("error", "")
        elif status == 200:
            print("[PASS] Brevo is configured and OTP dispatch was accepted.")

        # 7. Verification Rejection of Hardcoded '1234'
        print("\n[Step 7] Verifying hardcoded '1234' or invalid code is REJECTED...")
        status, verify_resp = post_json("/api/patient/otp/verify", {"email": test_email, "otp": "1234"})
        print(f"Verification status: {status}, body: {verify_resp}")
        assert status == 401, f"Expected 401 Unauthorized for invalid/unissued OTP, got {status}"
        print("[PASS] Hardcoded OTPs and invalid codes are strictly rejected.")

        # 8. Check Existing Patients (Dev Mandora & Harshal Mehta) Preservation
        print("\n[Step 8] Verifying existing patient records are preserved...")
        status, dev_profile = get_json("/api/patient/profile?patientCode=MT-26926")
        assert status == 200, f"Expected 200 for Dev Mandora (MT-26926), got {status}"
        assert dev_profile.get("patientCode") == "MT-26926", "Dev Mandora record corrupted"
        print(f"Preserved Demo Patient 1: {dev_profile.get('name')} | Phone: {dev_profile.get('phone')}")

        status, harshal_profile = get_json("/api/patient/profile?patientCode=MT-50298")
        assert status == 200, f"Expected 200 for Harshal Mehta (MT-50298), got {status}"
        assert harshal_profile.get("patientCode") == "MT-50298", "Harshal Mehta record corrupted"
        print(f"Preserved Demo Patient 2: {harshal_profile.get('name')} | Phone: {harshal_profile.get('phone')}")

        # 9. Verify Clinical Records Preservation
        status, records = get_json("/api/records?patientCode=MT-26926")
        assert status == 200, f"Expected 200 for MT-26926 records, got {status}"
        print(f"Preserved MT-26926 Medical Records count: {len(records)}")
        assert len(records) > 0, "Clinical records for MT-26926 were wiped!"

        print("\n============================================================")
        print(" ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (100% GREEN)")
        print("============================================================")

    finally:
        print("\n[Cleanup] Stopping Java backend...")
        runner.stop_java_backend()

if __name__ == '__main__':
    run_tests()
