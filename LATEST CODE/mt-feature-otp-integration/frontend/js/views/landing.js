/**
 * MediTrail - Landing Page Experience Module
 * 
 * Manages Apple-style scroll reveal animations, section snapping,
 * floating header transitions, and section jump navigation.
 */

/**
 * Smoothly scrolls landing page to a specific section index (1-5).
 * @param {number} sectionNumber - 1: Hero, 2: Timeline, 3: Controlled Access, 4: Core Pillars, 5: Emergency/CTA
 */
export function scrollLandingToSection(sectionNumber) {
    const sectionIds = [
        'landing-sec-hero',
        'landing-sec-timeline',
        'landing-sec-access',
        'landing-sec-features',
        'landing-sec-emergency'
    ];
    const targetId = sectionIds[sectionNumber - 1];
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Updates the active dot indicator in the landing page vertical scroll navigation.
 * @param {number} sectionIndex - 1-based section number (1 to 5)
 */
export function updateActiveLandingDot(sectionIndex) {
    const dotItems = document.querySelectorAll('.landing-dot-item');
    dotItems.forEach(item => {
        const itemSec = parseInt(item.getAttribute('data-section'), 10);
        if (itemSec === sectionIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Initializes landing page subtle scroll reveal, floating header transformation,
 * and synchronized vertical dot scrollbar navigation.
 */
export function initLandingScrollExperience() {
    const landingContainer = document.getElementById('view-landing');
    const header = document.getElementById('landing-header');
    if (!landingContainer) return;

    const handleScroll = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop || landingContainer.scrollTop || 0;
        if (header) {
            if (scrollTop > 30) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
        
        // Calculate which section is active based on scroll position
        const triggerPoint = scrollTop + (window.innerHeight * 0.4);
        let activeSecNum = 1;
        
        const sections = [
            { id: 'landing-sec-hero', num: 1 },
            { id: 'landing-sec-timeline', num: 2 },
            { id: 'landing-sec-access', num: 3 },
            { id: 'landing-sec-features', num: 4 },
            { id: 'landing-sec-emergency', num: 5 }
        ];
        
        for (const sec of sections) {
            const el = document.getElementById(sec.id);
            if (el && el.offsetTop <= triggerPoint) {
                activeSecNum = sec.num;
            }
        }
        
        updateActiveLandingDot(activeSecNum);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    landingContainer.addEventListener('scroll', handleScroll, { passive: true });

    // IntersectionObserver to activate snap sections (CSS reveal animations)
    const snapSections = document.querySelectorAll('.landing-snap-section');
    if ('IntersectionObserver' in window && snapSections.length > 0) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                } else {
                    entry.target.classList.remove('active');
                }
            });
        }, {
            root: null,
            threshold: [0.15]
        });

        snapSections.forEach(section => sectionObserver.observe(section));

        // Immediately activate Hero section and initial dot on load
        const heroSec = document.getElementById('landing-sec-hero');
        if (heroSec) {
            heroSec.classList.add('active');
            updateActiveLandingDot(1);
        }
    } else {
        // Fallback: immediately activate all sections if IntersectionObserver is not supported
        snapSections.forEach(section => section.classList.add('active'));
    }
}

/**
 * Displays a smooth branded alert modal with custom message and actions.
 */
