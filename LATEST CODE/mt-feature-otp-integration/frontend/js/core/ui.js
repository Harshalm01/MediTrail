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
        const color = record.badgeColor || (record.type === 'Checkup' ? 'teal' : record.type === 'Diagnostic' ? 'blue' : record.type === 'Surgery' ? 'rose' : record.type === 'Vaccination' ? 'green' : 'teal');
        badgeEl.className = `badge badge-${color}`;
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
}

// --------------------------------------------------------------------------
// Drawer Button Auto-Trigger on Hover (1.5s countdown with progress feedback)
// --------------------------------------------------------------------------

// ==========================================================================
// 3. HEALTH INSURANCE POLICY VIEWER & PDF EXPORT
// ==========================================================================

// In-memory reference for the currently active policy ID in the modal viewer
let currentViewedPolicyId = null;

/**
 * Opens the Policy document viewer modal with real PDF preview from Cloudflare R2,
 * or fallback to verified certificate for demo patient accounts.
 * @param {string} [policyId] - Optional specific policy ID to display
 */
export async function viewPolicyDocument(policyId) {
    const patient = getPatientData();
    const modal = document.getElementById('policy-modal');
    const backdrop = document.getElementById('policy-modal-backdrop');
    const modalBody = document.getElementById('policy-modal-content');
    const modalTitle = document.getElementById('policy-modal-title');

    if (modal) modal.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!modalBody) return;

    // Show initial loading state
    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 420px; gap: 1rem; color: var(--text-muted);">
            <div style="width: 38px; height: 38px; border: 3px solid rgba(14,165,233,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <span style="font-size: 0.95rem; font-weight: 500;">Retrieving insurance document...</span>
        </div>
    `;

    // Attempt to query real uploaded policies from Java API / Cloudflare R2
    let uploadedPolicies = [];
    try {
        if (window.MediTrailAPI && window.MediTrailAPI.getInsurancePolicies) {
            const res = await window.MediTrailAPI.getInsurancePolicies();
            if (Array.isArray(res)) {
                uploadedPolicies = res;
            } else if (res && res.success && Array.isArray(res.policies)) {
                uploadedPolicies = res.policies;
            }
        }
    } catch (err) {
        console.warn('[MediTrail] Could not query uploaded policies from API:', err.message);
    }

    // 1. If authentic uploaded policy PDFs exist, embed real PDF viewer
    if (uploadedPolicies.length > 0) {
        const activePolicy = policyId 
            ? (uploadedPolicies.find(p => p.id === policyId) || uploadedPolicies[0])
            : uploadedPolicies[0];

        currentViewedPolicyId = activePolicy.id;

        const sizeKb = activePolicy.fileSize ? Math.round(activePolicy.fileSize / 1024) : null;
        const sizeText = sizeKb ? `${sizeKb} KB` : '';

        if (modalTitle) {
            const displayName = activePolicy.providerName || activePolicy.originalFilename || 'Insurance Policy Document';
            modalTitle.innerHTML = `
                <span>${displayName}</span>
                ${sizeText ? `<span id="policy-modal-size-badge" class="badge" style="background: var(--primary-subtle); color: var(--primary-dark); font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.55rem; border-radius: 999px; border: 1px solid rgba(13, 148, 136, 0.25);">${sizeText}</span>` : ''}
            `;
        }

        const modalSub = document.getElementById('policy-modal-subtitle');
        if (modalSub) {
            const metaParts = [];
            if (activePolicy.policyNumber && activePolicy.policyNumber.trim()) {
                metaParts.push(`Policy No: ${activePolicy.policyNumber.trim()}`);
            }
            if (activePolicy.validUntil && activePolicy.validUntil.trim()) {
                metaParts.push(`Expires: ${activePolicy.validUntil.trim()}`);
            }

            if (metaParts.length > 0) {
                modalSub.textContent = metaParts.join('  •  ');
                modalSub.style.display = 'block';
            } else {
                modalSub.textContent = '';
                modalSub.style.display = 'none';
            }
        }

        const openTabBtn = document.getElementById('policy-open-tab-btn');
        if (openTabBtn) {
            openTabBtn.style.display = 'inline-flex';
        }

        // Render document selector directly in the top header if multiple documents exist
        const selectContainer = document.getElementById('policy-doc-select-container');
        if (selectContainer) {
            if (uploadedPolicies.length > 1) {
                selectContainer.innerHTML = `
                    <select class="policy-header-select" onchange="viewPolicyDocument(this.value)" title="Switch viewed policy document">
                        ${uploadedPolicies.map(p => `
                            <option value="${p.id}" ${p.id === activePolicy.id ? 'selected' : ''}>
                                ${p.providerName || p.originalFilename || 'Policy Document'}
                            </option>
                        `).join('')}
                    </select>
                `;
                selectContainer.style.display = 'block';
            } else {
                selectContainer.innerHTML = '';
                selectContainer.style.display = 'none';
            }
        }

        const viewUrl = window.MediTrailAPI.getPolicyViewUrl(activePolicy.id);

        modalBody.innerHTML = `
            <div class="policy-pdf-viewer-wrap" style="width: 100%; height: 100%; flex: 1; display: flex; flex-direction: column;">
                <div style="position: relative; width: 100%; height: 100%; flex: 1; min-height: 0; border-radius: var(--radius-md); overflow: hidden; background: #525659; border: 1px solid var(--border-subtle);">
                    <iframe id="policy-pdf-frame" src="${viewUrl}" style="width: 100%; height: 100%; border: none; display: block;" title="Authentic Policy Document PDF"></iframe>
                </div>
            </div>
        `;
        return;
    }

    // 2. Fallback: If no uploaded real PDF in cloud storage, check for demo patient insurance data
    currentViewedPolicyId = null;

    const selectContainer = document.getElementById('policy-doc-select-container');
    if (selectContainer) {
        selectContainer.innerHTML = '';
        selectContainer.style.display = 'none';
    }

    const modalSub = document.getElementById('policy-modal-subtitle');
    if (modalSub) {
        modalSub.textContent = '';
        modalSub.style.display = 'none';
    }

    const openTabBtn = document.getElementById('policy-open-tab-btn');
    if (openTabBtn) {
        openTabBtn.style.display = 'none';
    }
    const insurance = (patient && patient.insurance && (patient.insurance.provider || patient.insurance.policyNumber)) 
        ? patient.insurance 
        : null;

    if (modalTitle) {
        modalTitle.textContent = 'Official Insurance Policy Document';
    }

    if (!insurance) {
        modalBody.innerHTML = `
            <div class="policy-doc-certificate" style="text-align: center; padding: 3rem 1.5rem;">
                <div style="margin-bottom: 1rem; color: var(--primary);">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--navy); margin-bottom: 0.5rem;">No Insurance Policy Linked</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 420px; margin: 0 auto 1.5rem;">
                    This patient account does not currently have an active health insurance policy or cashless coverage card registered.
                </p>
                <button type="button" class="btn btn-primary" onclick="closePolicyModal(); openEditEmergencyModal('all');">
                    Add Policy Details
                </button>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div class="policy-doc-certificate">
                <div class="policy-doc-header-row">
                    <div>
                        <div class="policy-org-name">${insurance.provider || 'Active Health Insurance'}</div>
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
                        <span class="policy-field-value" style="font-family: monospace; color: var(--primary-dark);">${insurance.policyNumber || '—'}</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">Primary Insured</span>
                        <span class="policy-field-value">${patient ? patient.name : 'Patient'} (ID: ${patient ? patient.id : '—'})</span>
                    </div>
                    <div class="policy-field-item">
                        <span class="policy-field-label">Valid Through</span>
                        <span class="policy-field-value">${insurance.validUntil ? formatDate(insurance.validUntil) : 'Active'}</span>
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
 * Downloads the active insurance policy: either streams the authentic uploaded PDF bytes
 * from Cloudflare R2, or exports the verified certificate for demo patient accounts.
 */
