# Automated Browser E2E Test Suite using Playwright for MediTrail
import asyncio
import time
from playwright.async_api import async_playwright

async def run_tests():
    print("=== Starting Playwright End-to-End Verification ===")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        # ---------------------------------------------------------------------
        # 1. Log in to designated demo account 1 (9820480534) and verify data
        # ---------------------------------------------------------------------
        print("\n--- Step 1: Demo Account 1 (9820480534 - Dev Mandora) ---")
        await page.goto("http://localhost:8000/index.html")
        await page.wait_for_load_state("networkidle")

        # Open Patient Sign In Modal
        auth_btn = page.locator("button:has-text('Patient Sign In')").first
        await auth_btn.click()
        await page.wait_for_selector("#patient-signin-form", state="visible")

        # Fill phone and demo OTP
        await page.fill("#pt-auth-mobile", "9820480534")
        await page.fill("#pt-auth-otp", "1234")
        
        # Submit sign in
        submit_btn = page.locator("#patient-signin-form button[type='submit']")
        await submit_btn.click()

        # Handle success alert modal
        await page.wait_for_selector("#custom-alert-modal", state="visible", timeout=5000)
        continue_btn = page.locator("#custom-alert-btn")
        await continue_btn.click()

        # Verify portal loaded
        await page.wait_for_url("**/portal.html", timeout=10000)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("#dash-patient-name")

        name_text = await page.locator("#dash-patient-name").inner_text()
        print(f"Rendered Patient Name: '{name_text}'")
        assert "Dev Mandora (Dummy)" in name_text, f"Expected Dev Mandora (Dummy), got: '{name_text}'"

        # Check emergency tab
        emg_tab = page.locator("a[onclick*='emergency-info'], a:has-text('Emergency')").first
        await emg_tab.click()
        await page.wait_for_timeout(500)

        page_content = await page.content()
        assert "Sunita Mehta" in page_content, "Expected demo contact Sunita Mehta in Demo 1"
        assert "Penicillin" in page_content, "Expected Penicillin allergy in Demo 1"
        assert "Star Health Premier" in page_content, "Expected Star Health Premier policy in Demo 1"
        print("[PASS] Demo Account 1 verified: Dev Mandora (Dummy) with sample data fully intact.")

        # Sign out
        sign_out_btn = page.locator("a[onclick*='handlePatientSignOut'], button[onclick*='handlePatientSignOut'], a:has-text('Sign Out')").first
        await sign_out_btn.click()
        await page.wait_for_url("**/index.html", timeout=10000)
        await page.wait_for_load_state("networkidle")

        # ---------------------------------------------------------------------
        # 2. Register a brand new user and confirm zero leaked demo data
        # ---------------------------------------------------------------------
        print("\n--- Step 2: Register Fresh Patient & Verify Clean Isolation ---")
        new_phone = f"99{int(time.time()) % 100000000:08d}"
        new_name = "Kavita Singhania"
        print(f"Registering new patient: {new_name} ({new_phone})")

        # Open Patient Auth Modal via window function
        await page.evaluate("window.openPatientAuthModal()")
        await page.wait_for_selector("#patient-auth-modal", state="visible")
        await page.wait_for_selector("#patient-signin-form", state="visible")

        # Switch to Register tab
        await page.locator("#tab-pt-register").click()
        await page.wait_for_selector("#patient-register-form", state="visible")

        # Fill registration form
        await page.fill("#pt-reg-name", new_name)
        await page.fill("#pt-reg-mobile", new_phone)
        await page.fill("#pt-reg-dob", "1997-08-20")
        await page.select_option("#pt-reg-gender", "Female")
        await page.select_option("#pt-reg-blood", "O+")

        # Submit registration
        await page.locator("#patient-register-form button[type='submit']").click()

        # Handle registration success modal (switches back to sign-in tab with prefilled mobile and OTP)
        await page.wait_for_selector("#custom-alert-modal", state="visible", timeout=5000)
        await page.locator("#custom-alert-btn").click()

        # Now submit sign in for new user
        await page.wait_for_selector("#patient-signin-form", state="visible")
        await page.locator("#patient-signin-form button[type='submit']").click()

        # Handle login success modal
        await page.wait_for_selector("#custom-alert-modal", state="visible", timeout=5000)
        await page.locator("#custom-alert-btn").click()

        # Verify portal loaded for new user
        await page.wait_for_url("**/portal.html", timeout=10000)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("#dash-patient-name")

        rendered_new_name = await page.locator("#dash-patient-name").inner_text()
        print(f"New User Dashboard Name: '{rendered_new_name}'")
        assert rendered_new_name == new_name, f"Expected '{new_name}', got '{rendered_new_name}'"
        assert "(Dummy)" not in rendered_new_name, "Real user should never have (Dummy) suffix!"

        # Check dashboard emergency contact card
        dash_content = await page.content()
        assert "Sunita Mehta" not in dash_content, "DATA LEAK: Demo contact Sunita Mehta found in new user dashboard!"
        assert "Star Health Premier" not in dash_content, "DATA LEAK: Demo insurance Star Health Premier found in new user dashboard!"

        # Check emergency view
        await page.locator("a[onclick*='emergency-info'], a:has-text('Emergency')").first.click()
        await page.wait_for_timeout(500)
        emg_content = await page.content()
        assert "Penicillin" not in emg_content, "DATA LEAK: Demo allergy Penicillin found in new user profile!"
        assert "Dust Mites" not in emg_content, "DATA LEAK: Demo allergy Dust Mites found in new user profile!"
        assert "No allergies recorded" in emg_content or "Nothing added yet" in emg_content
        print("[PASS] Clean isolation confirmed: New patient has NO demo contacts, allergies, or insurance.")

        # ---------------------------------------------------------------------
        # 3. Edit emergency information, sign out, sign back in, confirm persistence
        # ---------------------------------------------------------------------
        print("\n--- Step 3: Edit Emergency Info & Verify Persistence ---")
        edit_btn = page.locator("button:has-text('Edit Info')").first
        await edit_btn.click()
        await page.wait_for_selector("#edit-emergency-modal-overlay", state="visible", timeout=5000)

        # Fill emergency contact in modal
        await page.fill("#edit-emg-contact-name", "Vikram Singhania")
        await page.fill("#edit-emg-contact-relation", "Spouse")
        await page.fill("#edit-emg-contact-phone", "+91 9988776655")
        await page.select_option("#edit-emg-blood-group", "O+")

        # Save changes
        await page.locator("button.emg-save-btn").click()
        await page.wait_for_timeout(1000)

        # Sign out
        await page.locator("a[onclick*='handlePatientSignOut'], button[onclick*='handlePatientSignOut'], a:has-text('Sign Out')").first.click()
        await page.wait_for_url("**/index.html", timeout=10000)
        await page.wait_for_load_state("networkidle")

        # Sign back in with new_phone
        await page.evaluate("window.openPatientAuthModal()")
        await page.wait_for_selector("#patient-auth-modal", state="visible")
        await page.wait_for_selector("#patient-signin-form", state="visible")
        await page.fill("#pt-auth-mobile", new_phone)
        await page.fill("#pt-auth-otp", "1234")
        await page.locator("#patient-signin-form button[type='submit']").click()
        await page.wait_for_selector("#custom-alert-modal", state="visible", timeout=5000)
        await page.locator("#custom-alert-btn").click()

        # Check portal persistence
        await page.wait_for_url("**/portal.html", timeout=10000)
        await page.wait_for_load_state("networkidle")
        await page.locator("a[onclick*='emergency-info'], a:has-text('Emergency')").first.click()
        await page.wait_for_timeout(500)

        reloaded_content = await page.content()
        assert "Vikram Singhania" in reloaded_content, "Saved emergency contact did NOT persist across login!"
        assert "+91 9988776655" in reloaded_content, "Saved emergency phone did NOT persist across login!"
        print("[PASS] User emergency updates persisted accurately across logout and re-login.")

        # ---------------------------------------------------------------------
        # 4. Demo Account 2 (9324476116) verification
        # ---------------------------------------------------------------------
        print("\n--- Step 4: Demo Account 2 (9324476116 - Harshal Mehta) ---")
        await page.locator("a[onclick*='handlePatientSignOut'], button[onclick*='handlePatientSignOut'], a:has-text('Sign Out')").first.click()
        await page.wait_for_url("**/index.html", timeout=10000)
        await page.wait_for_load_state("networkidle")

        await page.evaluate("window.openPatientAuthModal()")
        await page.wait_for_selector("#patient-auth-modal", state="visible")
        await page.wait_for_selector("#patient-signin-form", state="visible")
        await page.fill("#pt-auth-mobile", "9324476116")
        await page.fill("#pt-auth-otp", "1234")
        await page.locator("#patient-signin-form button[type='submit']").click()
        await page.wait_for_selector("#custom-alert-modal", state="visible", timeout=5000)
        await page.locator("#custom-alert-btn").click()

        await page.wait_for_url("**/portal.html", timeout=10000)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_selector("#dash-patient-name")

        demo2_name = await page.locator("#dash-patient-name").inner_text()
        print(f"Demo 2 Dashboard Name: '{demo2_name}'")
        assert "Harshal Mehta (Dummy)" in demo2_name, f"Expected Harshal Mehta (Dummy), got: '{demo2_name}'"
        print("[PASS] Demo Account 2 verified as distinct and accurate.")

        # ---------------------------------------------------------------------
        # 5. Admin portal verification
        # ---------------------------------------------------------------------
        print("\n--- Step 5: Admin Portal Verification ---")
        await page.goto("http://localhost:8000/admin.html")
        await page.wait_for_load_state("networkidle")
        title = await page.title()
        print(f"Admin Page Title: '{title}'")
        assert "MediTrail" in title
        print("[PASS] Admin portal accessible and functioning.")

        await browser.close()
        print("\n=======================================================")
        print("ALL 5 BROWSER END-TO-END VERIFICATION CHECKS PASSED!")
        print("=======================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
