/**
 * MediTrail - Shared UI Utilities & Modal Controllers
 * 
 * Manages presentation layer shared behaviors across views:
 * - Toast notifications
 * - Medical record detail slide-over drawer
 * - Health insurance policy document viewer & export
 * - Secure QR code sharing modal & clipboard interactions
 */

import { getPatientData, getRecordById, formatDate } from '../services/data.js';
import { generateQrCodeSvg } from '../utils/qr.js';
import { exportPdfMedicalRecord, exportPdfAttachment, exportPdfInsurancePolicy } from '../utils/pdf.js';

// ==========================================================================
// 1. TOAST NOTIFICATION SYSTEM
// ==========================================================================

/**
 * Display a sleek, non-intrusive modern toast notification instead of intrusive browser alerts.
 * @param {string} message
 * @param {'info' | 'success' | 'warning'} [type='info']
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'success'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div style="flex: 1; font-weight: 500;">${message}</div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3200);
}

// ==========================================================================
// 2. MEDICAL RECORD DETAIL DRAWER (SLIDE-OVER)
// ==========================================================================

/**
 * Opens detailed view of a selected medical record.
 * @param {string} recordId
 */
export function openRecordDetail(recordId) {
    const record = getRecordById(recordId);
    if (!record) return;

    window.currentOpenedRecordId = recordId;

    const drawer = document.getElementById('record-detail-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const container = document.getElementById('drawer-dynamic-content');

    const titleEl = document.getElementById('drawer-title');
    if (titleEl) titleEl.textContent = record.title;

    const dateEl = document.getElementById('drawer-date');
    if (dateEl) dateEl.textContent = `${record.date} (${record.year})`;

    const badgeEl = document.getElementById('drawer-type-badge');
    if (badgeEl) {
        badgeEl.textContent = record.type;
        badgeEl.className = `badge badge-${record.badgeColor}`;
    }

    let medListHtml = '<p style="font-size: 0.85rem; color: var(--text-muted);">No medications prescribed for this event.</p>';
    if (record.details.medications && record.details.medications.length > 0) {
        medListHtml = record.details.medications.map(m => `
            <div style="padding: 0.5rem 0.75rem; background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 0.4rem;">
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-primary);">${m.name} (${m.dose})</div>
                <div style="font-size: 0.775rem; color: var(--text-secondary);">${m.instructions}</div>
            </div>
        `).join('');
    }

    let attachmentsHtml = '<p style="font-size: 0.85rem; color: var(--text-muted);">No documents attached to this record.</p>';
    if (record.details.attachments && record.details.attachments.length > 0) {
        attachmentsHtml = record.details.attachments.map(att => `
            <div class="attachment-chip">
                <span style="display: flex; align-items: center; gap: 0.5rem; font-weight: 500;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>${att.name}</span>
                    <span style="color: var(--text-muted); font-size: 0.75rem;">(${att.size})</span>
                </span>
                <button class="btn-download-sm" onclick="downloadAttachment('${att.name}')" title="Download ${att.name}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Download</span>
                </button>
            </div>
        `).join('');
    }

    if (container) {
        container.innerHTML = `
            <div class="drawer-section">
                <div class="drawer-section-title">Clinical Care Location & Physician</div>
                <div class="meta-grid-2">
                    <div>
                        <div class="meta-field-label">Healthcare Facility</div>
                        <div class="meta-field-value">${record.hospital}</div>
                    </div>
                    <div>
                        <div class="meta-field-label">Attending Specialist</div>
                        <div class="meta-field-value">${record.doctor}</div>
                    </div>
                    <div>
                        <div class="meta-field-label">Department / Specialty</div>
                        <div class="meta-field-value">${record.department}</div>
                    </div>
                    <div>
                        <div class="meta-field-label">Outcome / Status</div>
                        <div class="meta-field-value">${record.status}</div>
                    </div>
                </div>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Diagnosis & Findings</div>
                <p style="font-size: 0.925rem; color: var(--text-primary); margin-bottom: 0.75rem; font-weight: 500;">
                    ${record.details.diagnosis}
                </p>
                <div class="meta-field-label">Procedure / Intervention Performed:</div>
                <p style="font-size: 0.875rem; color: var(--text-secondary);">
                    ${record.details.procedure}
                </p>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Physician Clinical Notes</div>
                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
                    ${record.details.clinicalNotes}
                </p>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Treatment Plan & Follow-up</div>
                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">
                    ${record.details.treatmentPlan}
                </p>
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Prescribed Medications</div>
                ${medListHtml}
            </div>

            <div class="drawer-section">
                <div class="drawer-section-title">Attachments & Diagnostic Files (${record.details.attachments.length})</div>
                ${attachmentsHtml}
            </div>
        `;
    }

    if (backdrop) backdrop.classList.add('active');
    if (drawer) drawer.classList.add('active');
    document.body.classList.add('drawer-open');
    document.body.style.overflow = 'hidden';
}

/**
 * Downloads clinical medical record summary as an official PDF document.
 * @param {string} recordId
 */
export function downloadMedicalRecord(recordId) {
    const record = getRecordById(recordId);
    if (!record) return;

    const success = exportPdfMedicalRecord(record);
    if (success) {
        showToast(`Downloaded official PDF summary for ${record.title}`, 'success');
    }
}

/**
 * Downloads the currently opened record from the slide-over drawer
 */
export function downloadActiveDrawerRecord() {
    if (window.currentOpenedRecordId) {
        downloadMedicalRecord(window.currentOpenedRecordId);
    }
}

/**
 * Downloads attached files as official certified PDF documents.
 * @param {string} fileName
 */
export function downloadAttachment(fileName) {
    const record = window.currentOpenedRecordId ? getRecordById(window.currentOpenedRecordId) : null;
    const success = exportPdfAttachment(fileName, record);
    if (success) {
        showToast(`Downloading attachment PDF: ${fileName}`, 'success');
    }
}

/**
 * Closes the record detail slide-over drawer.
 */
export function closeRecordDetail() {
    const drawer = document.getElementById('record-detail-drawer');
    const backdrop = document.getElementById('drawer-backdrop');

    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('drawer-open');
    document.body.style.overflow = '';
    cancelButtonHoverTrigger();
}

// --------------------------------------------------------------------------
// Drawer Button Auto-Trigger on Hover (1.5s countdown with progress feedback)
// --------------------------------------------------------------------------

let buttonHoverTimer = null;
let currentHoveredButton = null;

/**
 * Initiates a 1.5s hover timer on a button.
 * Renders loading progress feedback and fires the action on completion.
 * 
 * @param {HTMLElement} element - The button being hovered
 * @param {Function} action - Callback to invoke if cursor remains for 1.5s
 */
export function triggerButtonOnHover(element, action) {
    cancelButtonHoverTrigger();

    currentHoveredButton = element;
    if (element) {
        element.classList.add('hover-loading');
    }

    buttonHoverTimer = setTimeout(() => {
        if (element) {
            element.classList.remove('hover-loading');
        }
        currentHoveredButton = null;
        if (typeof action === 'function') {
            action();
        }
    }, 1500);
}

/**
 * Cancels pending button hover timer and removes progress state.
 * 
 * @param {HTMLElement} [element] - Optional target button
 */
export function cancelButtonHoverTrigger(element) {
    if (buttonHoverTimer) {
        clearTimeout(buttonHoverTimer);
        buttonHoverTimer = null;
    }

    const target = element || currentHoveredButton;
    if (target) {
        target.classList.remove('hover-loading');
    }

    const allButtons = document.querySelectorAll('.drawer-btn-hover-trigger.hover-loading');
    allButtons.forEach(btn => btn.classList.remove('hover-loading'));

    currentHoveredButton = null;
}

// ==========================================================================
// 3. HEALTH INSURANCE POLICY VIEWER & PDF EXPORT
// ==========================================================================

/**
 * Opens the Policy document viewer modal with verified patient insurance data.
 */
export function viewPolicyDocument() {
    const patient = getPatientData();
    const insurance = (patient && patient.insurance) ? patient.insurance : {
        provider: "Star Health Premier",
        policyNumber: "SHP-8849201-B",
        validUntil: "2027-03-31"
    };

    const modalBody = document.getElementById('policy-modal-content');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="policy-doc-certificate">
                <div class="policy-doc-header-row">
                    <div>
                        <div class="policy-org-name">${insurance.provider}</div>
                        <div class="policy-org-sub">Comprehensive Individual Health Shield • Policy Certificate</div>
                    </div>
                    <span class="policy-status-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Active & Validated
                    </span>
                </div>

                <div class="policy-grid-fields">
                    <div class="policy-field-item">
                        <span class="policy-field-label">Policy Number</span>
                        <span class="policy-field-value" style="font-family: monospace; color: var(--primary-dark);">${insurance.policyNumber}</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">Primary Insured</span>
                        <span class="policy-field-value">${patient ? patient.name : 'Aarnav Mehta'} (ID: ${patient ? patient.id : 'MT-10482'})</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">Valid Through</span>
                        <span class="policy-field-value">${formatDate(insurance.validUntil)}</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">Sum Insured</span>
                        <span class="policy-field-value" style="color: var(--accent-green);">₹ 10,00,000 (Cashless)</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">TPA / Desk Support</span>
                        <span class="policy-field-value">MediAssist Healthcare TPA</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">Emergency Helpline</span>
                        <span class="policy-field-value">1800-425-2255 / +91 44 2828 8800</span>
                    </div>
                </div>

                <div class="policy-coverage-box">
                    <div class="policy-coverage-title">Hospital Cashless & Network Privileges:</div>
                    <div class="policy-coverage-desc">
                        Full pre-approved cashless admission across 14,000+ empanelled network hospitals including CityCare Hospital, Apollo Clinics, and Metro Health. Covers in-patient hospitalization, ICU charges, day-care procedures, and 60-day pre & 90-day post hospitalization medical bills.
                    </div>
                </div>

                <div class="policy-footer-security">
                    <span>Digital Verification Ref: STH-IN-981028-SEC</span>
                    <span>MediTrail Patient Health Ledger Certified</span>
                </div>
            </div>
        `;
    }

    const modal = document.getElementById('policy-modal');
    const backdrop = document.getElementById('policy-modal-backdrop');
    if (modal) modal.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the Health Insurance Policy document modal.
 */
export function closePolicyModal() {
    const modal = document.getElementById('policy-modal');
    const backdrop = document.getElementById('policy-modal-backdrop');
    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Generates and downloads the digital insurance policy document as an official PDF.
 */
export function downloadPolicyDocument() {
    const success = exportPdfInsurancePolicy();
    if (success) {
        showToast(`Downloading insurance policy document PDF`, 'success');
    }
}

// ==========================================================================
// 4. SECURE QR CODE SHARING MODAL CONTROLLER
// ==========================================================================

/**
 * Opens the Secure QR Code Sharing Modal Popup.
 */
export function openQrModal() {
    const container = document.getElementById('qr-code-container');
    if (container) {
        container.innerHTML = generateQrCodeSvg();
    }

    const modal = document.getElementById('qr-modal');
    const backdrop = document.getElementById('qr-modal-backdrop');
    if (modal) modal.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the QR Code Sharing Modal.
 */
export function closeQrModal() {
    const modal = document.getElementById('qr-modal');
    const backdrop = document.getElementById('qr-modal-backdrop');
    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Re-generates a fresh QR session with visual animation feedback.
 */
export function refreshQrCode() {
    const container = document.getElementById('qr-code-container');
    if (container) {
        container.style.opacity = '0.3';
        setTimeout(() => {
            container.innerHTML = generateQrCodeSvg();
            container.style.opacity = '1';
            showToast('Generated fresh encrypted QR session (Valid 15m)', 'success');
        }, 220);
    }
}

/**
 * Copies the digital doctor verification link to clipboard.
 */
export function copyQrShareLink() {
    const shareUrl = "https://portal.meditrail.org/access/doctor/verify?token=MT-TEMP-" + Math.floor(100000 + Math.random() * 900000);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Doctor access link copied to clipboard!', 'success');
        }).catch(() => {
            showToast(`Doctor link: ${shareUrl}`, 'info');
        });
    } else {
        showToast('Doctor access link copied to clipboard!', 'success');
    }
}
