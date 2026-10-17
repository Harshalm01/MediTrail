import urllib.request
import urllib.parse
import json
import base64
import sys
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

BASE_URL = "http://localhost:8080"

def post_json(path, data, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8")) if e.readable() else {}

def get_json(path, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8")) if e.readable() else {}

def delete_req(path, token=None):
    url = f"{BASE_URL}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8")) if e.readable() else {}

print("=== Running MediTrail Policies API Security & Contract Tests ===")

# 0. Verify runner.py .env loader without external dependencies
print("\n--- Test 0: Verify runner.load_env_file behavior & shell precedence ---")
import runner
import tempfile
_scratch_env = "scratch_verify.env"
with open(_scratch_env, "w", encoding="utf-8") as _f:
    _f.write("TEST_VAR_A=alpha\nTEST_VAR_B=\"beta with spaces\"\n# Comment line\nTEST_VAR_OVERRIDE=from_env_file\n")

import os
os.environ["TEST_VAR_OVERRIDE"] = "from_shell_env"
_loaded = runner.load_env_file(_scratch_env)
assert _loaded >= 2, f"Expected at least 2 loaded variables, got {_loaded}"
assert os.environ.get("TEST_VAR_A") == "alpha", f"Expected alpha, got {os.environ.get('TEST_VAR_A')}"
assert os.environ.get("TEST_VAR_B") == "beta with spaces", f"Expected beta with spaces, got {os.environ.get('TEST_VAR_B')}"
assert os.environ.get("TEST_VAR_OVERRIDE") == "from_shell_env", f"Expected shell precedence, got {os.environ.get('TEST_VAR_OVERRIDE')}"
if os.path.exists(_scratch_env):
    os.remove(_scratch_env)
print("[PASS] runner.load_env_file parses correctly and respects shell environment precedence")

# 1. Unauthenticated requests must be rejected
print("\n--- Test 1: Unauthenticated policy access ---")
s, r = get_json("/api/policies")
assert s == 401, f"Expected 401 Unauthorized for unauth GET, got {s}"
print("[PASS] Unauthenticated GET /api/policies returns 401")

s, r = post_json("/api/policies/upload", {"filename": "test.pdf", "fileData": "data:application/pdf;base64,JVBERi0="})
assert s == 401, f"Expected 401 Unauthorized for unauth POST, got {s}"
print("[PASS] Unauthenticated POST /api/policies/upload returns 401")

# 2. Login as Demo 1
print("\n--- Test 2: Authenticated policy list retrieval ---")
s, login_res = post_json("/api/patient/login", {"phone": "9820480534", "otp": "1234"})
assert s == 200, f"Login failed: {login_res}"
token = login_res["token"]
patient_code = login_res["patient"]["patientCode"]
print(f"Logged in as patient: {patient_code}")

s, policies_res = get_json("/api/policies", token)
assert s == 200, f"Expected 200 OK, got {s}"
assert policies_res.get("success") is True, f"Response success was not true: {policies_res}"
assert isinstance(policies_res.get("policies"), list), "Policies is not a list"
print(f"[PASS] Authenticated GET /api/policies returned 200 with {len(policies_res['policies'])} policies")

# 3. Non-PDF magic signature validation
print("\n--- Test 3: Reject non-PDF payload masquerading as PDF ---")
fake_pdf = base64.b64encode(b"This is not a real PDF file!").decode('ascii')
s, r = post_json("/api/policies/upload", {
    "filename": "fake.pdf",
    "fileData": f"data:application/pdf;base64,{fake_pdf}",
    "providerName": "Test Health"
}, token)
assert s == 400, f"Expected 400 Bad Request for invalid PDF bytes, got {s}: {r}"
err_msg = (r.get("error") or r.get("message") or "").lower()
assert "signature" in err_msg or "pdf" in err_msg, f"Unexpected error message: {r}"
print(f"[PASS] Server rejected invalid PDF signature: {r.get('error') or r.get('message')}")

# 4. Authentic PDF payload upload & storage behavior
print("\n--- Test 4: Authentic PDF upload handling (R2 Storage contract) ---")
valid_pdf = base64.b64encode(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF").decode('ascii')
s, r = post_json("/api/policies/upload", {
    "filename": "star_health_policy.pdf",
    "fileData": f"data:application/pdf;base64,{valid_pdf}",
    "providerName": "Star Health Premier",
    "policyNumber": "SHP-9921",
    "validUntil": "2027"
}, token)

if s == 201:
    print(f"[PASS] R2 is configured: uploaded document successfully, id={r.get('policy', {}).get('id')}")
    # Clean up created policy
    p_id = r.get("policy", {}).get("id")
    if p_id:
        ds, dr = delete_req(f"/api/policies/{p_id}", token)
        assert ds == 200, f"Failed to clean up test policy: {dr}"
        print(f"[PASS] Cleaned up policy {p_id} from R2 and database")
elif s == 503:
    err_msg = (r.get("error") or r.get("message") or "").lower()
    assert "cloudflare r2 is not configured" in err_msg, f"Expected missing R2 message: {r}"
    print(f"[PASS] R2 unconfigured: Upload failed clearly with 503 as required: {r.get('error') or r.get('message')}")
else:
    raise AssertionError(f"Unexpected status code for policy upload: {s}, response: {r}")

# 5. Non-existent document deletion
print("\n--- Test 5: Safe handling of non-existent policy deletion ---")
s, r = delete_req("/api/policies/non-existent-uuid", token)
assert s == 404, f"Expected 404 for non-existent policy, got {s}"
print("[PASS] Non-existent document deletion returned 404")

print("\nALL POLICIES API TESTS PASSED!")