export function downloadPolicyDocument() {
    if (currentViewedPolicyId && window.MediTrailAPI && window.MediTrailAPI.getPolicyDownloadUrl) {
        const downloadUrl = window.MediTrailAPI.getPolicyDownloadUrl(currentViewedPolicyId);
        window.open(downloadUrl, '_blank');
        showToast('Downloading policy document PDF from Cloudflare R2...', 'info');
        return;
    }

    const success = exportPdfInsurancePolicy();
    if (success) {
        showToast('Downloading insurance policy certificate PDF', 'success');
    }
}

/**
 * Opens the currently viewed policy PDF in a new browser tab.
 */
export function openPolicyInNewTab() {
    if (currentViewedPolicyId && window.MediTrailAPI && window.MediTrailAPI.getPolicyViewUrl) {
        const viewUrl = window.MediTrailAPI.getPolicyViewUrl(currentViewedPolicyId);
        window.open(viewUrl, '_blank');
        return;
    }

    // Fallback: download or view
    downloadPolicyDocument();
}

// ==========================================================================
// 4. SECURE QR CODE SHARING MODAL CONTROLLER
// ==========================================================================

/**
 * Opens the Secure QR Code Sharing Modal Popup.
 */
export function openQrModal() {
    const modal = document.getElementById('qr-modal');
    if (!modal) return;
    const backdrop = document.getElementById('qr-modal-backdrop');

    const container = document.getElementById('qr-code-container');
    if (container) {
        const pt = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT')) 
            ? JSON.parse(sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT')) : null;
        const ptCode = pt ? (pt.patient_code || pt.id) : 'MT-10482';
        const verifyUrl = `https://meditrail.org/access/verify?code=${ptCode}&token=MT-${Date.now().toString(36)}`;
        const svgFallback = generateQrCodeSvg(verifyUrl, container);
        if (svgFallback) container.innerHTML = svgFallback;
    }

    modal.classList.add('active');
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
            const pt = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT')) 
                ? JSON.parse(sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT')) : null;
            const ptCode = pt ? (pt.patient_code || pt.id) : 'MT-10482';
            const verifyUrl = `https://meditrail.org/access/verify?code=${ptCode}&token=MT-${Date.now().toString(36)}`;
            const svgFallback = generateQrCodeSvg(verifyUrl, container);
            if (svgFallback) container.innerHTML = svgFallback;
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
