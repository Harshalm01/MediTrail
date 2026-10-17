# Automated Test Suite for Dedicated Patient Access OTP Flow in MediTrail
import urllib.request
import urllib.parse
import urllib.error
import json
import time
import sys
import os

BASE_URL = "http://localhost:8080"

def post_json(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
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
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.readable() else "{}"
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def run_tests():
    print("=" * 65)
    print(" MEDITRAIL PATIENT ACCESS OTP END-TO-END VERIFICATION SUITE")
    print("=" * 65)

    # 1. Health check
    print("\n[Step 1] Checking /api/health...")
    status, health = get_json("/api/health")
    assert status == 200, f"Expected 200 from /api/health, got {status}"
    assert health.get("status") == "UP", "Server is not UP"
    print(f"Health: UP | Patients: {health.get('database', {}).get('patientCount')} | Records: {health.get('database', {}).get('recordsCount')}")

    # 2. Doctor Login
    print("\n[Step 2] Authenticating Doctor (dr.kulkarni@apollo.org)...")
    status, login_res = post_json("/api/admin/login", {
        "email": "dr.kulkarni@apollo.org",
        "password": "doc123"
    })
    assert status == 200, f"Doctor login failed with status {status}: {login_res}"
    doc_token = login_res.get("token")
    assert doc_token is not None, "Missing doctor session token"
    print(f"[PASS] Doctor authenticated. Session token acquired: {doc_token[:12]}...")

    # 3. Security Gating: Attempt to access medical records BEFORE OTP verification
    print("\n[Step 3] Verifying medical records are BLOCKED before OTP verification...")
    patient_code = "MT-26926" # Dev Mandora
    status, rec_resp = get_json(f"/api/records?patientCode={patient_code}", token=doc_token)
    print(f"Direct records access attempt status: {status}, response: {rec_resp}")
    assert status == 403, f"Expected 403 Forbidden for unauthorized doctor record access, got {status}"
    assert "Patient Access OTP" in rec_resp.get("error", ""), "Expected OTP verification warning in error"
    print("[PASS] Medical records are strictly protected (403 Forbidden) prior to OTP verification.")

    # 4. Request Patient Access OTP
    print(f"\n[Step 4] Doctor requesting Patient Access OTP for patient {patient_code}...")
    status, req_otp_resp = post_json("/api/admin/patient-access/request-otp", {
        "patientCode": patient_code
    }, token=doc_token)
    print(f"Request OTP response: status {status}, body: {req_otp_resp}")
    assert status == 200, f"Expected 200 for OTP request, got {status}: {req_otp_resp}"
    assert req_otp_resp.get("success") is True, "Expected success: true"
    access_request_id = req_otp_resp.get("accessRequestId")
    masked_contact = req_otp_resp.get("maskedContact")
    debug_otp = req_otp_resp.get("debugOtp")
    assert access_request_id is not None, "Missing accessRequestId"
    assert masked_contact is not None, "Missing maskedContact"
    print(f"[PASS] OTP dispatched to {masked_contact}. Request ID: {access_request_id}")

    # 5. Test Resend Cooldown (Immediate re-request must be rate-limited)
    print("\n[Step 5] Testing Resend Cooldown (Immediate duplicate request)...")
    status, cd_resp = post_json("/api/admin/patient-access/request-otp", {
        "patientCode": patient_code
    }, token=doc_token)
    print(f"Cooldown check status: {status}, body: {cd_resp}")
    assert status == 429, f"Expected 429 Too Many Requests for cooldown, got {status}"
    assert cd_resp.get("success") is False, "Expected success: false during cooldown"
    assert "Please wait" in cd_resp.get("error", ""), "Missing cooldown message"
    print(f"[PASS] 60-second resend cooldown properly enforced (429: {cd_resp.get('error')}).")

    # 6. Test Invalid OTP Rejection
    print("\n[Step 6] Testing Invalid OTP Rejection (000000)...")
    status, err_verify = post_json("/api/admin/patient-access/verify-otp", {
        "accessRequestId": access_request_id,
        "patientCode": patient_code,
        "otp": "000000"
    }, token=doc_token)
    print(f"Invalid OTP verify status: {status}, body: {err_verify}")
    assert status == 401, f"Expected 401 for incorrect OTP, got {status}"
    assert err_verify.get("remainingAttempts") == 4, f"Expected 4 remaining attempts, got {err_verify.get('remainingAttempts')}"
    print("[PASS] Incorrect OTP rejected and attempts decremented properly.")

    # 7. Test Cross-Patient Binding (Attempt to use MT-26926 OTP for MT-50298)
    print("\n[Step 7] Testing Cross-Patient Binding Protection...")
    status, cross_resp = post_json("/api/admin/patient-access/verify-otp", {
        "accessRequestId": access_request_id,
        "patientCode": "MT-50298",
        "otp": debug_otp or "123456"
    }, token=doc_token)
    print(f"Cross-patient verify status: {status}, body: {cross_resp}")
    assert status in (400, 401), f"Expected 400 or 401 for cross-patient mismatch, got {status}"
    print("[PASS] OTP cannot be used across different patients.")

    # 8. Test Successful OTP Verification with Real Code
    print("\n[Step 8] Verifying with genuine Patient Access OTP...")
    assert debug_otp is not None, "Debug OTP required for non-production verification test"
    status, success_verify = post_json("/api/admin/patient-access/verify-otp", {
        "accessRequestId": access_request_id,
        "patientCode": patient_code,
        "otp": debug_otp
    }, token=doc_token)
    print(f"Genuine OTP verify status: {status}, body: {success_verify}")
    assert status == 200, f"Expected 200 for valid OTP, got {status}: {success_verify}"
    assert success_verify.get("success") is True, "Expected success: true"
    print(f"[PASS] Access OTP verified successfully: {success_verify.get('message')}")

    # 9. Verify Medical Records are UNLOCKED after successful OTP verification
    print("\n[Step 9] Verifying medical records are UNLOCKED after verification...")
    status, rec_resp_unlocked = get_json(f"/api/records?patientCode={patient_code}", token=doc_token)
    assert status == 200, f"Expected 200 OK after verification, got {status}: {rec_resp_unlocked}"
    assert isinstance(rec_resp_unlocked, list), "Expected list of medical records"
    print(f"[PASS] Medical records unlocked! Successfully retrieved {len(rec_resp_unlocked)} records for {patient_code}.")

    # 10. Test Single-Use OTP Consumption (Cannot reuse same OTP)
    print("\n[Step 10] Testing Single-Use OTP Consumption (Prevent replay/reuse)...")
    status, reuse_resp = post_json("/api/admin/patient-access/verify-otp", {
        "accessRequestId": access_request_id,
        "patientCode": patient_code,
        "otp": debug_otp
    }, token=doc_token)
    print(f"Reuse attempt status: {status}, body: {reuse_resp}")
    assert status == 401, f"Expected 401 for reused OTP, got {status}"
    assert "already been used" in reuse_resp.get("error", "").lower() or "invalid" in reuse_resp.get("error", "").lower(), "Expected reused message"
    print("[PASS] Replay attack prevented: Single-use OTP cannot be reused.")

    # 11. Independence Check: Patient Login OTP Flow is Unaffected
    print("\n[Step 11] Verifying Patient Login OTP flow operates completely independently...")
    status, pt_otp_resp = post_json("/api/patient/otp/send", {"email": "dev.mandora@somaiya.edu"})
    assert status == 200, f"Expected 200 for Patient Login OTP send, got {status}: {pt_otp_resp}"
    assert pt_otp_resp.get("success") is True, "Expected success for Patient Login OTP"
    print("[PASS] Patient Login OTP functions independently and remains 100% operational.")

    print("\n" + "=" * 65)
    print(" ALL 11 PATIENT ACCESS OTP VERIFICATION CHECKS PASSED (100% GREEN)!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()
