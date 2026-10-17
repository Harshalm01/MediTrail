# Regression Test Suite for MediTrail Data Isolation & Demo Lifecycle
import urllib.request
import urllib.parse
import json
import sys

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

print("=== Running MediTrail Regression Tests ===")

# Test A: New user isolation
print("\n--- Test A: New user registration & isolation ---")
import time
new_user_phone = f"99{int(time.time()) % 100000000:08d}"
reg_payload = {
    "name": "Aarav Sharma",
    "phone": new_user_phone,
    "age": 28,
    "dob": "1998-05-12",
    "gender": "Male",
    "bloodGroup": "B+",
    "allergies": "",
    "chronicConditions": "",
    "emergencyContactName": "",
    "emergencyContactRelationship": "",
    "emergencyContactPhone": "",
    "insuranceProvider": "",
    "policyNumber": ""
}
status, res = post_json("/api/patient/register", reg_payload)
if status == 409: # Already exists from previous run, sign in instead
    status, res = post_json("/api/patient/login", {"phone": new_user_phone, "otp": "1234"})

print(f"Status: {status}, Success: {res.get('success')}")
assert status in (200, 201), f"Registration/login failed: {res}"
new_patient = res.get("patient", {})
new_token = res.get("token")
new_code = new_patient.get("patientCode")
print(f"Patient Code: {new_code}, Name: {new_patient.get('name')}")

# Verify no dummy suffix for real user
assert "(Dummy)" not in new_patient.get("name"), f"Real user name should not have (Dummy): {new_patient.get('name')}"

# Verify no leaked demo contact or allergies
assert not new_patient.get("emergencyContactName"), f"Leaked contact name: {new_patient.get('emergencyContactName')}"
assert not new_patient.get("emergencyContactPhone"), f"Leaked contact phone: {new_patient.get('emergencyContactPhone')}"
assert not new_patient.get("allergies"), f"Leaked allergies: {new_patient.get('allergies')}"
assert not new_patient.get("insuranceProvider"), f"Leaked insurance: {new_patient.get('insuranceProvider')}"

# Verify empty records and medications
status, recs = get_json(f"/api/records?patientCode={new_code}", new_token)
print(f"Records count for new user: {len(recs)}")
assert len(recs) == 0, f"Expected 0 records for new user, got {len(recs)}"

status, meds = get_json(f"/api/medications?patientCode={new_code}", new_token)
print(f"Medications count for new user: {len(meds)}")
assert len(meds) == 0, f"Expected 0 medications for new user, got {len(meds)}"
print("[PASS] Test A passed: New user has completely isolated, clean empty state")

# Test B: Demo account 1 (9820480534)
print("\n--- Test B: Demo account 1 (9820480534) & baseline reset ---")
status, demo1_res = post_json("/api/patient/login", {"phone": "9820480534", "otp": "1234"})
assert status == 200, f"Demo 1 login failed: {demo1_res}"
demo1 = demo1_res.get("patient")
demo1_token = demo1_res.get("token")
print(f"Demo 1 Name: {demo1.get('name')}, Code: {demo1.get('patientCode')}")
assert demo1.get("name").endswith("(Dummy)"), f"Demo 1 name should end with (Dummy): {demo1.get('name')}"
assert demo1.get("emergencyContactPhone") == "+91 98765 43210", f"Unexpected demo contact: {demo1.get('emergencyContactPhone')}"
assert "Penicillin" in demo1.get("allergies"), f"Expected Penicillin in demo 1 allergies: {demo1.get('allergies')}"

# Edit emergency contact on Demo 1
status, update_res = post_json("/api/patient/emergency", {
    "patientCode": demo1.get("patientCode"),
    "bloodGroup": "A+",
    "allergies": "Peanuts",
    "chronicConditions": "Hypertension",
    "emergencyContactName": "Temporary Contact",
    "emergencyContactRelationship": "Friend",
    "emergencyContactPhone": "9999999999"
}, demo1_token)
print(f"Demo 1 update status: {status}")
assert status == 200

