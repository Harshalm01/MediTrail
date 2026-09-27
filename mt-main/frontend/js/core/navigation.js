/**
 * MediTrail - Application View Navigation & Routing Module
 * 
 * Manages view switching between Marketing Landing and Clinical Portal Shell,
 * sidebar tab selection, mobile navigation drawer state, and active section visibility.
 */

import { closeRecordDetail } from './ui.js';
import { renderDashboard, resetDashboardState } from '../views/dashboard.js?v=3';
import { renderTimeline, updateFilterPillsUI } from '../views/timeline.js';
import { renderMedicationsView } from '../views/medications.js';
import { renderSharedAccess } from '../views/shared-access.js';
import { renderEmergencyView } from '../views/emergency.js';
import { debugLog } from '../utils/debug.js';

// Global Navigation State
export let currentView = 'landing'; // 'landing' | 'app'
export let currentTab = 'dashboard'; // 'dashboard' | 'timeline' | 'medications' | 'shared-access' | 'emergency-info'

/**
 * Robust tab selection handler for the patient portal sidebar.
 * @param {string} tabKey
 */
export function selectTab(tabKey) {
    debugLog(`[MediTrail Nav] selectTab('${tabKey}') from '${currentTab}'`);
    currentTab = tabKey;

    // If called on a page without the app shell (e.g. landing index.html), navigate to portal
    const appShell = document.getElementById('view-app-shell');
    if (!appShell) {
        window.location.href = `portal.html#${tabKey}`;
        return;
    }

    // Always dismiss the record detail drawer when switching tabs
    closeRecordDetail();

    // Ensure we are in app shell mode
    const landingView = document.getElementById('view-landing');
    if (landingView) landingView.classList.remove('active');
    appShell.classList.add('active');

    // Update active highlight class on all sidebar links based on data-tab attribute
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        const isTarget = link.getAttribute('data-tab') === tabKey;
        link.classList.toggle('active', isTarget);
    });

    const dashboardSection = document.getElementById('section-dashboard');
    const timelineSection = document.getElementById('section-timeline');
    const medicationsSection = document.getElementById('section-medications');
    const sharedAccessSection = document.getElementById('section-shared-access');
    const emergencySection = document.getElementById('section-emergency-info');
    const pageTitle = document.getElementById('app-page-title');

    if (dashboardSection) dashboardSection.classList.add('hidden');
    if (timelineSection) timelineSection.classList.add('hidden');
    if (medicationsSection) medicationsSection.classList.add('hidden');
    if (sharedAccessSection) sharedAccessSection.classList.add('hidden');
    if (emergencySection) emergencySection.classList.add('hidden');

    switch (tabKey) {
        case 'dashboard':
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = "Dashboard";
            resetDashboardState();
            renderDashboard();
            break;

        case 'timeline':
            if (timelineSection) timelineSection.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = "Medical Timeline";
            const contentScrollContainer = document.querySelector('.app-content');
            if (contentScrollContainer) contentScrollContainer.scrollTop = 0;
            const controlsBar = document.querySelector('.timeline-controls');
            if (controlsBar) controlsBar.classList.remove('is-scrolled');
            updateFilterPillsUI('All');
            renderTimeline();
            break;

        case 'medications':
            if (medicationsSection) {
                medicationsSection.classList.remove('hidden');
                if (pageTitle) pageTitle.textContent = "Medications";
                renderMedicationsView();
            } else {
                if (dashboardSection) dashboardSection.classList.remove('hidden');
                if (pageTitle) pageTitle.textContent = "Medications";
                renderDashboard();
            }
            break;

        case 'shared-access':
            if (sharedAccessSection) {
                sharedAccessSection.classList.remove('hidden');
                if (pageTitle) pageTitle.textContent = "Shared Access";
                const sharedScrollContainer = document.querySelector('.app-content');
                if (sharedScrollContainer) sharedScrollContainer.scrollTop = 0;
                const sharedControlsBar = document.querySelector('.shared-access-controls');
                if (sharedControlsBar) sharedControlsBar.classList.remove('is-scrolled');
                renderSharedAccess();
            }
            break;

        case 'emergency-info':
            if (emergencySection) {
                emergencySection.classList.remove('hidden');
                if (pageTitle) pageTitle.textContent = "Emergency Info";
                renderEmergencyView();
            }
            break;

        default:
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            if (pageTitle) pageTitle.textContent = "Dashboard";
            renderDashboard();
            break;
    }

    const appContent = document.querySelector('.app-content');
    if (appContent) appContent.scrollTo({ top: 0, behavior: 'smooth' });

    toggleMobileSidebar(false);
}

/**
 * Opens or closes the mobile navigation sidebar drawer and backdrop.
 * @param {boolean} [forceOpen]
 */
export function toggleMobileSidebar(forceOpen) {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : !sidebar.classList.contains('mobile-open');

    if (shouldOpen) {
        sidebar.classList.add('mobile-open');
        if (backdrop) backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('mobile-open');
        if (backdrop) backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Switches high-level view (Landing vs App Shell).
 * @param {'landing' | 'dashboard' | 'timeline'} viewName
 */
export function navigateToView(viewName) {
    if (viewName === 'landing') {
        const landingView = document.getElementById('view-landing');
        if (landingView) {
            currentView = 'landing';
            const appShell = document.getElementById('view-app-shell');
            if (appShell) appShell.classList.remove('active');
            landingView.classList.add('active');
            landingView.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.location.href = 'index.html';
        }
    } else {
        const appShell = document.getElementById('view-app-shell');
        if (appShell) {
            currentView = 'app';
            const landingView = document.getElementById('view-landing');
            if (landingView) landingView.classList.remove('active');
            appShell.classList.add('active');
            selectTab(viewName);
        } else {
            window.location.href = `portal.html#${viewName}`;
        }
    }
}
