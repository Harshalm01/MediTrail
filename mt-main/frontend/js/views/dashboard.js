/**
 * MediTrail - Dashboard View Module
 * 
 * Manages patient summary overview cards, stat metric carousel,
 * density limits, list snapping, quick timeline strip, and auto-scroll carousel.
 */

import {
    getPatientData,
    getMedicalRecords,
    getActiveMedications,
    getRecentReports,
    getSharedAccessList,
    formatDate
} from '../services/data.js';
import { openRecordDetail } from '../core/ui.js';
import { debugLog } from '../utils/debug.js';

// ==========================================================================
// 1. PATIENT SUMMARY STAT CAROUSEL
// ==========================================================================

let currentStatIndex = 0;

/**
 * Returns structured metadata and Lucide SVG icons for the 4 key patient stats
 */
export function getPatientStatItems() {
    const patient = getPatientData();
    const records = getMedicalRecords();
    const medications = getActiveMedications();

    return [
        {
            id: 'records',
            label: 'TOTAL RECORDS',
            value: records ? records.length : 10,
            sub: 'Logged across 4 yrs',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="16" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
        },
        {
            id: 'medications',
            label: 'ACTIVE MEDICATIONS',
            value: medications ? medications.length : 2,
            sub: 'Current prescriptions',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>`
        },
        {
            id: 'hospitals',
            label: 'HOSPITALS VISITED',
            value: (patient && patient.stats) ? patient.stats.hospitalsVisited : 4,
            sub: 'Specialty facilities',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"></path><rect x="6" y="14" width="12" height="8"></rect><line x1="10" y1="6" x2="14" y2="6"></line><line x1="12" y1="4" x2="12" y2="8"></line></svg>`
        },
        {
            id: 'shared-doctors',
            label: 'SHARED DOCTORS',
            value: (patient && patient.stats) ? patient.stats.sharedDoctors : 2,
            sub: 'Granted access',
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
        }
    ];
}

/**
 * Updates the stat carousel card UI with smooth cross-fade animation.
 */
export function updateStatCarouselCard(animate = false) {
    const items = getPatientStatItems();
    if (currentStatIndex < 0) currentStatIndex = items.length - 1;
    if (currentStatIndex >= items.length) currentStatIndex = 0;

    const item = items[currentStatIndex];
    const contentEl = document.getElementById('stat-carousel-content');
    const labelEl = document.getElementById('stat-carousel-label');
    const valEl = document.getElementById('stat-carousel-val');
    const subEl = document.getElementById('stat-carousel-sub');
    const iconEl = document.getElementById('stat-carousel-icon');

    if (!labelEl || !valEl) return;

    if (animate && contentEl) {
        contentEl.classList.add('fade-out');
        setTimeout(() => {
            labelEl.textContent = item.label;
            valEl.textContent = item.value;
            if (subEl) subEl.textContent = item.sub;
            if (iconEl) iconEl.innerHTML = item.icon;
            contentEl.classList.remove('fade-out');
        }, 120);
    } else {
        labelEl.textContent = item.label;
        valEl.textContent = item.value;
        if (subEl) subEl.textContent = item.sub;
        if (iconEl) iconEl.innerHTML = item.icon;
    }

    // Update dots
    const dots = document.querySelectorAll('#stat-carousel-dots .stat-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentStatIndex);
    });
}

/**
 * Navigates to the next stat card in the carousel.
 */
export function nextStatCard(event) {
    if (event) event.stopPropagation();
    currentStatIndex = (currentStatIndex + 1) % 4;
    updateStatCarouselCard(true);
}

/**
 * Navigates to the previous stat card in the carousel.
 */
export function prevStatCard(event) {
    if (event) event.stopPropagation();
    currentStatIndex = (currentStatIndex - 1 + 4) % 4;
    updateStatCarouselCard(true);
}

/**
 * Navigates directly to a specific stat card by index.
 * @param {number} index
 */
export function goToStatCard(index) {
    currentStatIndex = (index + 4) % 4;
    updateStatCarouselCard(true);
}

