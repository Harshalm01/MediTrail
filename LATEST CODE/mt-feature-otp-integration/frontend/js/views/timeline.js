/**
 * MediTrail - Medical Timeline View Module
 * 
 * Filters, groups, and renders patient medical history chronologically by year.
 * Handles category filter pills, keyword search, year section jumping, and card interactions.
 */

import { getMedicalRecords } from '../services/data.js';
import {
    openRecordDetail,
    downloadMedicalRecord
} from '../core/ui.js';

let activeFilters = new Set(['All']);
let currentSearchQuery = '';

/**
 * Returns a tailored pill color variant for any given medical record type / category.
 * @param {string} type - e.g. 'Checkup', 'Diagnostic', 'Surgery', 'Vaccination', 'Donation'
 * @param {string} [category] - e.g. 'Treatments', 'Reports', 'Surgeries'
 * @returns {string} - color keyword matching a CSS .badge-* class
 */
export function getBadgeColorForType(type, category = '') {
    const normType = (type || '').toLowerCase();
    const normCat = (category || '').toLowerCase();

    if (normType.includes('checkup') || normType.includes('wellness') || normType.includes('consultation')) {
        return 'teal';
    }
    if (normType.includes('diagnostic') || normType.includes('lab') || normType.includes('blood') || normCat.includes('reports')) {
        return 'blue';
    }
    if (normType.includes('surgery') || normType.includes('procedure') || normCat.includes('surgeries')) {
        return 'rose';
    }
    if (normType.includes('vaccin') || normType.includes('immuniz') || normCat.includes('vaccinations')) {
        return 'green';
    }
    if (normType.includes('donation') || normType.includes('blood donor') || normCat.includes('donations')) {
        return 'purple';
    }
    if (normType.includes('emergency') || normType.includes('acute') || normType.includes('allergy')) {
        return 'amber';
    }
    if (normType.includes('therapy') || normType.includes('treatment') || normCat.includes('treatments')) {
        return 'indigo';
    }
    if (normType.includes('radiology') || normType.includes('x-ray') || normType.includes('mri') || normType.includes('scan')) {
        return 'cyan';
    }
    return 'teal';
}

/**
 * Filters and groups medical records chronologically by year.
 */