export function showCustomAlert(title, message, isSuccess, callback) {
    const modal = document.getElementById('custom-alert-modal');
    const titleEl = document.getElementById('custom-alert-title');
    const msgEl = document.getElementById('custom-alert-message');
    const iconEl = document.getElementById('custom-alert-icon');
    const btnEl = document.getElementById('custom-alert-btn');
    if (!modal || !titleEl || !msgEl || !iconEl || !btnEl) {
        alert(`${title}: ${message}`);
        if (callback) callback();
        return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    if (isSuccess) {
        iconEl.style.background = '#ccfbf1';
        iconEl.style.color = '#0d9488';
        iconEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: drawCheck 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; stroke-dasharray: 50; stroke-dashoffset: 50;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else {
        iconEl.style.background = '#fee2e2';
        iconEl.style.color = '#ef4444';
        iconEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line><circle cx="12" cy="12" r="10"></circle></svg>';
    }

    modal.style.display = 'flex';
    void modal.offsetWidth; // Force reflow

    modal.style.animation = 'toastFadeIn 0.3s ease forwards';
    if (modal.children[0]) {
        modal.children[0].style.animation = 'toastPopUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }
    iconEl.style.animation = 'iconBounce 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards';
    iconEl.style.opacity = '0';

    btnEl.onclick = function () {
        if (modal.children[0]) modal.children[0].style.animation = 'none';
        modal.style.animation = 'none';
        modal.style.opacity = '1';
        if (modal.children[0]) modal.children[0].style.transform = 'scale(1)';

        setTimeout(() => {
            modal.style.transition = 'opacity 0.3s ease';
            if (modal.children[0]) modal.children[0].style.transition = 'transform 0.3s ease';
            modal.style.opacity = '0';
            if (modal.children[0]) modal.children[0].style.transform = 'scale(0.9)';
            setTimeout(() => {
                modal.style.display = 'none';
                if (callback) callback();
            }, 300);
        }, 10);
    };
}

/**
 * Toggles between 'signin' and 'register' modes in the Patient Auth modal.
 */
export function switchPatientAuthMode(mode) {
    const signinForm = document.getElementById('patient-signin-form');
    const registerForm = document.getElementById('patient-register-form');
    const btnSignin = document.getElementById('tab-pt-signin');
    const btnRegister = document.getElementById('tab-pt-register');
    const slider = document.getElementById('tab-pt-slider');

    if (mode === 'register') {
        if (signinForm) signinForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (btnSignin) btnSignin.style.color = '#64748b';
        if (btnRegister) btnRegister.style.color = '#0f172a';
        if (slider) slider.style.transform = 'translateX(100%)';
    } else {
        if (registerForm) registerForm.style.display = 'none';
        if (signinForm) signinForm.style.display = 'block';
        if (btnRegister) btnRegister.style.color = '#64748b';
        if (btnSignin) btnSignin.style.color = '#0f172a';
        if (slider) slider.style.transform = 'translateX(0)';
    }
}

let resendInterval = null;

function startResendTimer(seconds = 60) {
    if (resendInterval) clearInterval(resendInterval);
    const resendBtn = document.getElementById('btn-resend-otp');
    if (!resendBtn) return;

    let remaining = seconds;
    resendBtn.disabled = true;
    resendBtn.style.color = '#94a3b8';
    resendBtn.style.cursor = 'not-allowed';
    resendBtn.textContent = `Resend in ${remaining}s`;

    resendInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(resendInterval);
            resendInterval = null;
            resendBtn.disabled = false;
            resendBtn.style.color = '#2563eb';
            resendBtn.style.cursor = 'pointer';
            resendBtn.textContent = 'Resend Code';
        } else {
            resendBtn.textContent = `Resend in ${remaining}s`;
        }
    }, 1000);
}

export function backToEmailStep(e) {
    if (e && e.preventDefault) e.preventDefault();
    const stepEmail = document.getElementById('pt-signin-step-email');
    const stepOtp = document.getElementById('pt-signin-step-otp');
    if (stepEmail) stepEmail.style.display = 'block';
    if (stepOtp) stepOtp.style.display = 'none';
    if (resendInterval) {
        clearInterval(resendInterval);
        resendInterval = null;
    }
}

/**
 * Step 1: Requests a real-time 6-digit OTP code to be sent to the patient's registered email via Brevo.
 */