/**
 * Handles clicking the current active stat card to navigate to its relevant section.
 */
export function handleStatCardClick(event) {
    if (event.target.closest('.stat-nav-btn') || event.target.closest('.stat-dot')) {
        return;
    }

    const items = getPatientStatItems();
    const currentItem = items[currentStatIndex];
    if (!currentItem) return;

    switch (currentItem.id) {
        case 'records':
            selectTab('timeline');
            break;
        case 'medications':
            selectTab('medications');
            break;
        case 'hospitals':
            selectTab('timeline');
            break;
        case 'shared-doctors':
            selectTab('shared-access');
            break;
        default:
            selectTab('timeline');
            break;
    }
}

/**
 * Handles mouse wheel scrolling over the stat carousel to rotate right or left.
 */
let wheelThrottleTimer = null;
export function handleStatCardWheel(event) {
    event.preventDefault();

    if (wheelThrottleTimer) return;
    wheelThrottleTimer = setTimeout(() => {
        wheelThrottleTimer = null;
    }, 180);

    if (event.deltaY > 0 || event.deltaX > 0) {
        nextStatCard();
    } else if (event.deltaY < 0 || event.deltaX < 0) {
        prevStatCard();
    }
}

// --------------------------------------------------------------------------
// Auto-Rotation Timer for Stat Carousel (3-second cycle, pauses on hover)
// --------------------------------------------------------------------------
let statCarouselTimer = null;

export function startStatCarouselAutoRotate() {
    stopStatCarouselAutoRotate();
    statCarouselTimer = setInterval(() => {
        currentStatIndex = (currentStatIndex + 1) % 4;
        updateStatCarouselCard(true);
    }, 3000);
}

export function stopStatCarouselAutoRotate() {
    if (statCarouselTimer) {
        clearInterval(statCarouselTimer);
        statCarouselTimer = null;
    }
}

// ==========================================================================
// 2. DASHBOARD STATE RESET & DENSITY SIZING
// ==========================================================================

let timelineAutoScrollAnimId = null;
let timelinePauseTimeout = null;
let isTimelineHovered = false;
let isTimelinePausingAtEnd = false;
const TIMELINE_AUTO_SCROLL_SPEED = 0.55; // Pixels per frame

/**
 * Fully resets all dynamic styling and animation state on dashboard elements.
 */
export function resetDashboardState() {
    debugLog('[MediTrail State] resetDashboardState()');
    const elementsToReset = [
        document.getElementById('dash-shared-access'),
        document.getElementById('dash-recent-activity'),
        document.getElementById('dash-reports-list'),
        document.getElementById('dash-medications-list'),
        document.getElementById('dash-horizontal-timeline'),
        document.getElementById('dash-timeline-body-wrap')
    ];

    elementsToReset.forEach(el => {
        if (el) {
            el.removeAttribute('style');
            el.scrollTop = 0;
            el.scrollLeft = 0;
        }
    });

    document.querySelectorAll('.activity-reports-row .card, .activity-reports-row .card-body').forEach(el => {
        el.removeAttribute('style');
    });

    if (timelineAutoScrollAnimId) {
        cancelAnimationFrame(timelineAutoScrollAnimId);
        timelineAutoScrollAnimId = null;
    }
    if (timelinePauseTimeout) {
        clearTimeout(timelinePauseTimeout);
        timelinePauseTimeout = null;
    }
    isTimelineHovered = false;
    isTimelinePausingAtEnd = false;
}

/**
 * Populates patient summary banner, vitals, active medications and recent reports.
 */
