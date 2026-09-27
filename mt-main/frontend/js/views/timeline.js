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

let activeFilter = 'All';
let currentSearchQuery = '';

/**
 * Filters and groups medical records chronologically by year.
 */
export function renderTimeline() {
    const records = getMedicalRecords();
    const timelineContainer = document.getElementById('timeline-records-container');
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    // Apply Filter category & text search
    const filtered = records.filter(rec => {
        const matchesCategory = (activeFilter === 'All') || (rec.category === activeFilter);
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

        groupedByYear[year].forEach(record => {
            const cardNode = document.createElement('div');
            cardNode.className = 'timeline-card-node';

            cardNode.innerHTML = `
                <div class="timeline-bullet"></div>
                <div class="timeline-card" onclick="openRecordDetail('${record.id}')">
                    <div class="timeline-card-header">
                        <span class="timeline-date-tag">${record.date}</span>
                        <span class="badge badge-${record.badgeColor}">${record.type}</span>
                    </div>
                    <div class="timeline-card-title">${record.title}</div>
                    <div class="timeline-card-meta">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 10h.01M6 14h.01M6 18h.01M18 10h.01M18 14h.01M18 18h.01M10 21V10h4v11"></path></svg>
                            ${record.hospital}
                        </span>
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            ${record.doctor}
                        </span>
                    </div>
                    <p class="timeline-card-desc">${record.shortDescription}</p>
                    <div class="timeline-card-footer">
                        <span class="badge ${(record.status || '').toLowerCase() === 'ongoing' ? 'badge-amber' : 'badge-neutral'}">
                            ${(record.status || '').toLowerCase() === 'ongoing' ? '⏳ Status: Ongoing' : '✅ Status: Completed'}
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
 * Helper to synchronize filter pill buttons UI with active category
 * @param {string} category
 */
export function updateFilterPillsUI(category) {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.filter === category);
    });
}

/**
 * Handles category filter pill selection.
 * @param {string} category
 */
export function setTimelineFilter(category) {
    activeFilter = category;
    updateFilterPillsUI(category);
    renderTimeline();
}

/**
 * Handles search query changes.
 * @param {string} query
 */
export function handleTimelineSearch(query) {
    currentSearchQuery = query;
    renderTimeline();
}

/**
 * Clears search and category filter.
 */
export function resetTimelineFilters() {
    activeFilter = 'All';
    currentSearchQuery = '';
    const searchInput = document.getElementById('timeline-search-input');
    if (searchInput) searchInput.value = '';
    setTimelineFilter('All');
}