export async function handlePatientRequestOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById('pt-auth-email');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email || !email.includes('@') || !email.includes('.')) {
        return showCustomAlert('Invalid Email', 'Please enter a valid registered email address.', false);
    }

    const btnRequest = document.getElementById('btn-request-otp');
    const originalText = btnRequest ? btnRequest.textContent : 'Send Verification Code →';
    if (btnRequest) {
        btnRequest.disabled = true;
        btnRequest.textContent = 'Sending Code...';
        btnRequest.style.opacity = '0.7';
    }

    try {
        if (!window.MediTrailAPI || !window.MediTrailAPI.sendPatientOtp) {
            throw new Error('API client is not ready. Please refresh the page.');
        }

        const res = await window.MediTrailAPI.sendPatientOtp(email);
        if (res && res.success) {
            // Transition to Step 2: OTP Entry
            const stepEmail = document.getElementById('pt-signin-step-email');
            const stepOtp = document.getElementById('pt-signin-step-otp');
            const targetDisplay = document.getElementById('pt-otp-target-display');
            const otpInput = document.getElementById('pt-auth-otp');

            if (stepEmail) stepEmail.style.display = 'none';
            if (stepOtp) stepOtp.style.display = 'block';
            if (targetDisplay) targetDisplay.textContent = email;
            if (otpInput) {
                otpInput.value = '';
                otpInput.focus();
            }

            const cooldown = res.cooldownSeconds || 60;
            startResendTimer(cooldown);
        } else {
            showCustomAlert('Notice', (res && res.error) || 'Unable to dispatch verification code. Please try again.', false);
        }
    } catch (err) {
        showCustomAlert('Delivery Notice', err.message || 'Unable to connect to verification service.', false);
    } finally {
        if (btnRequest) {
            btnRequest.disabled = false;
            btnRequest.textContent = originalText;
            btnRequest.style.opacity = '1';
        }
    }
}

/**
 * Resends OTP using the active email address.
 */
export async function handlePatientResendOtp(e) {
    if (e && e.preventDefault) e.preventDefault();
    await handlePatientRequestOtp(e);
}

/**
 * Step 2: Verifies the real 6-digit OTP code against the backend database.
 */
export async function handlePatientVerifyOtpSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById('pt-auth-email');
    const otpInput = document.getElementById('pt-auth-otp');

    const email = emailInput ? emailInput.value.trim() : '';
    const otp = otpInput ? otpInput.value.trim() : '';

    if (!email) {
        backToEmailStep();
        return showCustomAlert('Error', 'Please enter your registered email address.', false);
    }

    if (!otp || otp.length !== 6) {
        return showCustomAlert('Invalid Code', 'Please enter the complete 6-digit verification code sent to your email.', false);
    }

    const btnVerify = document.getElementById('btn-verify-otp');
    const originalText = btnVerify ? btnVerify.textContent : 'Verify & Unlock History →';
    if (btnVerify) {
        btnVerify.disabled = true;
        btnVerify.textContent = 'Verifying Code...';
        btnVerify.style.opacity = '0.7';
    }

    try {
        if (!window.MediTrailAPI || !window.MediTrailAPI.verifyPatientOtp) {
            throw new Error('API client is not ready. Please refresh the page.');
        }

        const apiRes = await window.MediTrailAPI.verifyPatientOtp(email, otp);
        if (apiRes && apiRes.success && apiRes.patient) {
            if (apiRes.token) {
                sessionStorage.setItem('MEDITRAIL_AUTH_TOKEN', apiRes.token);
            }
            sessionStorage.setItem('MEDITRAIL_CURRENT_PATIENT', JSON.stringify(apiRes.patient));
            sessionStorage.setItem('MEDITRAIL_PATIENT_LOGGED_IN', 'true');
            if (resendInterval) clearInterval(resendInterval);
            closePatientAuthModal();
            window.location.href = 'portal.html';
            return;
        } else {
            showCustomAlert('Verification Failed', (apiRes && apiRes.error) || 'Invalid verification code.', false);
        }
    } catch (apiErr) {
        showCustomAlert('Verification Failed', apiErr.message || 'Incorrect verification code. Please check and try again.', false);
    } finally {
        if (btnVerify) {
            btnVerify.disabled = false;
            btnVerify.textContent = originalText;
            btnVerify.style.opacity = '1';
        }
    }
}

