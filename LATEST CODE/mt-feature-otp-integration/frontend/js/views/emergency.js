import { getPatientData, formatDate } from '../services/data.js';
import { showToast } from '../core/ui.js';

// In-memory array of tags, chronic conditions, and policies while modal is open
let activeAllergies = [];
let activeConditions = [];
let activePolicies = [];
let activePolicyFileName = "Star_Health_Premier.pdf";

/**
 * Initializes and populates the emergency overview section with live patient data.
 */
export function renderEmergencyView() {
    const patient = getPatientData();
    if (!patient) return;

    // Helper to safely set text content if element exists
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    // Update dynamic emergency banner fields
    set('emg-display-name', patient.name);
    set('emg-display-age', `${patient.age} yrs`);
    set('emg-display-blood', patient.bloodGroup);
    set('emg-display-meta', `${patient.id} • DOB: ${formatDate(patient.dob)}`);

    // Allergies pills
    const allergiesContainer = document.getElementById('emg-allergies-container');
    if (allergiesContainer) {
        if (!patient.allergies || patient.allergies.length === 0) {
            allergiesContainer.innerHTML = `
                <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">
                    Nothing added yet. <a href="javascript:void(0)" onclick="openEditEmergencyModal('flags')" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a>
                </span>
            `;
        } else {
            allergiesContainer.innerHTML = patient.allergies.map(a => `
                <span class="condition-pill allergy-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    ${a}
                </span>
            `).join('');
        }
    }

    // Dynamic Chronic conditions list
    const conditionsContainer = document.getElementById('emg-conditions-container');
    if (conditionsContainer) {
        let conditions = patient.conditionsDetailed || [];
        if (conditions.length === 0 && Array.isArray(patient.chronicConditions) && patient.chronicConditions.length > 0) {
            conditions = patient.chronicConditions.map(c => ({
                name: c,
                note: patient.chronicConditionNotes || ""
            }));
        }

        if (conditions.length === 0) {
            conditionsContainer.innerHTML = `
                <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">
                    Nothing added yet. <a href="javascript:void(0)" onclick="openEditEmergencyModal('all')" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a>
                </div>
            `;
        } else {
            conditionsContainer.innerHTML = conditions.map(c => `
                <div class="emergency-chronic-item">
                    <div class="chronic-status-dot"></div>
                    <div>
                        <div class="chronic-name">${c.name || 'Chronic Condition'}</div>
                        ${c.note ? `<div class="chronic-desc">${c.note}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    // Emergency Contact
    if (patient.emergencyContact && (patient.emergencyContact.name || patient.emergencyContact.phone)) {
        set('emg-contact-name', patient.emergencyContact.name || 'Emergency Contact');
        set('emg-contact-relation', `Relationship: ${patient.emergencyContact.relation || 'Primary'}`);
        set('emg-contact-phone-text', patient.emergencyContact.phone || '—');

        const phoneLink = document.getElementById('emg-contact-phone-link');
        if (phoneLink) {
            const cleanPhone = (patient.emergencyContact.phone || '').replace(/[^0-9+]/g, '');
            phoneLink.href = cleanPhone ? `tel:${cleanPhone}` : 'javascript:void(0)';
        }
    } else {
        const nameEl = document.getElementById('emg-contact-name');
        if (nameEl) nameEl.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No emergency contact added</span>`;
        set('emg-contact-relation', '—');
        set('emg-contact-phone-text', '—');
        const phoneLink = document.getElementById('emg-contact-phone-link');
        if (phoneLink) phoneLink.href = 'javascript:void(0)';
    }

    // Health Insurance Policy
    updateEmergencyInsuranceCard(patient);

    // Asynchronously synchronize live policies from Java backend & Cloudflare R2 if not yet loaded
    syncEmergencyPolicies();
}

/**
 * Updates the emergency insurance card DOM elements with active policy data.
 */
export function updateEmergencyInsuranceCard(patient) {
    if (!patient) patient = getPatientData();
    if (!patient) return;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    if (patient.insurance && (patient.insurance.provider || patient.insurance.policyNumber || patient.insurance.fileName)) {
        const insNameEl = document.getElementById('emg-insurance-name');
        const count = (patient.policies && patient.policies.length > 1) ? patient.policies.length - 1 : 0;
        const providerName = patient.insurance.provider 
            || (patient.insurance.fileName ? patient.insurance.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') : 'Active Health Insurance');
        if (insNameEl) {
            if (count > 0) {
                insNameEl.innerHTML = `<span class="insurance-name-wrapper"><span>${providerName}</span><span class="insurance-count-badge">+${count} more</span></span>`;
            } else {
                insNameEl.textContent = providerName;
            }
        }
        const policyParts = [];
        if (patient.insurance.policyNumber) {
            policyParts.push(`No: ${patient.insurance.policyNumber}`);
        }
        if (patient.insurance.validUntil) {
            policyParts.push(`Valid ${patient.insurance.validUntil.slice(0, 4)}`);
        }
        set('emg-insurance-num', policyParts.join(' • '));
    } else {
        const insNameEl = document.getElementById('emg-insurance-name');
        if (insNameEl) {
            insNameEl.innerHTML = `No insurance policy added. <a href="javascript:void(0)" onclick="openEditEmergencyModal('all')" style="color: var(--primary); text-decoration: underline; font-weight: 500; font-size: 0.85rem;">Add Policy</a>`;
        }
        set('emg-insurance-num', '');
    }
}

/**
 * Background synchronizer for insurance policies from Java Backend REST API / Cloudflare R2.
 */
export async function syncEmergencyPolicies() {
    if (!window.MediTrailAPI || !window.MediTrailAPI.getInsurancePolicies) return;
    const patient = getPatientData();
    const ptCode = patient ? (patient.id || patient.patient_code || '') : '';
    if (!ptCode) return;

    try {
        const res = await window.MediTrailAPI.getInsurancePolicies(ptCode);
        const list = Array.isArray(res) ? res : (res && res.success && Array.isArray(res.policies) ? res.policies : []);
        if (list.length > 0) {
            const mapped = list.map(p => ({
                id: p.id,
                provider: p.providerName || p.provider || '',
                fileName: p.originalFilename || p.fileName || '',
                fileSize: p.fileSize || 0,
                policyNumber: p.policyNumber || '',
                validUntil: p.validUntil ? p.validUntil.slice(0, 4) : ''
            }));
            const primary = mapped[0];
            const val = primary.validUntil;

            if (patient) {
                patient.policies = mapped;
                patient.insurance = {
                    id: primary.id,
                    provider: primary.provider || (primary.fileName ? primary.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') : 'Active Insurance'),
                    fileName: primary.fileName,
                    fileSize: primary.fileSize,
                    policyNumber: primary.policyNumber,
                    validUntil: val && val.length === 4 ? `${val}-12-31` : val
                };
            }

            // Sync into session & local storage
            const savedSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
            let sessionObj = savedSession ? JSON.parse(savedSession) : {};
            sessionObj.policies = mapped;
            sessionObj.insurance = patient ? patient.insurance : null;
            sessionStorage.setItem('MEDITRAIL_CURRENT_PATIENT', JSON.stringify(sessionObj));
            localStorage.setItem(`MEDITRAIL_PATIENT_PROFILE_${ptCode}`, JSON.stringify(sessionObj));

            updateEmergencyInsuranceCard(patient);
        }
    } catch (err) {
        console.warn('[MediTrail] Emergency view policy sync notice:', err.message);
    }
}

/**
 * Focuses the inline tag input inside the tags wrapper container.
 */
export function focusTagInput() {
    const input = document.getElementById('edit-emg-tag-input');
    if (input) input.focus();
}

/**
 * Renders the YouTube-style tag chips inside the edit modal.
 */
export function renderTagChips() {
    const chipsList = document.getElementById('emg-tag-chips-list');
    const input = document.getElementById('edit-emg-tag-input');
    if (!chipsList) return;

    chipsList.innerHTML = activeAllergies.map((tag, idx) => `
        <span class="emg-tag-chip">
            <span>${tag}</span>
            <button type="button" class="emg-tag-remove-btn" onclick="removeTag(${idx}, event)" aria-label="Remove ${tag}">
                &times;
            </button>
        </span>
    `).join('');

    // Dynamic placeholder so it is never repetitive or overflowing
    if (input) {
        input.placeholder = activeAllergies.length > 0 ? "Add another..." : "Add allergy tag...";
    }
}

/**
 * Adds a new allergy tag chip.
 * @param {string} tagText - The text of the allergy to add
 */
export function addTag(tagText) {
    const cleaned = tagText.trim().replace(/^,+|,+$/g, '');
    if (!cleaned) return;

    const exists = activeAllergies.some(t => t.toLowerCase() === cleaned.toLowerCase());
    if (!exists) {
        activeAllergies.push(cleaned);
        renderTagChips();
    }
}

/**
 * Removes a tag by index.
 * @param {number} idx - Index of tag to remove
 * @param {Event} [e] - Click event
 */
export function removeTag(idx, e) {
    if (e) e.stopPropagation();
    if (idx >= 0 && idx < activeAllergies.length) {
        activeAllergies.splice(idx, 1);
        renderTagChips();
    }
}

/**
 * Keydown handler for YouTube-style tag input.
 */
export function handleTagInputKeydown(e) {
    const input = e.target;
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (input.value.trim()) {
            addTag(input.value);
            input.value = '';
        }
    } else if (e.key === 'Backspace' && input.value === '') {
        if (activeAllergies.length > 0) {
            activeAllergies.pop();
            renderTagChips();
        }
    }
}

/**
 * Renders the editable health insurance policies list inside the modal.
 */
export function renderPoliciesEditList() {
    const list = document.getElementById('emg-policies-edit-list');
    if (!list) return;

    if (activePolicies.length === 0) {
        list.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">
                Nothing added yet. <a href="javascript:void(0)" onclick="addNewPolicyRow()" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a>
            </div>
        `;
        return;
    }

    list.innerHTML = `
        <div class="emg-policy-labels-grid">
            <label>Upload Policy File <span class="emg-tag-hint">(from filename)</span></label>
            <label>Policy Number <span class="emg-optional-badge">Optional</span></label>
            <label>Valid Year <span class="emg-optional-badge">Optional</span></label>
            <span></span>
        </div>
        ${activePolicies.map((pol, idx) => `
            <div class="emg-policy-row-item">
                <input type="file" id="edit-emg-policy-file-${idx}" accept=".pdf,application/pdf" style="display: none;"
                    onchange="handlePolicyFileUploadAtIndex(event, ${idx})" />

                <div class="emg-policy-upload-card" onclick="triggerPolicyFileInputAtIndex(${idx}, event)" title="${pol.fileName || 'Click to upload policy document'}">
                    <div class="emg-upload-icon-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="12" y1="18" x2="12" y2="12"></line>
                            <line x1="9" y1="15" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <div class="emg-upload-meta">
                        <span class="emg-upload-filename" id="emg-policy-filename-display-${idx}">${pol.fileName ? `${pol.fileName}${pol.fileSize ? ` (${Math.round(pol.fileSize / 1024)} KB)` : ''}` : 'Upload Document'}</span>
                        <span class="emg-upload-subtext">${pol.fileName ? 'Click or browse to change' : 'Upload policy file'}</span>
                    </div>
                    <button type="button" class="btn btn-secondary emg-upload-browse-btn" onclick="triggerPolicyFileInputAtIndex(${idx}, event)">
                        Browse
                    </button>
                </div>

                <input type="text" class="emg-text-input" placeholder="e.g. SHP-8849201"
                    value="${pol.policyNumber || ''}" oninput="updatePolicyField(${idx}, 'policyNumber', this.value)" />

                <input type="text" class="emg-text-input" placeholder="e.g. 2027"
                    value="${pol.validUntil || ''}" oninput="updatePolicyField(${idx}, 'validUntil', this.value)" />

                <button type="button" class="emg-condition-remove-btn" onclick="removePolicyRow(${idx})" title="Remove policy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `).join('')}
    `;
}

/**
 * Updates an in-memory policy field as user types.
 */
export function updatePolicyField(idx, field, val) {
    if (activePolicies[idx]) {
        activePolicies[idx][field] = val;
    }
}

/**
 * Triggers the hidden policy file input for a given policy row.
 */
export function triggerPolicyFileInputAtIndex(idx, e) {
    if (e) e.stopPropagation();
    const fileInput = document.getElementById(`edit-emg-policy-file-${idx}`);
    if (fileInput) fileInput.click();
}

/**
 * Fallback alias for triggering policy file input on row 0.
 */
export function triggerPolicyFileInput(e) {
    triggerPolicyFileInputAtIndex(0, e);
}

/**
 * Handles policy file selection for a specific row, validates PDF format, and derives the provider name from filename.
 */
export function handlePolicyFileUploadAtIndex(e, idx) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // Strict validation: Only authentic PDF files are permitted
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
        showToast('Please upload an authentic PDF policy document (.pdf)', 'error');
        e.target.value = '';
        return;
    }

    // Size limit check (15 MB maximum)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast('File size exceeds the 15 MB limit', 'error');
        e.target.value = '';
        return;
    }

    const derivedName = file.name
        .replace(/\.[^/.]+$/, '') // remove extension
        .replace(/[-_]+/g, ' ')   // replace dashes/underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // title-case
        .trim();

    if (activePolicies[idx]) {
        activePolicies[idx].file = file; // Store File reference for Cloudflare R2 upload
        activePolicies[idx].fileName = file.name;
        activePolicies[idx].fileSize = file.size;
        activePolicies[idx].provider = derivedName;
        console.log(`[MediTrail] PDF attached to policy row ${idx}: ${file.name} (${Math.round(file.size / 1024)} KB)`);
        const displayEl = document.getElementById(`emg-policy-filename-display-${idx}`);
        if (displayEl) {
            const sizeKb = Math.round(file.size / 1024);
            displayEl.textContent = `${file.name} (${sizeKb} KB)`;
        }
    }
}

/**
 * Fallback alias for handling policy file upload on row 0.
 */
export function handlePolicyFileUpload(e) {
    handlePolicyFileUploadAtIndex(e, 0);
}

/**
 * Adds a new blank policy row to the edit modal list.
 */
export function addNewPolicyRow() {
    activePolicies.push({
        provider: '',
        fileName: '',
        policyNumber: '',
        validUntil: ''
    });
    renderPoliciesEditList();
}

/**
 * Removes a policy row by index. If policy has been persisted to cloud storage, confirms and deletes from R2/DB.
 */
export async function removePolicyRow(idx) {
    if (idx >= 0 && idx < activePolicies.length) {
        const pol = activePolicies[idx];
        if (pol.id && window.MediTrailAPI && window.MediTrailAPI.deleteInsurancePolicy) {
            const confirmed = window.confirm(`Permanently delete the insurance policy document "${pol.fileName || 'Document'}" from cloud storage?`);
            if (!confirmed) return;

            try {
                const res = await window.MediTrailAPI.deleteInsurancePolicy(pol.id);
                if (res && res.success) {
                    showToast('Policy document removed successfully', 'success');
                    activePolicies.splice(idx, 1);
                    renderPoliciesEditList();

                    const patient = getPatientData();
                    if (patient) {
                        patient.policies = [...activePolicies];
                        if (activePolicies.length > 0) {
                            const first = activePolicies[0];
                            patient.insurance = {
                                provider: first.provider || first.providerName || '',
                                fileName: first.fileName || first.originalFilename || '',
                                policyNumber: first.policyNumber || '',
                                validUntil: first.validUntil || ''
                            };
                        } else {
                            patient.insurance = null;
                        }

                        // Sync session and local storage
                        const savedSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
                        if (savedSession) {
                            try {
                                const parsed = JSON.parse(savedSession);
                                parsed.policies = patient.policies;
                                parsed.insurance = patient.insurance;
                                sessionStorage.setItem('MEDITRAIL_CURRENT_PATIENT', JSON.stringify(parsed));
                            } catch (e) {}
                        }

                        renderEmergencyView();
                        if (window.renderDashboard) window.renderDashboard();
                    }
                } else {
                    showToast(res.message || 'Failed to delete policy', 'error');
                }
            } catch (err) {
                showToast(`Policy deletion failed: ${err.message}`, 'error');
                console.error('Policy deletion failed:', err);
            }
        } else {
            activePolicies.splice(idx, 1);
            renderPoliciesEditList();

            const patient = getPatientData();
            if (patient) {
                patient.policies = [...activePolicies];
                if (activePolicies.length === 0) patient.insurance = null;
                renderEmergencyView();
                if (window.renderDashboard) window.renderDashboard();
            }
        }
    }
}

/**
 * Renders the editable chronic conditions list inside the modal.
 */
export function renderChronicConditionsEditList() {
    const list = document.getElementById('emg-conditions-edit-list');
    if (!list) return;

    if (activeConditions.length === 0) {
        list.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; padding: 0.5rem 0;">
                Nothing added yet. <a href="javascript:void(0)" onclick="addNewConditionRow()" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a>
            </div>
        `;
        return;
    }

    list.innerHTML = activeConditions.map((cond, idx) => `
        <div class="emg-condition-edit-item">
            <div class="emg-condition-edit-inputs">
                <input type="text" class="emg-text-input" placeholder="Condition (e.g. Mild Asthma)"
                    value="${cond.name || ''}" oninput="updateConditionField(${idx}, 'name', this.value)" />
                <input type="text" class="emg-text-input" placeholder="Treatment / notes (e.g. Budesonide Inhaler)"
                    value="${cond.note || ''}" oninput="updateConditionField(${idx}, 'note', this.value)" />
            </div>
            <button type="button" class="emg-condition-remove-btn" onclick="removeConditionRow(${idx})" title="Remove condition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `).join('');
}

/**
 * Updates an in-memory chronic condition field as user types.
 */
export function updateConditionField(idx, field, val) {
    if (activeConditions[idx]) {
        activeConditions[idx][field] = val;
    }
}

/**
 * Adds a new blank condition row to the edit modal list.
 */
export function addNewConditionRow() {
    activeConditions.push({ name: '', note: '' });
    renderChronicConditionsEditList();
    // Focus the newly added condition name input
    requestAnimationFrame(() => {
        const list = document.getElementById('emg-conditions-edit-list');
        if (list) {
            const inputs = list.querySelectorAll('input');
            if (inputs.length >= 2) {
                inputs[inputs.length - 2].focus();
            }
        }
    });
}

/**
 * Removes a condition row by index.
 */
export function removeConditionRow(idx) {
    if (idx >= 0 && idx < activeConditions.length) {
        activeConditions.splice(idx, 1);
        renderChronicConditionsEditList();
    }
}

/**
 * Opens the Edit Emergency Details modal dialog and pre-fills current data.
 * @param {'all'|'flags'|'contact'} [focusSection='all'] - Which section to autofocus
 */
export function openEditEmergencyModal(focusSection = 'all') {
    const patient = getPatientData();
    const overlay = document.getElementById('edit-emergency-modal-overlay');
    if (!overlay || !patient) return;

    // Ensure conditionsDetailed exists
    if (!patient.conditionsDetailed) {
        if (patient.chronicConditions && patient.chronicConditions.length > 0) {
            patient.conditionsDetailed = patient.chronicConditions.map(c => ({
                name: c,
                note: patient.chronicConditionNotes || ""
            }));
        } else {
            patient.conditionsDetailed = [];
        }
    }

    // Pre-fill inputs with current patient values
    const nameInput = document.getElementById('edit-emg-contact-name');
    const relationInput = document.getElementById('edit-emg-contact-relation');
    const phoneInput = document.getElementById('edit-emg-contact-phone');
    const bloodSelect = document.getElementById('edit-emg-blood-group');
    const tagInput = document.getElementById('edit-emg-tag-input');

    if (patient.emergencyContact) {
        if (nameInput) nameInput.value = patient.emergencyContact.name || '';
        if (relationInput) relationInput.value = patient.emergencyContact.relation || '';
        if (phoneInput) phoneInput.value = patient.emergencyContact.phone || '';
    }

    // Populate activePolicies list for dynamic add/remove
    if (Array.isArray(patient.policies) && patient.policies.length > 0) {
        activePolicies = patient.policies.map(p => ({ ...p }));
        renderPoliciesEditList();
    } else if (patient.insurance && (patient.insurance.fileName || patient.insurance.provider)) {
        const cleanProvider = (patient.insurance.provider || 'Active Health Insurance').replace(/\s+/g, '_');
        activePolicies = [{
            id: patient.insurance.id || '',
            provider: patient.insurance.provider || 'Active Health Insurance',
            fileName: patient.insurance.fileName || `${cleanProvider}.pdf`,
            fileSize: patient.insurance.fileSize || 0,
            policyNumber: patient.insurance.policyNumber || '',
            validUntil: patient.insurance.validUntil ? patient.insurance.validUntil.slice(0, 4) : '2027'
        }];
        renderPoliciesEditList();
    } else {
        activePolicies = [];
        const listEl = document.getElementById('emg-policies-edit-list');
        if (listEl) {
            listEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: var(--text-muted); padding: 0.75rem 0;">
                    <div style="width: 14px; height: 14px; border: 2px solid var(--border-subtle); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span>Checking cloud storage for policy documents...</span>
                </div>
            `;
        }
    }

    // Sync persisted policies from Java backend / Cloudflare R2 if available.
    // Merges backend-persisted entries while preserving any locally-added
    // policies that already have a pending .file attachment (prevents race
    // condition where this async callback overwrites user-selected files).
    if (window.MediTrailAPI && window.MediTrailAPI.getInsurancePolicies) {
        const ptCode = patient.id || patient.patient_code || '';
        window.MediTrailAPI.getInsurancePolicies(ptCode).then(res => {
            const list = Array.isArray(res) ? res : (res && res.success && Array.isArray(res.policies) ? res.policies : []);
            if (list.length > 0) {
                // Collect any locally-pending policies the user already attached files to
                const pendingLocal = activePolicies.filter(p => p.file);

                const merged = list.map(p => ({
                    id: p.id,
                    provider: p.providerName || p.provider || '',
                    fileName: p.originalFilename || p.fileName || '',
                    fileSize: p.fileSize || 0,
                    policyNumber: p.policyNumber || '',
                    validUntil: p.validUntil ? p.validUntil.slice(0, 4) : ''
                }));

                // Re-append any local policies with pending file uploads
                for (const local of pendingLocal) {
                    const alreadyExists = merged.some(m =>
                        (m.id && local.id && m.id === local.id) ||
                        (m.fileName === local.fileName && m.policyNumber === local.policyNumber)
                    );
                    if (!alreadyExists) {
                        merged.push(local);
                    }
                }

                activePolicies = merged;
                patient.policies = activePolicies.map(p => {
                    const copy = { ...p };
                    delete copy.file; // Don't persist File references in patient data
                    return copy;
                });
                if (activePolicies.length > 0 && (!patient.insurance || !patient.insurance.fileName)) {
                    const primary = activePolicies[0];
                    const val = primary.validUntil;
                    patient.insurance = {
                        id: primary.id,
                        provider: primary.provider || primary.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
                        fileName: primary.fileName,
                        fileSize: primary.fileSize,
                        policyNumber: primary.policyNumber,
                        validUntil: val && val.length === 4 ? `${val}-12-31` : val
                    };
                }

                // Sync into session & local storage
                const savedSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
                let sessionObj = savedSession ? JSON.parse(savedSession) : {};
                sessionObj.policies = patient.policies;
                sessionObj.insurance = patient.insurance;
                sessionStorage.setItem('MEDITRAIL_CURRENT_PATIENT', JSON.stringify(sessionObj));
                if (ptCode) {
                    localStorage.setItem(`MEDITRAIL_PATIENT_PROFILE_${ptCode}`, JSON.stringify(sessionObj));
                }

                renderPoliciesEditList();
            } else {
                renderPoliciesEditList();
            }
        }).catch(err => {
            console.warn('[MediTrail] Background policies fetch:', err.message);
            renderPoliciesEditList();
        });
    }

    if (bloodSelect && patient.bloodGroup) {
        bloodSelect.value = patient.bloodGroup;
    }

    // Populate activeAllergies list for YouTube tag component
    activeAllergies = Array.isArray(patient.allergies) ? [...patient.allergies] : [];
    renderTagChips();
    if (tagInput) tagInput.value = '';

    // Populate activeConditions list for dynamic add/remove
    activeConditions = (patient.conditionsDetailed || []).map(c => ({ ...c }));
    renderChronicConditionsEditList();

    // Show modal with animation
    overlay.hidden = false;
    requestAnimationFrame(() => {
        overlay.classList.add('open');
        if (focusSection === 'contact' && nameInput) {
            nameInput.focus();
        } else if (focusSection === 'flags' && tagInput) {
            tagInput.focus();
        }
    });
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the Edit Emergency Details modal dialog.
 * @param {MouseEvent} [e] - Optional click event for backdrop detection
 */
export function closeEditEmergencyModal(e) {
    if (e && e.target !== document.getElementById('edit-emergency-modal-overlay')) return;

    const overlay = document.getElementById('edit-emergency-modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => {
        overlay.hidden = true;
        document.body.style.overflow = '';
    }, { once: true });
}

let isSavingEmergency = false;

/**
 * Handles submission of updated emergency data.
 * @param {Event} e - Form submission event
 */
export async function saveEmergencyChanges(e) {
    if (e) e.preventDefault();

    if (isSavingEmergency) {
        console.warn('[MediTrail Save] Save operation already in progress, ignoring duplicate submit.');
        return;
    }

    const patient = getPatientData();
    if (!patient) return;

    const nameInput = document.getElementById('edit-emg-contact-name');
    const relationInput = document.getElementById('edit-emg-contact-relation');
    const phoneInput = document.getElementById('edit-emg-contact-phone');
    const bloodSelect = document.getElementById('edit-emg-blood-group');
    const tagInput = document.getElementById('edit-emg-tag-input');
    const saveBtn = document.querySelector('.emg-save-btn');

    // Compulsory check: Primary contact & blood group
    if (!nameInput || !nameInput.value.trim() || !relationInput || !relationInput.value.trim() || !phoneInput || !phoneInput.value.trim()) {
        showToast('Please fill out all compulsory Primary Contact fields', 'error');
        return;
    }

    if (!bloodSelect || !bloodSelect.value) {
        showToast('Emergency Blood Group is compulsory', 'error');
        return;
    }

    // Lock to prevent duplicate concurrent saves
    isSavingEmergency = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.7';
        saveBtn.style.pointerEvents = 'none';
    }

    // Handle any pending PDF document uploads to Cloudflare R2
    const pendingUploads = activePolicies.filter(p => p.file);
    console.log(`[MediTrail Save] Triggered: ${activePolicies.length} total policies, ${pendingUploads.length} pending file uploads`);

    if (pendingUploads.length > 0) {
        if (!window.MediTrailAPI || !window.MediTrailAPI.uploadInsurancePolicy) {
            console.error('[MediTrail Save] uploadInsurancePolicy function is missing from window.MediTrailAPI');
            showToast('Document upload service unavailable', 'error');
            isSavingEmergency = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.style.pointerEvents = 'auto';
            }
            return;
        }

        console.log(`[MediTrail Save] Starting upload of ${pendingUploads.length} policy document(s) to Cloudflare R2...`);
        showToast('Uploading policy document to Cloudflare R2...', 'info');

        try {
            for (let i = 0; i < pendingUploads.length; i++) {
                const p = pendingUploads[i];
                console.log(`[MediTrail Save] Processing upload [${i + 1}/${pendingUploads.length}]: file='${p.file.name}', size=${p.file.size} bytes, type='${p.file.type}'`);

                const base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Failed reading PDF file bytes'));
                    reader.readAsDataURL(p.file);
                });

                console.log(`[MediTrail Save] Dispatching POST /api/policies/upload for '${p.file.name}' (${p.file.size} bytes)...`);

                const uploadRes = await window.MediTrailAPI.uploadInsurancePolicy({
                    filename: p.file.name,
                    fileData: base64Data,
                    providerName: p.provider || p.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
                    policyNumber: p.policyNumber || '',
                    validUntil: p.validUntil || ''
                });

                console.log('[MediTrail Save] Upload response received from server:', uploadRes);

                if (uploadRes && uploadRes.success && uploadRes.policy) {
                    p.id = uploadRes.policy.id;
                    p.fileName = uploadRes.policy.originalFilename;
                    p.fileSize = uploadRes.policy.fileSize;
                    p.provider = uploadRes.policy.providerName;
                    delete p.file; // Successfully persisted to Cloudflare R2
                    console.log(`[MediTrail Save] Policy persisted with ID: ${p.id}, StorageKey: ${uploadRes.policy.storageKey || 'R2'}`);
                } else {
                    const errMsg = (uploadRes && uploadRes.message) || 'Upload rejected by server';
                    throw new Error(errMsg);
                }
            }
            showToast('Policy document saved to Cloudflare R2', 'success');
        } catch (uploadErr) {
            console.error('[MediTrail Save] Policy document upload FAILED:', uploadErr);
            showToast(`Cloud storage upload failed: ${uploadErr.message}`, 'error');
            isSavingEmergency = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.style.opacity = '1';
                saveBtn.style.pointerEvents = 'auto';
            }
            return; // Abort save on upload failure to preserve state and keep pending file
        }
    }

    // Commit any pending tag text
    if (tagInput && tagInput.value.trim()) {
        addTag(tagInput.value);
        tagInput.value = '';
    }

    // Update compulsory contact
    patient.emergencyContact = {
        name: nameInput.value.trim(),
        relation: relationInput.value.trim(),
        phone: phoneInput.value.trim()
    };

    // Update optional policy fields from dynamic policies list
    const validPolicies = activePolicies
        .map(p => ({
            id: p.id,
            provider: (p.provider || '').trim(),
            fileName: (p.fileName || '').trim(),
            fileSize: p.fileSize || 0,
            policyNumber: (p.policyNumber || '').trim(),
            validUntil: (p.validUntil || '').trim()
        }))
        .filter(p => p.fileName || p.policyNumber || p.provider);

    patient.policies = validPolicies;
    if (validPolicies.length > 0) {
        const primary = validPolicies[0];
        const val = primary.validUntil;
        patient.insurance = {
            id: primary.id,
            provider: primary.provider || (primary.fileName ? primary.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') : 'Active Insurance'),
            fileName: primary.fileName,
            fileSize: primary.fileSize || 0,
            policyNumber: primary.policyNumber,
            validUntil: val && val.length === 4 ? `${val}-12-31` : val
        };
    } else {
        patient.insurance = null;
    }

    // Update compulsory blood group
    patient.bloodGroup = bloodSelect.value;
    patient.blood_group = bloodSelect.value;

    // Save allergies
    patient.allergies = [...activeAllergies];

    // Filter and save chronic conditions from dynamic list
    const validConditions = activeConditions
        .map(c => {
            let name = (c.name || '').trim();
            let note = (c.note || '').trim();
            if (!name && note) name = 'Chronic Condition';
            return { name, note };
        })
        .filter(c => c.name.length > 0 || c.note.length > 0);

    patient.conditionsDetailed = validConditions;
    patient.chronicConditions = validConditions.map(c => c.name);
    patient.chronicConditionNotes = validConditions.length > 0 ? validConditions[0].note : '';

    // 1. Save updated profile into Session Storage & Local Storage
    const savedSession = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
    let sessionObj = savedSession ? JSON.parse(savedSession) : {};

    sessionObj.blood_group = patient.bloodGroup;
    sessionObj.bloodGroup = patient.bloodGroup;
    sessionObj.allergies = patient.allergies;
    sessionObj.chronic_conditions = patient.chronicConditions;
    sessionObj.chronicConditions = patient.chronicConditions;
    sessionObj.chronicConditionNotes = patient.chronicConditionNotes;
    sessionObj.conditionsDetailed = patient.conditionsDetailed;
    sessionObj.emergency_contact = patient.emergencyContact;
    sessionObj.emergencyContact = patient.emergencyContact;
    sessionObj.insurance = patient.insurance;
    sessionObj.policies = patient.policies;

    sessionStorage.setItem('MEDITRAIL_CURRENT_PATIENT', JSON.stringify(sessionObj));

    const ptCode = sessionObj.patient_code || sessionObj.id || patient.id || 'MT-50298';
    localStorage.setItem(`MEDITRAIL_PATIENT_PROFILE_${ptCode}`, JSON.stringify(sessionObj));

    // 2. Sync to Java Backend Database API
    if (window.MediTrailAPI && window.MediTrailAPI.updateEmergencyProfile) {
        window.MediTrailAPI.updateEmergencyProfile(ptCode, {
            bloodGroup: patient.bloodGroup,
            allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies || ''),
            chronicConditions: Array.isArray(patient.chronicConditions) ? patient.chronicConditions.join(', ') : (patient.chronicConditions || ''),
            emergencyContactName: patient.emergencyContact ? patient.emergencyContact.name : '',
            emergencyContactRelationship: patient.emergencyContact ? patient.emergencyContact.relationship : '',
            emergencyContactPhone: patient.emergencyContact ? patient.emergencyContact.phone : ''
        }).then(res => {
            console.log('[MediTrail] Emergency profile synchronized to Java database:', res);
        }).catch(err => {
            console.warn('Java API emergency update warning:', err.message);
        });
    }

    // 3. Refresh UI display in Emergency tab, Patient Headers, and Dashboard Cards
    renderEmergencyView();

    import('../services/data.js').then(dataMod => {
        if (dataMod.updateUiPatientProfile) dataMod.updateUiPatientProfile();
    }).catch(e => console.warn(e));

    import('./dashboard.js').then(dash => {
        if (dash.renderDashboard) dash.renderDashboard();
    }).catch(e => console.warn(e));

    // Reset save lock and restore button state
    isSavingEmergency = false;
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.pointerEvents = 'auto';
    }

    // Close the edit modal
    closeEditEmergencyModal();

    // Show success feedback
    showToast('Emergency contact and profile details saved successfully!', 'success');
}

/**
 * Opens the patient profile modal and populates it with current patient data.
 */
export function openProfileModal() {
    const patient = getPatientData();
    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay || !patient) return;

    // Helper to set text safely
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // Header
    const initials = patient.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    set('prof-modal-avatar', initials);
    set('prof-modal-name', patient.name);
    set('prof-modal-age', `${patient.age} yrs`);
    set('prof-modal-id', patient.id);

    // Personal info
    set('prof-modal-dob', formatDate(patient.dob));
    set('prof-modal-gender', patient.gender);
    set('prof-modal-blood', patient.bloodGroup);

    // Allergy pills
    const modalAllergies = document.getElementById('prof-modal-allergies');
    if (modalAllergies) {
        if (!patient.allergies || patient.allergies.length === 0) {
            modalAllergies.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Nothing added yet. <a href="javascript:void(0)" onclick="closeProfileModal(); openEditEmergencyModal('flags');" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a></span>`;
        } else {
            modalAllergies.innerHTML = patient.allergies.map(a =>
                `<span class="condition-pill allergy-pill">${a}</span>`
            ).join('');
        }
    }

    // Condition pills
    const modalConditions = document.getElementById('prof-modal-conditions');
    if (modalConditions) {
        if (!patient.chronicConditions || patient.chronicConditions.length === 0) {
            modalConditions.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Nothing added yet. <a href="javascript:void(0)" onclick="closeProfileModal(); openEditEmergencyModal('all');" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a></span>`;
        } else {
            modalConditions.innerHTML = patient.chronicConditions.map(c =>
                `<span class="condition-pill chronic-pill">${c}</span>`
            ).join('');
        }
    }

    // Insurance
    if (patient.insurance && (patient.insurance.provider || patient.insurance.policyNumber)) {
        set('prof-modal-ins-provider', patient.insurance.provider);
        set('prof-modal-ins-policy', patient.insurance.policyNumber);
        set('prof-modal-ins-valid', formatDate(patient.insurance.validUntil));
    } else {
        const provEl = document.getElementById('prof-modal-ins-provider');
        if (provEl) provEl.innerHTML = `Nothing added yet. <a href="javascript:void(0)" onclick="closeProfileModal(); openEditEmergencyModal('all');" style="color: var(--primary); text-decoration: underline; font-weight: 500;">Update it?</a>`;
        set('prof-modal-ins-policy', '—');
        set('prof-modal-ins-valid', '—');
    }

    // Emergency contact
    if (patient.emergencyContact) {
        set('prof-modal-emg-name', patient.emergencyContact.name);
        set('prof-modal-emg-relation', patient.emergencyContact.relation);
        set('prof-modal-emg-phone', patient.emergencyContact.phone);
    }

    // Show modal with animation
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the patient profile modal.
 * @param {MouseEvent} [e] - Optional event (to support backdrop click-outside)
 */
export function closeProfileModal(e) {
    // If triggered by a click, only close if clicked directly on the overlay backdrop
    if (e && e.target !== document.getElementById('profile-modal-overlay')) return;

    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    // Wait for fade-out animation to complete before hiding
    overlay.addEventListener('transitionend', () => {
        overlay.hidden = true;
        document.body.style.overflow = '';
    }, { once: true });
}