# Logout Demo 1 (triggering baseline reset)
status, logout_res = post_json("/api/patient/logout", {"patientCode": demo1.get("patientCode")}, demo1_token)
print(f"Demo 1 logout status: {status}, res: {logout_res}")
assert status == 200

# Sign in Demo 1 again and verify baseline restored
status, demo1_relogin = post_json("/api/patient/login", {"phone": "9820480534", "otp": "1234"})
demo1_restored = demo1_relogin.get("patient")
print(f"Restored Demo 1 Allergies: {demo1_restored.get('allergies')}")
print(f"Restored Demo 1 Contact Name: {demo1_restored.get('emergencyContactName')}")
assert "Penicillin" in demo1_restored.get("allergies"), "Demo 1 allergies should be restored to Penicillin"
assert demo1_restored.get("emergencyContactName") == "Sunita Mehta", "Demo 1 contact should be restored to Sunita Mehta"
assert demo1_restored.get("name") == "Dev Mandora (Dummy)", f"Demo 1 display name duplicated or incorrect: {demo1_restored.get('name')}"
print("[PASS] Test B passed: Demo 1 has sample data, (Dummy) suffix, and resets on logout")

# Test C: Demo account 2 (9324476116)
print("\n--- Test C: Demo account 2 (9324476116) distinct profile ---")
status, demo2_res = post_json("/api/patient/login", {"phone": "9324476116", "otp": "1234"})
assert status == 200, f"Demo 2 login failed: {demo2_res}"
demo2 = demo2_res.get("patient")
demo2_token = demo2_res.get("token")
print(f"Demo 2 Name: {demo2.get('name')}, Code: {demo2.get('patientCode')}")
assert demo2.get("name") == "Harshal Mehta (Dummy)", f"Expected Harshal Mehta (Dummy), got {demo2.get('name')}"
assert demo2.get("patientCode") == "MT-50298"
assert demo2.get("emergencyContactName") == "Ramesh Mehta"
post_json("/api/patient/logout", {"patientCode": demo2.get("patientCode")}, demo2_token)
print("[PASS] Test C passed: Demo 2 is distinct from Demo 1 with correct (Dummy) suffix")

# Test D: Cross-account authorization
print("\n--- Test D: Cross-account authorization rejection ---")
# Try to get demo1's records using real user's token
status, fake_recs = get_json(f"/api/records?patientCode={demo1.get('patientCode')}", new_token)
print(f"Attempting to read other patient records: status={status}")
assert status == 403, f"Expected 403 Forbidden for cross-account access, got {status}"
print("[PASS] Test D passed: Backend rejects unauthorized cross-patient record access")

# Test E: Real user data persistence
print("\n--- Test E: Real user data persistence across logout/login ---")
# Sign back into new user
status, login_res = post_json("/api/patient/login", {"phone": new_user_phone, "otp": "1234"})
new_user_token = login_res.get("token")
# Save real user emergency info
status, update_res = post_json("/api/patient/emergency", {
    "patientCode": new_code,
    "bloodGroup": "O-",
    "allergies": "Sulfa Drugs",
    "chronicConditions": "None",
    "emergencyContactName": "Pooja Sharma",
    "emergencyContactRelationship": "Spouse",
    "emergencyContactPhone": "9876500000"
}, new_user_token)
assert status == 200, f"Failed to save emergency info: {update_res}"

# Logout real user
status, _ = post_json("/api/patient/logout", {"patientCode": new_code}, new_user_token)
assert status == 200

# Log back in
status, relogin_res = post_json("/api/patient/login", {"phone": new_user_phone, "otp": "1234"})
persisted = relogin_res.get("patient")
print(f"Persisted Real User Contact: {persisted.get('emergencyContactName')}")
print(f"Persisted Real User Allergies: {persisted.get('allergies')}")
assert persisted.get("emergencyContactName") == "Pooja Sharma", "Real user contact was not persisted!"
assert persisted.get("allergies") == "Sulfa Drugs", "Real user allergies were not persisted!"
print("[PASS] Test E passed: Real user updates persist across logout and login")

print("\nALL REGRESSION TESTS PASSED!")
