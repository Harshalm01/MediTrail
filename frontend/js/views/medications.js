/**
 * MediTrail - Medications & Prescriptions View Module
 * 
 * Renders and manages dedicated clinical medication regimens, dosages,
 * prescribing physician metadata, and refill request flows.
 */

import { getActiveMedications } from '../services/data.js';
import { showToast } from '../core/ui.js';

/**
 * Renders dedicated Medications & Prescriptions page view.
 */
export function renderMedicationsView() {
    const listContainer = document.getElementById('medications-full-list');
    if (!listContainer) return;

    const medications = getActiveMedications();
    listContainer.innerHTML = '';

    // Update section badge with actual count
    const badgeEl = document.getElementById('medications-badge-count');
    if (badgeEl) {
        badgeEl.textContent = `${medications.length} Active Regimens`;
    }

    if (medications.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 2.5rem; text-align: center; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); color: var(--text-muted);">
                <p style="font-size: 0.95rem; font-weight: 500; margin-bottom: 0.25rem;">No active medications prescribed yet.</p>
                <p style="font-size: 0.8rem;">Medications prescribed by your attending doctor will automatically populate here.</p>
            </div>
        `;
        return;
    }

    medications.forEach(med => {
        const itemCard = document.createElement('div');
        itemCard.style.cssText = 'padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;';
        itemCard.innerHTML = `
            <div style="flex: 1; min-width: 250px;">
                <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.35rem;">
                    <div style="font-weight: 700; color: var(--navy); font-size: 1.05rem;">${med.name}</div>
                    <span class="badge badge-teal">Active</span>
                </div>
                <div style="font-size: 0.9rem; font-weight: 600; color: var(--primary-dark); margin-bottom: 0.4rem;">
                    Dosage: ${med.dosage} • ${med.frequency}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                    Purpose: <strong>${med.purpose}</strong>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    Prescribed by: ${med.prescribedBy} • Commenced: ${med.startDate}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
                <button class="btn btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" onclick="showToast('Refill request logged for ${med.name}', 'success')">Request Refill</button>
            </div>
        `;
        listContainer.appendChild(itemCard);
    });
}