export function renderDashboard() {
    const limits = getDashboardDensityLimits();
    debugLog(`[MediTrail Dashboard] renderDashboard() | Viewport: ${window.innerWidth}x${window.innerHeight}`);
    resetDashboardState();

    const patient = getPatientData();
    const records = getMedicalRecords();
    const medications = getActiveMedications();
    const reports = getRecentReports();

    // ---- Patient Banner (minimal: name + age only) ----
    const nameEl = document.getElementById('dash-patient-name');
    if (nameEl) nameEl.textContent = patient.name;

    const avatarEl = document.getElementById('dash-patient-avatar');
    if (avatarEl) {
        const initials = patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        avatarEl.textContent = initials;
    }

    const ageEl = document.getElementById('dash-patient-age');
    if (ageEl) ageEl.textContent = `${patient.age} yrs`;

    const idEl = document.getElementById('dash-patient-id');
    if (idEl) idEl.textContent = patient.id;

    const bloodEl = document.getElementById('dash-patient-blood');
    if (bloodEl) bloodEl.textContent = patient.bloodGroup;

    // ---- Profile Details Card ----
    const setProfileField = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setProfileField('prof-patient-id', patient.id);
    setProfileField('prof-patient-dob', formatDate(patient.dob));
    setProfileField('prof-patient-gender', patient.gender);
    setProfileField('prof-patient-blood', patient.bloodGroup);

    const profAllergies = document.getElementById('prof-patient-allergies');
    if (profAllergies) {
        if (!patient.allergies || patient.allergies.length === 0) {
            profAllergies.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Nothing added yet. <a href="javascript:void(0)" onclick="openEditEmergencyModal('flags')" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a></span>`;
        } else {
            profAllergies.innerHTML = patient.allergies.map(a =>
                `<span class="condition-pill allergy-pill">${a}</span>`
            ).join('');
        }
    }

    const profConditions = document.getElementById('prof-patient-conditions');
    if (profConditions) {
        if (!patient.chronicConditions || patient.chronicConditions.length === 0) {
            profConditions.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">Nothing added yet. <a href="javascript:void(0)" onclick="openEditEmergencyModal('all')" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a></span>`;
        } else {
            profConditions.innerHTML = patient.chronicConditions.map(c =>
                `<span class="condition-pill chronic-pill">${c}</span>`
            ).join('');
        }
    }

    if (patient.insurance && (patient.insurance.provider || patient.insurance.policyNumber)) {
        setProfileField('prof-insurance-provider', patient.insurance.provider);
        setProfileField('prof-insurance-policy', patient.insurance.policyNumber);
        setProfileField('prof-insurance-valid', formatDate(patient.insurance.validUntil));
    } else {
        const provEl = document.getElementById('prof-insurance-provider');
        if (provEl) provEl.innerHTML = `Nothing added yet. <a href="javascript:void(0)" onclick="openEditEmergencyModal('all')" style="color: var(--primary); text-decoration: underline; font-weight: 500; font-size: 0.8rem;">Update it?</a>`;
        setProfileField('prof-insurance-policy', '—');
        setProfileField('prof-insurance-valid', '—');
    }

    if (patient.emergencyContact) {
        setProfileField('prof-emergency-name', patient.emergencyContact.name);
        setProfileField('prof-emergency-relation', patient.emergencyContact.relation);
        setProfileField('prof-emergency-phone', patient.emergencyContact.phone);
    }

    updateStatCarouselCard();

    // Doctors with Access
    const sharedAccessContainer = document.getElementById('dash-shared-access') || document.getElementById('dash-recent-activity');
    if (sharedAccessContainer) {
        sharedAccessContainer.innerHTML = '';
        const sharedDocs = getSharedAccessList() || [];
        if (sharedDocs.length === 0) {
            sharedAccessContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No doctors authorized yet.</div>`;
        } else {
            sharedDocs.forEach(doc => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.title = `Click to manage access permissions for ${doc.doctorName}`;
                item.onclick = () => selectTab('shared-access');
                item.innerHTML = `
                    <div class="activity-info">
                        <div class="activity-title">${doc.doctorName}</div>
                        <div class="report-meta">
                            <span class="report-meta-chip">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                                ${doc.specialty}
                            </span>
                            <span class="report-meta-chip">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${doc.hospital}
                            </span>
                        </div>
                    </div>
                    <span class="badge badge-teal">${doc.status}</span>
                `;
                sharedAccessContainer.appendChild(item);
            });
        }
    }

    // Active Medications List
    const medicationsContainer = document.getElementById('dash-medications-list');
    if (medicationsContainer) {
        medicationsContainer.innerHTML = '';
        if (medications.length === 0) {
            medicationsContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No active prescriptions prescribed yet.</div>`;
        } else {
            medications.forEach(med => {
                const card = document.createElement('div');
                card.className = 'medication-card';
                card.title = `Click to view all medications`;
                card.onclick = () => selectTab('medications');
                card.innerHTML = `
                    <div>
                        <div class="med-name">${med.name}</div>
                        <div class="med-dose">${med.dosage} — ${med.frequency}</div>
                        <div class="med-timing">For: ${med.purpose} (${med.prescribedBy})</div>
                    </div>
                    <span class="badge badge-teal">Active</span>
                `;
                medicationsContainer.appendChild(card);
            });
        }
    }

    // Diagnostic Lab Reports
    const reportsContainer = document.getElementById('dash-reports-list');
    if (reportsContainer) {
        reportsContainer.innerHTML = '';
        if (reports.length === 0) {
            reportsContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No lab diagnostic reports uploaded.</div>`;
        } else {
            reports.forEach(rep => {
                const repItem = document.createElement('div');
                repItem.className = 'activity-item';
                repItem.title = `Click to view diagnostic reports`;
                repItem.onclick = () => {
                    selectTab('timeline');
                    setTimelineFilter('Reports');
                };
                repItem.innerHTML = `
                    <div class="activity-info">
                        <div class="activity-title">${rep.title}</div>
                        <div class="report-meta">
                            <span class="report-meta-chip">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                ${rep.facility}
                            </span>
                            <span class="report-meta-chip">
                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                                ${rep.date}
                            </span>
                        </div>
                    </div>
                    <span class="badge badge-blue">${rep.status}</span>
                `;
                reportsContainer.appendChild(repItem);
            });
        }
    }

    // Horizontal Quick Medical Timeline Strip
    const timelineContainer = document.getElementById('dash-horizontal-timeline');
    if (timelineContainer) {
        timelineContainer.innerHTML = '';
        if (records.length === 0) {
            timelineContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic; width: 100%;">No medical records added yet by your attending doctor.</div>`;
        } else {
            const timelineRecords = records.slice(0, 6).reverse();

            timelineRecords.forEach((rec, index) => {
                const node = document.createElement('div');
                node.className = 'dash-timeline-node';
                node.title = `Click to view details for ${rec.title}`;
                node.onclick = () => openRecordDetail(rec.id);
                node.innerHTML = `
                    <div class="dash-timeline-node-header">
                        <div class="dash-timeline-dot-wrapper">
                            <div class="dash-timeline-dot"></div>
                            <span class="dash-timeline-step-num">${index + 1}</span>
                        </div>
                        <span class="dash-timeline-date">${rec.date}</span>
                        <span class="badge badge-${rec.badgeColor} dash-timeline-badge">${rec.type}</span>
                    </div>
                    <div class="dash-timeline-node-title">${rec.title}</div>
                    <div class="dash-timeline-node-hospital">${rec.hospital}</div>
                `;
                timelineContainer.appendChild(node);
            });

            initTimelineCarousel(timelineRecords.length);
        }
    }

    snapListHeights();
}