/**
 * Handles patient registration form submission with email association.
 * Does NOT require OTP verification during registration.
 */
export async function handlePatientRegisterSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = (document.getElementById('pt-reg-name') || {}).value.trim();
    const mobile = (document.getElementById('pt-reg-mobile') || {}).value.trim();
    const email = (document.getElementById('pt-reg-email') || {}).value.trim();
    const dob = (document.getElementById('pt-reg-dob') || {}).value;
    const gender = (document.getElementById('pt-reg-gender') || {}).value;
    const checkedBlood = document.querySelector('input[name="pt-reg-blood-radio"]:checked');
    const blood = checkedBlood ? checkedBlood.value : ((document.getElementById('pt-reg-blood') || {}).value || 'B+');

    if (!name || !mobile || !email || !dob) {
        return showCustomAlert('Incomplete Form', 'Please fill in all required fields including your email address.', false);
    }

    if (!email.includes('@') || !email.includes('.')) {
        return showCustomAlert('Invalid Email', 'Please provide a valid email address for receiving verification codes.', false);
    }

    const dobYear = new Date(dob).getFullYear();
    const age = new Date().getFullYear() - dobYear;
    const patientCode = 'MT-' + Math.floor(10000 + Math.random() * 90000);

    let newPatient = {
        name: name,
        patient_code: patientCode,
        patientCode: patientCode,
        age: age || 24,
        dob: dob,
        gender: gender,
        blood_group: blood,
        bloodGroup: blood,
        phone: mobile,
        email: email.toLowerCase(),
        allergies: '',
        chronic_conditions: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
        emergencyContactPhone: '',
        insuranceProvider: '',
        policyNumber: ''
    };

    try {
        if (window.MediTrailAPI && window.MediTrailAPI.registerPatient) {
            const regRes = await window.MediTrailAPI.registerPatient(newPatient);
            if (regRes && regRes.patient) {
                newPatient = regRes.patient;
            }
        }

        showCustomAlert(
            'Registration Complete',
            `Health profile created for ${name} (${patientCode}).\n\nPlease now click "Send Verification Code" to sign in with your email.`,
            true,
            () => {
                switchPatientAuthMode('signin');
                const authEmail = document.getElementById('pt-auth-email');
                if (authEmail) authEmail.value = email;
                backToEmailStep();
            }
        );
    } catch (apiErr) {
        showCustomAlert('Registration Error', apiErr.message || 'Unable to register patient. Please verify your details.', false);
    }
}

/**
 * Patient Authentication Modal Controllers
 */
export function openPatientAuthModal() {
    const modal = document.getElementById('patient-auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        void modal.offsetWidth; // Force reflow for smooth fade-in
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }
}

export function closePatientAuthModal() {
    const modal = document.getElementById('patient-auth-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Attach window bridges for backward-compatibility with inline HTML event callers
if (typeof window !== 'undefined') {
    window.scrollLandingToSection = scrollLandingToSection;
    window.updateActiveLandingDot = updateActiveLandingDot;
    window.openPatientAuthModal = openPatientAuthModal;
    window.closePatientAuthModal = closePatientAuthModal;
    window.showCustomAlert = showCustomAlert;
    window.switchPatientAuthMode = switchPatientAuthMode;
    window.handlePatientRequestOtp = handlePatientRequestOtp;
    window.handlePatientResendOtp = handlePatientResendOtp;
    window.handlePatientVerifyOtpSubmit = handlePatientVerifyOtpSubmit;
    window.backToEmailStep = backToEmailStep;
    window.handlePatientRegisterSubmit = handlePatientRegisterSubmit;

    if (window.location.search && window.location.search.includes('auth=required')) {
        window.addEventListener('load', () => {
            openPatientAuthModal();
        });
    }
}




