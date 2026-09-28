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

import { initLandingScrollExperience, initTimelinePreviewCard } from './views/landing.js';
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

    // Initialize Apple-style scroll reveal and header transformation only if landing view is present
    if (hasLanding) {
        initLandingScrollExperience();
        initTimelinePreviewCard();
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

            if (ptCode && ptCode !== 'MT-10482' && ptCode !== 'MT-50298') {
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

            // Sync live records from Supabase DB
            if (window.supabase && ptCode && ptCode !== 'MT-10482' && ptCode !== 'MT-50298') {
                try {
                    const sbMod = await import(`./services/supabase.js?v=${Date.now()}`);
                    const liveRecords = await sbMod.fetchMedicalRecordsSupabase(ptCode);
                    if (liveRecords && liveRecords.length > 0) {
                        window.MEDITRAIL_DATA.timelineRecords = liveRecords;
                        console.log(`⚡ MediTrail Portal synced live records for ${ptCode} from Supabase Cloud!`);
                    }
                } catch (err) {
                    console.warn('Supabase auto-sync info:', err);
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
        carouselEl.addEventListener('wheel', handleStatCardWheel, { passive: false });
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
