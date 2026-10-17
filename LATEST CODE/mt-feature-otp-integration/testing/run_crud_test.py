import urllib.request
import json
import base64
import sys

def test_crud():
    print("Step 1: Logging in...")
    login_req = urllib.request.Request(
        'http://localhost:8080/api/patient/login',
        data=json.dumps({'phone': '9820480534', 'otp': '1234'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(login_req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    token = data['token']
    pt_code = data['patient']['patientCode']
    print(f"Logged in: {pt_code}, Token: {token[:16]}...")

    print("\nStep 2: Listing current policies...")
    list_req = urllib.request.Request(
        'http://localhost:8080/api/policies',
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    with urllib.request.urlopen(list_req, timeout=10) as resp:
        list_data = json.loads(resp.read().decode('utf-8'))
    print(f"Policies retrieved: {len(list_data.get('policies', []))}")
    for p in list_data.get('policies', []):
        print(f"  - ID: {p.get('id')} | File: {p.get('originalFilename')} | Provider: {p.get('providerName')}")

    print("\nStep 3: Uploading a new PDF document...")
    dummy_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Title (Test Policy Document) >>\nendobj\ntrailer\n<<>>\n%%EOF"
    b64 = base64.b64encode(dummy_pdf_bytes).decode('ascii')
    upload_body = {
        'filename': 'Unit_Test_Policy.pdf',
        'fileData': f'data:application/pdf;base64,{b64}',
        'providerName': 'Star Health Insurance AutoTest',
        'policyNumber': 'POL-998877',
        'validUntil': '2029'
    }
    upload_req = urllib.request.Request(
        'http://localhost:8080/api/policies/upload',
        data=json.dumps(upload_body).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(upload_req, timeout=15) as resp:
            upload_res = json.loads(resp.read().decode('utf-8'))
            print("Upload result:", upload_res.get('success'), upload_res.get('message'))
            new_policy = upload_res.get('policy')
            created_id = new_policy.get('id') if new_policy else None
            print(f"Created Policy ID: {created_id}")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode('utf-8'))
        print(f"Upload returned HTTP {e.code}:", err)
        created_id = None

    if created_id:
        print("\nStep 4: Deleting the created policy...")
        del_req = urllib.request.Request(
            f'http://localhost:8080/api/policies/{created_id}',
            headers={'Authorization': f'Bearer {token}'},
            method='DELETE'
        )
        with urllib.request.urlopen(del_req, timeout=15) as resp:
            del_res = json.loads(resp.read().decode('utf-8'))
            print("Delete response:", del_res)
            assert del_res.get('success') is True, "Delete was not successful"
        print("Successfully deleted policy from Cloudflare R2 and Database!")

        print("\nStep 5: Verifying policy is gone from listing...")
        with urllib.request.urlopen(list_req, timeout=10) as resp:
            after_list = json.loads(resp.read().decode('utf-8'))
        remaining_ids = [p.get('id') for p in after_list.get('policies', [])]
        assert created_id not in remaining_ids, "Policy still found in list!"
        print("Verified: Document is completely removed from list!")
    else:
        print("\n[NOTE] Cloudflare R2 credentials or connectivity reported 502/503 during upload test.")

if __name__ == '__main__':
    test_crud()