/**
 * Sets max-height on a scrollable flex list so it shows exactly `visibleCount` items.
 */
export function snapListHeight(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.style.maxHeight = '';
    container.style.overflowY = 'auto';
    debugLog(`[MediTrail Sizing] #${containerId} active | clientHeight=${container.clientHeight}px`);
}

/**
 * Calls snapListHeight for each dashboard scrollable list.
 */
export function snapListHeights() {
    snapListHeight('dash-shared-access');
    snapListHeight('dash-recent-activity');
    snapListHeight('dash-reports-list');
}

/**
 * Calculates how many items to display on the dashboard based on window width and height.
 */
export function getDashboardDensityLimits() {
    const height = window.innerHeight;
    const width = window.innerWidth;

    if (height >= 950 && width >= 1100) {
        return { activities: 5, reports: 5, medications: 2 };
    } else if (height >= 720 && width >= 1100) {
        return { activities: 4, reports: 4, medications: 2 };
    } else {
        return { activities: 3, reports: 3, medications: 2 };
    }
}

/**
 * Initializes continuous auto-scrolling with a 2s pause upon reaching the end.
 */
export function initTimelineCarousel(itemCount) {
    const track = document.getElementById('dash-horizontal-timeline');
    const wrap = document.getElementById('dash-timeline-body-wrap') || track;
    if (!track) return;

    if (timelineAutoScrollAnimId) {
        cancelAnimationFrame(timelineAutoScrollAnimId);
        timelineAutoScrollAnimId = null;
    }
    if (timelinePauseTimeout) {
        clearTimeout(timelinePauseTimeout);
        timelinePauseTimeout = null;
    }
    isTimelineHovered = false;
    isTimelinePausingAtEnd = false;

    wrap.onmouseenter = () => {
        isTimelineHovered = true;
    };

    wrap.onmouseleave = () => {
        isTimelineHovered = false;
    };

    let targetScrollLeft = track.scrollLeft;
    let isWheeling = false;
    let wheelAnimId = null;

    function smoothWheelScroll() {
        if (!isWheeling) return;
        const diff = targetScrollLeft - track.scrollLeft;
        if (Math.abs(diff) > 0.5) {
            track.scrollLeft += diff * 0.18;
            wheelAnimId = requestAnimationFrame(smoothWheelScroll);
        } else {
            track.scrollLeft = targetScrollLeft;
            isWheeling = false;
        }
    }

    track.onwheel = (e) => {
        if (track.scrollWidth > track.clientWidth) {
            e.preventDefault();
            const delta = Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY;
            const maxScrollLeft = track.scrollWidth - track.clientWidth;
            targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, (isWheeling ? targetScrollLeft : track.scrollLeft) + delta * 1.15));
            isWheeling = true;
            if (!wheelAnimId) {
                wheelAnimId = requestAnimationFrame(smoothWheelScroll);
            }
        }
    };

    function stepAutoScroll() {
        if (!isTimelineHovered && !isTimelinePausingAtEnd && !isWheeling && track.scrollWidth > track.clientWidth) {
            track.scrollLeft += TIMELINE_AUTO_SCROLL_SPEED;

            const maxScrollLeft = track.scrollWidth - track.clientWidth;
            if (track.scrollLeft >= maxScrollLeft - 1) {
                isTimelinePausingAtEnd = true;
                timelinePauseTimeout = setTimeout(() => {
                    if (track) {
                        track.scrollTo({ left: 0, behavior: 'smooth' });
                    }
                    setTimeout(() => {
                        isTimelinePausingAtEnd = false;
                    }, 650);
                }, 2000);
            }
        }
        timelineAutoScrollAnimId = requestAnimationFrame(stepAutoScroll);
    }

    timelineAutoScrollAnimId = requestAnimationFrame(stepAutoScroll);
}

// Global DevTools helper
window.debugMediTrailDashboard = function () {
    debugLog('[MediTrail Diagnostic Inspector] Current Dashboard State');
    ['dash-shared-access', 'dash-recent-activity', 'dash-reports-list', 'dash-medications-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const card = el.closest('.card');
            const cardBody = el.closest('.card-body');
            debugLog(`#${id}:`, {
                inlineMaxHeight: el.style.maxHeight || '(none)',
                inlineOverflow: el.style.overflow || '(none)',
                clientHeight: el.clientHeight,
                scrollHeight: el.scrollHeight,
                clientWidth: el.clientWidth,
                isOverflowing: el.scrollHeight > el.clientHeight,
                overflowDiffPx: el.scrollHeight - el.clientHeight,
                childrenCount: el.children.length,
                cardHeight: card ? card.offsetHeight : null,
                cardBodyHeight: cardBody ? cardBody.offsetHeight : null
            });
        }
    });
};

// Re-measure on resize so zoom-level or window changes don't break snap heights
window.addEventListener('resize', () => {
    clearTimeout(window._snapResizeTimer);
    window._snapResizeTimer = setTimeout(() => snapListHeights(), 120);
});