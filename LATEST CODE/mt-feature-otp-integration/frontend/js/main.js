/**
 * MediTrail - Application Entry Point (main.js)
 * 
 * Orchestrates application startup, binds top-level event listeners,
 * and initializes default view states.
 */

import './app.js';
import {
    closeRecordDetail,
    closePolicyModal,
    closeQrModal
} from './core/ui.js';

import { navigateToView, selectTab } from './core/navigation.js?v=3';
import { enableDebug, disableDebug, isDebugEnabled } from './utils/debug.js';

// Expose debug controls on window scope
if (typeof window !== 'undefined') {
    window.enableDebug = enableDebug;
    window.disableDebug = disableDebug;
    window.isDebugEnabled = isDebugEnabled;
}

import {
    renderDashboard,
    handleStatCardWheel,
    handleStatCardClick,
    startStatCarouselAutoRotate,
    stopStatCarouselAutoRotate
} from './views/dashboard.js?v=3';

import { initLandingScrollExperience } from './views/landing.js';
import { closeProfileModal } from './views/emergency.js';

/**
 * Initializes MediTrail core event handlers and visual presentation.
 */
function initApp() {
    // Close drawer on backdrop click
    const backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closeRecordDetail);
    }

    // Close overlays on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeRecordDetail();
            closePolicyModal();
            closeQrModal();
            closeProfileModal();
        }
    });

    const hasLanding = !!document.getElementById('view-landing');
    const hasAppShell = !!document.getElementById('view-app-shell');

    // Initialize subtle scroll reveal and header transformation only if landing view is present
    if (hasLanding) {
        initLandingScrollExperience();
    }

    // Initial view activation based on current page
    if (hasLanding && !hasAppShell) {
        navigateToView('landing');
    } else if (hasAppShell) {
        const appShell = document.getElementById('view-app-shell');
        if (appShell) appShell.classList.add('active');

        // Apply dynamic logged in patient profile & record isolation
        import(`./services/data.js?v=${Date.now()}`).then(async (dataMod) => {
            if (dataMod.updateUiPatientProfile) dataMod.updateUiPatientProfile();

            const ptSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
            const pt = ptSession ? JSON.parse(ptSession) : null;
            const ptCode = pt ? (pt.patient_code || pt.id) : null;

            if (ptCode && ptCode !== 'MT-26926' && ptCode !== 'MT-50298') {
                // Clear pre-filled mock records for new/other patients
                window.MEDITRAIL_DATA.timelineRecords = [];
                window.MEDITRAIL_DATA.activeMedications = [];
                window.MEDITRAIL_DATA.recentReports = [];
                window.MEDITRAIL_DATA.sharedAccess = [];
            }

            // Load local records if saved
            if (ptCode) {
                const localSaved = localStorage.getItem(`MEDITRAIL_RECORDS_${ptCode}`);
                if (localSaved) {
                    try {
                        const parsed = JSON.parse(localSaved);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            window.MEDITRAIL_DATA.timelineRecords = parsed;
                        }
                    } catch (e) {}
                }
            }

            // Sync live records from Java Backend REST API
            if (window.MediTrailAPI && window.MediTrailAPI.getMedicalRecords && ptCode) {
                try {
                    const apiRecords = await window.MediTrailAPI.getMedicalRecords(ptCode);
                    if (Array.isArray(apiRecords) && apiRecords.length > 0) {
                        window.MEDITRAIL_DATA.timelineRecords = apiRecords;
                        console.log(`[MediTrail] Portal synced live records for ${ptCode} from Java Backend!`);
                    }
                } catch (apiErr) {
                    console.warn('Java API auto-sync notice:', apiErr.message);
                }
            }

            // Sync live insurance policy documents from Java Backend REST API / Cloudflare R2
            if (window.MediTrailAPI && window.MediTrailAPI.getInsurancePolicies && ptCode) {
                try {
                    const policiesRes = await window.MediTrailAPI.getInsurancePolicies(ptCode);
                    const policiesList = Array.isArray(policiesRes)
                        ? policiesRes
                        : (policiesRes && policiesRes.success && Array.isArray(policiesRes.policies) ? policiesRes.policies : []);
                    if (policiesList.length > 0) {
                        const mappedPolicies = policiesList.map(p => ({
                            id: p.id,
                            provider: p.providerName || p.provider || '',
                            fileName: p.originalFilename || p.fileName || '',
                            fileSize: p.fileSize || 0,
                            policyNumber: p.policyNumber || '',
                            validUntil: p.validUntil ? p.validUntil.slice(0, 4) : ''
                        }));
                        const primary = mappedPolicies[0];
                        const val = primary.validUntil;

                        if (window.MEDITRAIL_DATA.patient) {
                            window.MEDITRAIL_DATA.patient.policies = mappedPolicies;
                            window.MEDITRAIL_DATA.patient.insurance = {
                                id: primary.id,
                                provider: primary.provider || (primary.fileName ? primary.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') : 'Active Insurance'),
                                fileName: primary.fileName,
                                fileSize: primary.fileSize,
                                policyNumber: primary.policyNumber,
                                validUntil: val && val.length === 4 ? `${val}-12-31` : val
                            };
                        }

                        const savedSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
                        let sessionObj = savedSession ? JSON.parse(savedSession) : {};
                        sessionObj.policies = mappedPolicies;
                        sessionObj.insurance = window.MEDITRAIL_DATA.patient ? window.MEDITRAIL_DATA.patient.insurance : null;
                        sessionStorage.setItem('MEDITRAIL_CURRENT_PATIENT', JSON.stringify(sessionObj));
                        localStorage.setItem(`MEDITRAIL_PATIENT_PROFILE_${ptCode}`, JSON.stringify(sessionObj));
                        console.log(`[MediTrail] Portal synced ${mappedPolicies.length} live policy document(s) for ${ptCode}!`);
                    }
                } catch (polErr) {
                    console.warn('Java API policy auto-sync notice:', polErr.message);
                }
            }

            if (dataMod.syncDerivedPatientLists) dataMod.syncDerivedPatientLists();
            renderDashboard();
        }).catch(err => console.warn('Profile UI update:', err));

        // Support direct linking via hash (e.g. portal.html#timeline)
        const hashTab = window.location.hash.replace('#', '');
        const validTabs = ['dashboard', 'timeline', 'medications', 'shared-access', 'emergency-info'];
        selectTab(validTabs.includes(hashTab) ? hashTab : 'dashboard');
    }

    // Auto-rotate patient summary stat carousel; pause when user hovers
    const carouselEl = document.getElementById('stat-carousel-card');
    if (carouselEl) {
        carouselEl.addEventListener('mouseenter', stopStatCarouselAutoRotate);
        carouselEl.addEventListener('mouseleave', startStatCarouselAutoRotate);
        carouselEl.addEventListener('click', handleStatCardClick);
        startStatCarouselAutoRotate();
    }

    // Re-evaluate dashboard item density dynamically on viewport resize
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const dashSection = document.getElementById('section-dashboard');
            if (dashSection && !dashSection.classList.contains('hidden')) {
                renderDashboard();
            }
        }, 150);
    });

    // Floating header bars: compact on scroll
    const mainContentArea = document.querySelector('.app-content');
    if (mainContentArea) {
        mainContentArea.addEventListener('scroll', () => {
            const controlsBar = document.querySelector('.timeline-controls');
            if (controlsBar) {
                if (mainContentArea.scrollTop > 24) {
                    controlsBar.classList.add('is-scrolled');
                } else {
                    controlsBar.classList.remove('is-scrolled');
                }
            }

            const sharedControls = document.querySelector('.shared-access-controls');
            if (sharedControls) {
                if (mainContentArea.scrollTop > 24) {
                    sharedControls.classList.add('is-scrolled');
                } else {
                    sharedControls.classList.remove('is-scrolled');
                }
            }
        }, { passive: true });
    }
}

// Bootstrap upon DOM readiness
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