export function renderTimeline() {
    const records = getMedicalRecords();
    const timelineContainer = document.getElementById('timeline-records-container');
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    // Apply Filter category & text search (supports single or multi-selected categories)
    const filtered = records.filter(rec => {
        const matchesCategory = activeFilters.has('All') || activeFilters.has(rec.category);
        const searchTarget = `${rec.title} ${rec.hospital} ${rec.doctor} ${rec.shortDescription}`.toLowerCase();
        const matchesSearch = searchTarget.includes(currentSearchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        timelineContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: #ffffff; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                <p style="font-size: 1rem; color: var(--text-muted); margin-bottom: 1rem;">No medical records match the selected criteria.</p>
                <button class="btn btn-secondary" onclick="resetTimelineFilters()">Reset Filters</button>
            </div>
        `;
        return;
    }

    // Group records by Year
    const groupedByYear = {};
    filtered.forEach(rec => {
        if (!groupedByYear[rec.year]) {
            groupedByYear[rec.year] = [];
        }
        groupedByYear[rec.year].push(rec);
    });

    // Sort years descending (newest first)
    const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

    sortedYears.forEach(year => {
        const yearGroup = document.createElement('div');
        yearGroup.className = 'timeline-year-group';
        yearGroup.id = `timeline-year-${year}`;

        const yearBadge = document.createElement('div');
        yearBadge.className = 'year-marker';
        yearBadge.setAttribute('role', 'button');
        yearBadge.setAttribute('tabindex', '0');
        yearBadge.setAttribute('title', `Click to scroll to beginning of ${year}`);
        yearBadge.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${year}
        `;

        // Clicking the floating year badge scrolls smoothly to the start of that year's records
        yearBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            scrollToYearSection(year);
        });

        yearGroup.appendChild(yearBadge);

        const stem = document.createElement('div');
        stem.className = 'timeline-stem';

        const parseEventDate = (dateStr) => {
            const ts = Date.parse(dateStr);
            return isNaN(ts) ? 0 : ts;
        };

        const yearRecords = [...groupedByYear[year]].sort((a, b) => {
            return parseEventDate(b.date) - parseEventDate(a.date);
        });

        yearRecords.forEach(record => {
            const cardNode = document.createElement('div');
            cardNode.className = 'timeline-card-node';

            // Resolve badge color fallback dynamically if record doesn't have an explicit badgeColor
            const resolvedBadgeColor = record.badgeColor || getBadgeColorForType(record.type, record.category);

            cardNode.innerHTML = `
                <div class="timeline-bullet"></div>
                <div class="timeline-card" onclick="openRecordDetail('${record.id}')">
                    <div class="timeline-card-header">
                        <span class="timeline-date-tag">${record.date}</span>
                        <span class="badge badge-${resolvedBadgeColor}">${record.type}</span>
                    </div>
                    <div class="timeline-card-title">${highlightSearchTerms(record.title, currentSearchQuery)}</div>
                    <div class="timeline-card-meta">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 10h.01M6 14h.01M6 18h.01M18 10h.01M18 14h.01M18 18h.01M10 21V10h4v11"></path></svg>
                            ${highlightSearchTerms(record.hospital, currentSearchQuery)}
                        </span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            ${highlightSearchTerms(record.doctor, currentSearchQuery)}
                        </span>
                    </div>
                    <p class="timeline-card-desc">${highlightSearchTerms(record.shortDescription, currentSearchQuery)}</p>
                    <div class="timeline-card-footer">
                        <span class="badge ${(record.status || '').toLowerCase() === 'ongoing' ? 'badge-amber' : 'badge-neutral'}" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                            ${(record.status || '').toLowerCase() === 'ongoing' 
                                ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg> Status: Ongoing' 
                                : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Status: Completed'}
                        </span>
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <button class="btn-download-sm" onclick="event.stopPropagation(); downloadMedicalRecord('${record.id}');" title="Download Official Summary">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>Download Report</span>
                            </button>
                            <button class="btn-view-sm" onclick="event.stopPropagation(); openRecordDetail('${record.id}');" title="View Full Record Details">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                <span>View Details</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            stem.appendChild(cardNode);
        });

        yearGroup.appendChild(stem);
        timelineContainer.appendChild(yearGroup);
    });
}

/**
 * Smoothly scrolls the timeline to the start of the selected year section.
 * @param {string|number} year
 */
export function scrollToYearSection(year) {
    const targetGroup = document.getElementById(`timeline-year-${year}`);
    if (!targetGroup) return;

    // Smoothly scroll the year section into view with offset for the floating header
    targetGroup.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });

    // Provide a subtle feedback pulse on the year badge
    const badge = targetGroup.querySelector('.year-marker');
    if (badge) {
        badge.style.transform = 'scale(1.08)';
        setTimeout(() => {
            badge.style.transform = '';
        }, 300);
    }
}

/**
 * Helper to synchronize filter pill buttons UI with the active categories.
 */
export function updateFilterPillsUI() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        const cat = pill.dataset.filter;
        pill.classList.toggle('active', activeFilters.has(cat));
    });
}

/**
 * Handles category filter pill selection.
 * - Regular Click: Selects only that category (clearing previous filters).
 * - Ctrl+Click / Cmd+Click: Toggles that category on/off (multi-selection).
 * - Clicking 'All': Always resets selection back to 'All Events'.
 * @param {string} category
 * @param {MouseEvent} [event]
 */
export function setTimelineFilter(category, event) {
    const isMultiSelect = event && (event.ctrlKey || event.metaKey);

    if (category === 'All') {
        activeFilters.clear();
        activeFilters.add('All');
    } else if (isMultiSelect) {
        // Multi-select mode with Ctrl / Cmd click:
        activeFilters.delete('All');
        if (activeFilters.has(category)) {
            activeFilters.delete(category);
            // If user unselects all individual filters, default back to 'All'
            if (activeFilters.size === 0) {
                activeFilters.add('All');
            }
        } else {
            activeFilters.add(category);
        }
    } else {
        // Standard single click: isolate to this category
        activeFilters.clear();
        activeFilters.add(category);
    }

    updateFilterPillsUI();
    renderTimeline();
}

/**
 * Helper to escape regex special characters.
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wraps matching query terms in <mark class="search-match-highlight">.
 */
function highlightSearchTerms(text, query) {
    if (!text || !query) return text || '';
    const trimmed = query.trim();
    if (!trimmed) return text;
    try {
        const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'gi');
        return text.replace(regex, '<mark class="search-match-highlight">$1</mark>');
    } catch {
        return text;
    }
}

/**
 * Updates search wrapper state classes (has-value) based on query string.
 */
function updateSearchWrapperState(query) {
    const wrapper = document.getElementById('timeline-search-box-wrapper');
    if (!wrapper) return;
    if (query && query.trim().length > 0) {
        wrapper.classList.add('has-value');
    } else {
        wrapper.classList.remove('has-value');
    }
}

/**
 * Handles search query changes.
 * @param {string} query
 */
let searchDebounceTimer = null;
export function handleTimelineSearch(query) {
    currentSearchQuery = query || '';
    updateSearchWrapperState(currentSearchQuery);

    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
    // Subtle 40ms debounce gives silky responsive input feeling
    searchDebounceTimer = setTimeout(() => {
        renderTimeline();
    }, 40);
}

/**
 * Clears search input and refreshes the timeline.
 */
export function clearTimelineSearch() {
    currentSearchQuery = '';
    const searchInput = document.getElementById('timeline-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    updateSearchWrapperState('');
    renderTimeline();
}

/**
 * Clears search and category filter.
 */
export function resetTimelineFilters() {
    activeFilters.clear();
    activeFilters.add('All');
    currentSearchQuery = '';
    const searchInput = document.getElementById('timeline-search-input');
    if (searchInput) searchInput.value = '';
    updateSearchWrapperState('');
    setTimelineFilter('All');
}

// Global keyboard shortcuts for timeline:
// - Pressing '/' focuses the search bar
// - Pressing 'Escape' resets search input or resets all filters back to 'All Events'
if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
        const timelineSection = document.getElementById('section-timeline');
        const isTimelineActive = timelineSection && !timelineSection.classList.contains('hidden');

        if (e.key === '/') {
            if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && isTimelineActive) {
                const searchInput = document.getElementById('timeline-search-input');
                if (searchInput) {
                    e.preventDefault();
                    searchInput.focus();
                    searchInput.select();
                }
            }
        } else if (e.key === 'Escape') {
            // Check if any modal or drawer is open first; if so, let the modal close handler take precedence
            const drawerOpen = document.getElementById('record-drawer')?.classList.contains('open');
            const modalOpen = document.querySelector('.modal-wrapper:not(.hidden)');
            if (drawerOpen || modalOpen) return;

            if (isTimelineActive) {
                const searchInput = document.getElementById('timeline-search-input');
                const hasSearch = currentSearchQuery && currentSearchQuery.trim().length > 0;
                const hasCategoryFilter = !activeFilters.has('All') || activeFilters.size > 1;

                // If user is searching or has filters active, Escape resets everything cleanly
                if (hasSearch || hasCategoryFilter || document.activeElement === searchInput) {
                    if (document.activeElement === searchInput) {
                        searchInput.blur();
                    }
                    resetTimelineFilters();
                }
            }
        }
    });
}
