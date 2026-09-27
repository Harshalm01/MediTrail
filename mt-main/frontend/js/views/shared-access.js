/**
 * MediTrail - Shared Access View Module
 * 
 * Renders and manages the list of healthcare providers with active authorizations
 * to access patient medical history records.
 */

import { getSharedAccessList } from '../services/data.js';
import { showToast } from '../core/ui.js';

/**
 * Extracts 2-letter uppercase initials from doctor name for avatar badge.
 * @param {string} name 
 * @returns {string}
 */
function getDoctorInitials(name) {
    if (!name) return 'MD';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0].slice(0, 2) || 'MD').toUpperCase();
}

/**
 * Renders list of healthcare providers with shared access permissions.
 */
export function renderSharedAccess() {
    const listContainer = document.getElementById('shared-access-list');
    if (!listContainer) return;

    const accessList = getSharedAccessList();
    listContainer.innerHTML = '';

    // Update section badge with actual count
    const badgeEl = document.getElementById('shared-access-badge-count');
    if (badgeEl) {
        badgeEl.textContent = `${accessList.length} Active Authorizations`;
    }

    if (accessList.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 2.5rem; text-align: center; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); color: var(--text-muted);">
                <p style="font-size: 0.95rem; font-weight: 500; margin-bottom: 0.25rem;">No healthcare providers granted access yet.</p>
                <p style="font-size: 0.8rem;">When an attending doctor accesses or records medical entries for your profile, their credentials will appear here.</p>
            </div>
        `;
        return;
    }

    accessList.forEach(item => {
        const initials = getDoctorInitials(item.doctorName);
        const isPermanent = item.accessExpiry && item.accessExpiry.toLowerCase().includes('permanent');

        const itemCard = document.createElement('div');
        itemCard.className = 'shared-doctor-card';

        itemCard.innerHTML = `
            <div class="shared-doctor-left">
                <div class="shared-doctor-avatar">${initials}</div>
                <div class="shared-doctor-info">
                    <div class="shared-doctor-title-line">
                        <span class="shared-doctor-name">${item.doctorName}</span>
                    </div>
                    <div class="shared-doctor-sub">
                        <span class="shared-doctor-spec">${item.specialty}</span>
                        <span class="shared-doctor-sep">•</span>
                        <span class="shared-doctor-hosp">${item.hospital}</span>
                    </div>
                    <div class="shared-doctor-meta-line">
                        <span>Scope: <span class="shared-scope-tag">${item.permissions}</span></span>
                        <span class="shared-doctor-sep">•</span>
                        <span>Granted: ${item.accessGranted}</span>
                    </div>
                </div>
            </div>

            <div class="shared-doctor-right">
                <span class="badge badge-teal">${item.status}</span>
                <span class="badge ${isPermanent ? 'badge-blue' : 'badge-neutral'}">${item.accessExpiry}</span>
                <button class="btn btn-secondary shared-revoke-btn" 
                        onclick="showToast('Revocation request logged for ${item.doctorName}', 'info')"
                        title="Revoke access for ${item.doctorName}">
                    Revoke
                </button>
            </div>
        `;
        listContainer.appendChild(itemCard);
    });
}
