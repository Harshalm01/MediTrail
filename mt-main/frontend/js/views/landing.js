/**
 * MediTrail - Landing Page Experience Module
 * 
 * Manages Apple-style scroll reveal animations, section snapping,
 * floating header transitions, and section jump navigation.
 */

import { getMedicalRecords } from '../services/data.js';

/**
 * Smoothly scrolls landing page to a specific section index (1-5).
 * @param {number} sectionNumber - 1: Hero, 2: Timeline, 3: Controlled Access, 4: Core Pillars, 5: Emergency/CTA
 */
export function scrollLandingToSection(sectionNumber) {
    const sectionIds = [
        'landing-sec-hero',
        'landing-sec-timeline',
        'landing-sec-access',    // now physically slide 3
        'landing-sec-features',  // now physically slide 4
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
 * Initializes landing page Apple-style scroll reveal, floating header transformation,
 * and synchronized vertical dot scrollbar navigation.
 */
export function initLandingScrollExperience() {
    const landingContainer = document.getElementById('view-landing');
    const header = document.getElementById('landing-header');
    if (!landingContainer) return;

    // Header transformation on scroll
    landingContainer.addEventListener('scroll', () => {
        if (header) {
            if (landingContainer.scrollTop > 30) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    }, { passive: true });

    // IntersectionObserver to activate snap sections and update dot navigation
    const snapSections = landingContainer.querySelectorAll('.landing-snap-section');
    if ('IntersectionObserver' in window && snapSections.length > 0) {
        const sectionMap = {
            'landing-sec-hero': 1,
            'landing-sec-timeline': 2,
            'landing-sec-features': 3,
            'landing-sec-access': 4,
            'landing-sec-emergency': 5
        };

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    const secNum = sectionMap[entry.target.id];
                    if (secNum) {
                        updateActiveLandingDot(secNum);
                    }
                } else {
                    entry.target.classList.remove('active');
                }
            });
        }, {
            root: landingContainer,
            threshold: 0.45
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

// ==========================================================================
// 2. HERO PREVIEW DELAYED HOVER SYSTEM (1.5s Timer + Visual Progress)
// ==========================================================================

let heroHoverTimeout = null;
let currentHoveredItem = null;

/**
 * Initiates a 1.5-second hover dwell timer on a hero preview timeline item.
 * Shows a loading indicator bar while hovering, and only opens the record drawer
 * once the user has remained over the element for a full 1.5 seconds.
 * 
 * @param {string} recordId - Target record identifier
 * @param {HTMLElement} element - The preview timeline item being hovered
 */
export function handleHeroItemHover(recordId, element) {
    // Clear any pending hover timer from a previous item
    cancelHeroItemHover();

    currentHoveredItem = element;
    if (element) {
        element.classList.add('loading-preview');
    }

    // Trigger openRecordDetail only after dwelling over the element for 1.5 seconds
    heroHoverTimeout = setTimeout(() => {
        if (element) {
            element.classList.remove('loading-preview');
        }
        if (typeof window.openRecordDetail === 'function') {
            window.openRecordDetail(recordId);
        }
    }, 1500);
}

/**
 * Cancels pending hover timer and clears the loading animation when cursor leaves.
 * 
 * @param {HTMLElement} [element] - Optional specific element to reset
 */
export function cancelHeroItemHover(element) {
    if (heroHoverTimeout) {
        clearTimeout(heroHoverTimeout);
        heroHoverTimeout = null;
    }

    const targetEl = element || currentHoveredItem;
    if (targetEl) {
        targetEl.classList.remove('loading-preview');
    }

    // Clean up any remaining loading classes across all preview items (hero & section 2)
    const allPreviewItems = document.querySelectorAll('.mini-timeline-item.loading-preview, .preview-card-item.loading-preview');
    allPreviewItems.forEach(item => item.classList.remove('loading-preview'));

    currentHoveredItem = null;
}

// ==========================================================================
// 3. SECTION 2 INTERACTIVE TIMELINE PREVIEW CARD CONTROLLER
// ==========================================================================

let previewActiveFilter = 'All';

/**
 * Renders the filtered and grouped medical records inside the Section 2 preview stream.
 */
export function renderLandingTimelinePreview() {
    const container = document.getElementById('landing-timeline-container');
    if (!container) return;

    let records = [];
    try {
        records = getMedicalRecords();
    } catch {
        records = [];
    }

    // Filter by category
    const filtered = records.filter(rec => {
        return (previewActiveFilter === 'All') || (rec.category === previewActiveFilter);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.25rem 1rem; color: var(--text-muted); font-size: 0.825rem;">
                <p style="margin-bottom: 0.6rem;">No medical records match this filter criteria.</p>
                <button type="button" class="filter-pill" id="landing-preview-reset-btn" style="color: var(--primary); border-color: var(--primary); font-weight: 600;">
                    Reset Filter
                </button>
            </div>
        `;
        const resetBtn = document.getElementById('landing-preview-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                previewActiveFilter = 'All';
                const pills = document.querySelectorAll('#landing-filter-pills .filter-pill');
                pills.forEach(p => p.classList.toggle('active', p.getAttribute('data-filter') === 'All'));
                renderLandingTimelinePreview();
            };
        }
        return;
    }

    // Group by Year
    const groupedByYear = {};
    filtered.forEach(rec => {
        if (!groupedByYear[rec.year]) {
            groupedByYear[rec.year] = [];
        }
        groupedByYear[rec.year].push(rec);
    });

    const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

    let html = '';
    sortedYears.forEach((year, idx) => {
        // First year group gets active badge by default
        const isFirst = idx === 0;
        html += `
            <div class="preview-year-group" id="landing-preview-year-${year}">
                <div class="preview-year-badge${isFirst ? ' active' : ''}" data-preview-year="${year}" onclick="scrollLandingPreviewToYear('${year}')" title="Jump to ${year}" role="button" tabindex="0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <span>${year}</span>
                </div>
                <div class="preview-timeline-stem">
                    ${groupedByYear[year].map(rec => `
                        <div class="preview-timeline-node">
                            <div class="preview-timeline-bullet"></div>
                            <div class="preview-card-item" onclick="cancelHeroItemHover(this); openRecordDetail('${rec.id}');" onmouseenter="handleHeroItemHover('${rec.id}', this)" onmouseleave="cancelHeroItemHover(this)" data-record-id="${rec.id}">
                                <div class="preview-item-top">
                                    <span class="preview-item-date">${rec.date}</span>
                                    <span class="badge badge-${rec.badgeColor || 'teal'}" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">${rec.type}</span>
                                </div>
                                <div class="preview-item-title">${rec.title}</div>
                                <div class="preview-item-meta" title="${rec.hospital} • ${rec.doctor}">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 10h.01M6 14h.01M6 18h.01M18 10h.01M18 14h.01M18 18h.01M10 21V10h4v11"></path></svg>
                                    <span>${rec.hospital}</span>
                                    <span>•</span>
                                    <span>${rec.doctor}</span>
                                </div>
                                <div class="preview-item-desc">${rec.shortDescription}</div>
                                <div class="preview-item-footer">
                                    <span class="preview-status-tag">Status: ${rec.status}</span>
                                    <button class="preview-view-btn" type="button" onclick="event.stopPropagation(); cancelHeroItemHover(this.closest('.preview-card-item')); openRecordDetail('${rec.id}');">
                                        <span>View Details</span>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </button>
                                </div>
                                <div class="preview-item-progress" aria-hidden="true"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * Scrolls the Section 2 preview body to the given year group.
 * Gives a brief scale pulse on the badge as visual feedback.
 *
 * @param {string} year - The year to scroll to
 */
export function scrollLandingPreviewToYear(year) {
    const body = document.getElementById('landing-timeline-container');
    const target = document.getElementById(`landing-preview-year-${year}`);
    if (!body || !target) return;

    // Snap the year group to the top of the scrollable preview body
    const offset = target.offsetTop - body.offsetTop;
    body.scrollTo({ top: offset, behavior: 'smooth' });

    // Visual pulse on the badge for confirmation
    const badge = target.querySelector('.preview-year-badge');
    if (badge) {
        badge.style.transform = 'scale(1.12)';
        setTimeout(() => { badge.style.transform = ''; }, 280);
    }

    // Update active state immediately on click
    updatePreviewActiveBadge(year);
}

/**
 * Marks the given year badge as active and clears all others.
 * Called both on click and during scroll tracking.
 *
 * @param {string|number} year
 */
function updatePreviewActiveBadge(year) {
    const badges = document.querySelectorAll('#landing-timeline-container .preview-year-badge');
    badges.forEach(badge => {
        badge.classList.toggle('active', badge.getAttribute('data-preview-year') === String(year));
    });
}

/**
 * Initializes interactive filter pills for Section 2's Timeline Preview Card.
 * Also sets up a scroll listener to highlight the currently visible year badge.
 */
export function initTimelinePreviewCard() {
    const container = document.getElementById('landing-timeline-container');
    if (!container) return;

    // Filter pill buttons
    const filterPills = document.querySelectorAll('#landing-filter-pills .filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            previewActiveFilter = pill.getAttribute('data-filter') || 'All';
            renderLandingTimelinePreview();
        });
    });

    // Scroll listener: update active year badge and compact the filter bar while scrolling
    container.addEventListener('scroll', () => {
        // Compact the filter controls bar once we've scrolled any amount
        const controls = container.closest('.timeline-preview-card')?.querySelector('.timeline-preview-controls');
        if (controls) {
            if (container.scrollTop > 12) {
                controls.classList.add('is-scrolled');
            } else {
                controls.classList.remove('is-scrolled');
            }
        }

        // Track which year group is currently visible
        const groups = container.querySelectorAll('.preview-year-group[id]');
        let currentYear = null;
        groups.forEach(group => {
            // Consider a group "in view" once it's scrolled past the top edge of the container
            if (group.offsetTop - container.scrollTop <= container.offsetHeight * 0.35) {
                currentYear = group.id.replace('landing-preview-year-', '');
            }
        });
        if (currentYear) updatePreviewActiveBadge(currentYear);
    }, { passive: true });

    // Initial population
    renderLandingTimelinePreview();
}

/**
 * Patient Authentication Modal Controllers
 */
export function openPatientAuthModal() {
    const modal = document.getElementById('patient-auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
    }
}

export function closePatientAuthModal() {
    const modal = document.getElementById('patient-auth-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
}

export function quickFillPatientAuth() {
    const mobileInput = document.getElementById('pt-auth-mobile');
    const otpInput = document.getElementById('pt-auth-otp');
    if (mobileInput) mobileInput.value = '9876543210';
    if (otpInput) otpInput.value = '1234';
    handlePatientLoginSubmit(new Event('submit'));
}

export function handlePatientLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const mobile = (document.getElementById('pt-auth-mobile') || {}).value;
    const otp = (document.getElementById('pt-auth-otp') || {}).value;

    if (otp === '1234' || otp.length === 4) {
        sessionStorage.setItem('MEDITRAIL_PATIENT_LOGGED_IN', 'true');
        closePatientAuthModal();
        window.location.href = 'portal.html';
    } else {
        alert('Invalid OTP. Use Demo OTP "1234" to test.');
    }
}

// Attach window bridges
if (typeof window !== 'undefined') {
    window.openPatientAuthModal = openPatientAuthModal;
    window.closePatientAuthModal = closePatientAuthModal;
    window.quickFillPatientAuth = quickFillPatientAuth;
    window.handlePatientLoginSubmit = handlePatientLoginSubmit;
}



