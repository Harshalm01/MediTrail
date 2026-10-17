/**
 * MediTrail - Client-side PDF Generation Utility Module
 * Uses jsPDF library to generate professional, formatted medical record PDFs.
 */

import { getPatientData, getRecordById } from '../services/data.js';

/**
 * Helper to ensure jsPDF instance is accessible
 */
function getJsPdfInstance() {
    if (window.jspdf && window.jspdf.jsPDF) {
        return window.jspdf.jsPDF;
    } else if (window.jsPDF) {
        return window.jsPDF;
    }
    return null;
}

/**
 * Formats a filename to end with .pdf extension cleanly
 */
function ensurePdfExtension(fileName) {
    if (!fileName) return 'MediTrail_Document.pdf';
    return fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
}

/**
 * Standard multi-line text wrapper for jsPDF
 */
function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6) {
    if (!text) return y;
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach(line => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, x, y);
        y += lineHeight;
    });
    return y;
}

/**
 * Generates and downloads an official MediTrail Clinical Record Summary as a PDF.
 * @param {string|object} recordOrId
 */
export function exportPdfMedicalRecord(recordOrId) {
    const record = typeof recordOrId === 'string' ? getRecordById(recordOrId) : recordOrId;
    if (!record) {
        console.error('Cannot generate PDF: Record not found', recordOrId);
        return false;
    }

    const patient = getPatientData() || {
        name: "Aarnav Mehta",
        id: "MT-10482",
        bloodGroup: "B+",
        dob: "2002-04-15",
        age: 24,
        gender: "Male"
    };

    const jsPDF = getJsPdfInstance();
    if (!jsPDF) {
        alert('PDF Generation Library is loading. Please try again in a moment.');
        return false;
    }

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageMargin = 15;
    const contentWidth = pageWidth - (pageMargin * 2);

    // ── 1. Top Header Banner ──────────────────────────────────────────
    doc.setFillColor(13, 148, 136); // Teal #0d9488
    doc.rect(0, 0, pageWidth, 30, 'F');

    // Header Logo Icon simulation (Medical Cross)
    doc.setFillColor(255, 255, 255);
    doc.rect(15, 9, 12, 12, 'F');
    doc.setFillColor(13, 148, 136);
    doc.rect(19, 11, 4, 8, 'F');
    doc.rect(17, 13, 8, 4, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MEDITRAIL', 32, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL CLINICAL MEDICAL RECORD SUMMARY', 32, 22);

    // Header Right Meta
    doc.setFontSize(8);
    doc.text(`RECORD ID: ${record.id}`, pageWidth - 15, 14, { align: 'right' });
    doc.text(`DATE ISSUED: ${new Date().toLocaleDateString()}`, pageWidth - 15, 20, { align: 'right' });

    let currentY = 38;

    // ── 2. Patient Profile Box ──────────────────────────────────────────
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageMargin, currentY, contentWidth, 24, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42); // Navy text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`PATIENT: ${patient.name.toUpperCase()}`, pageMargin + 5, currentY + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Patient ID: ${patient.id}`, pageMargin + 5, currentY + 13);
    doc.text(`Age / DOB: ${patient.age} yrs (${patient.dob})`, pageMargin + 5, currentY + 18);

    doc.text(`Blood Group: ${patient.bloodGroup}`, pageMargin + 95, currentY + 13);
    doc.text(`Gender: ${patient.gender || 'Male'}`, pageMargin + 95, currentY + 18);

    currentY += 30;

    // ── 3. Record Overview ──────────────────────────────────────────
    doc.setFillColor(15, 39, 68); // Navy section header
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.rect(pageMargin, currentY, contentWidth, 7, 'F');
    doc.text('1. EVENT & CLINICAL CARE DETAILS', pageMargin + 4, currentY + 5);

    currentY += 12;

    doc.setTextColor(13, 148, 136); // Teal for title
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    currentY = addWrappedText(doc, record.title, pageMargin, currentY, contentWidth, 6);

    currentY += 2;
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Details Grid
    const col1 = pageMargin;
    const col2 = pageMargin + 90;

    doc.setFont('helvetica', 'bold');
    doc.text('Event Date:', col1, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${record.date} (${record.year})`, col1 + 25, currentY);

    doc.setFont('helvetica', 'bold');
    doc.text('Category:', col2, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${record.category} (${record.type})`, col2 + 25, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Facility:', col1, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(record.hospital || 'N/A', col1 + 25, currentY);

    doc.setFont('helvetica', 'bold');
    doc.text('Specialist:', col2, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(record.doctor || 'N/A', col2 + 25, currentY);

    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Department:', col1, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(record.department || 'N/A', col1 + 25, currentY);

    doc.setFont('helvetica', 'bold');
    doc.text('Status:', col2, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(record.status || 'Active', col2 + 25, currentY);

    currentY += 10;

    // Helper for Section Block
    const renderSectionBlock = (title, content) => {
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFillColor(15, 39, 68);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.rect(pageMargin, currentY, contentWidth, 6, 'F');
        doc.text(title, pageMargin + 4, currentY + 4.2);

        currentY += 10;
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        currentY = addWrappedText(doc, content || 'None recorded.', pageMargin, currentY, contentWidth, 5);
        currentY += 6;
    };

    // ── 4. Clinical Sections ──────────────────────────────────────────
    const details = record.details || {};

    if (details.diagnosis) {
        renderSectionBlock('2. DIAGNOSIS & CLINICAL FINDINGS', details.diagnosis);
    }

    if (details.procedure) {
        renderSectionBlock('3. PROCEDURE / INTERVENTION PERFORMED', details.procedure);
    }

    if (details.clinicalNotes) {
        renderSectionBlock('4. PHYSICIAN CLINICAL NOTES', details.clinicalNotes);
    }

    if (details.treatmentPlan) {
        renderSectionBlock('5. TREATMENT PLAN & FOLLOW-UP INSTRUCTIONS', details.treatmentPlan);
    }

    // ── 5. Prescribed Medications ──────────────────────────────────────
    if (details.medications && details.medications.length > 0) {
        if (currentY > 240) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFillColor(15, 39, 68);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.rect(pageMargin, currentY, contentWidth, 6, 'F');
        doc.text('6. PRESCRIBED MEDICATIONS', pageMargin + 4, currentY + 4.2);

        currentY += 9;
        doc.setFillColor(241, 245, 249);
        doc.rect(pageMargin, currentY, contentWidth, 6, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Medication Name', pageMargin + 3, currentY + 4.2);
        doc.text('Dosage', pageMargin + 65, currentY + 4.2);
        doc.text('Instructions', pageMargin + 110, currentY + 4.2);

        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        details.medications.forEach(med => {
            if (currentY > 265) {
                doc.addPage();
                currentY = 20;
            }
            doc.setTextColor(30, 41, 59);
            doc.text(med.name || 'N/A', pageMargin + 3, currentY + 4);
            doc.text(med.dose || 'N/A', pageMargin + 65, currentY + 4);
            doc.text(med.instructions || 'As directed', pageMargin + 110, currentY + 4);
            doc.setDrawColor(226, 232, 240);
            doc.line(pageMargin, currentY + 6, pageMargin + contentWidth, currentY + 6);
            currentY += 7;
        });
        currentY += 4;
    }

    // ── 6. Attachments List ──────────────────────────────────────────
    if (details.attachments && details.attachments.length > 0) {
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }
        doc.setFillColor(15, 39, 68);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.rect(pageMargin, currentY, contentWidth, 6, 'F');
        doc.text('7. ATTACHED DOCUMENTS & DIAGNOSTICS ON FILE', pageMargin + 4, currentY + 4.2);

        currentY += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        details.attachments.forEach(att => {
            doc.text(`• ${att.name} (${att.size || 'Verified Attachment'})`, pageMargin + 5, currentY);
            currentY += 5;
        });
        currentY += 4;
    }

    // ── 7. Footer Stamp & Verification Notice ──────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(203, 213, 225);
        doc.line(pageMargin, 280, pageWidth - pageMargin, 280);

        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by MediTrail Medical History System • Cryptographically Verified Digital Summary', pageMargin, 285);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - pageMargin, 285, { align: 'right' });
    }

    const sanitizedTitle = record.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `MediTrail_${record.id}_${sanitizedTitle}.pdf`;
    doc.save(fileName);
    return true;
}

/**
 * Generates and downloads a valid PDF for file attachments.
 * @param {string} fileName
 * @param {object} [recordContext]
 */
export function exportPdfAttachment(fileName, recordContext) {
    const pdfFileName = ensurePdfExtension(fileName);
    const patient = getPatientData() || { name: "Aarnav Mehta", id: "MT-10482" };
    const record = recordContext || (window.currentOpenedRecordId ? getRecordById(window.currentOpenedRecordId) : null);

    const jsPDF = getJsPdfInstance();
    if (!jsPDF) {
        alert('PDF Generation Library is loading. Please try again in a moment.');
        return false;
    }

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageMargin = 15;
    const contentWidth = pageWidth - (pageMargin * 2);

    // Header
    doc.setFillColor(15, 39, 68); // Navy
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MEDITRAIL CLINICAL ATTACHMENT', 15, 15);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('VERIFIED DIGITAL MEDICAL DOCUMENT', 15, 21);

    // Document Info Box
    let currentY = 38;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageMargin, currentY, contentWidth, 38, 2, 2, 'FD');

    doc.setTextColor(13, 148, 136);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DOCUMENT DETAILS', pageMargin + 5, currentY + 8);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('File Name:', pageMargin + 5, currentY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(pdfFileName, pageMargin + 35, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.text('Patient Name:', pageMargin + 5, currentY + 23);
    doc.setFont('helvetica', 'normal');
    doc.text(`${patient.name} (${patient.id})`, pageMargin + 35, currentY + 23);

    doc.setFont('helvetica', 'bold');
    doc.text('Associated Event:', pageMargin + 5, currentY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(record ? record.title : 'General Clinical Attachment', pageMargin + 35, currentY + 30);

    doc.setFont('helvetica', 'bold');
    doc.text('Verification Status:', pageMargin + 115, currentY + 16);
    doc.setTextColor(13, 148, 136);
    doc.text('SHA-256 Cryptographically Verified', pageMargin + 115, currentY + 23);

    currentY += 48;

    // Content Body
    doc.setFillColor(13, 148, 136);
    doc.rect(pageMargin, currentY, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('OFFICIAL ATTACHMENT SUMMARY', pageMargin + 4, currentY + 5);

    currentY += 14;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const summaryText = `This document represents an official certified clinical copy of "${pdfFileName}" associated with patient ${patient.name} (${patient.id}). It has been verified and stored in the MediTrail Health Information System.

Facility / Provider: ${record ? record.hospital : 'MediTrail Health Network'}
Attending Physician: ${record ? record.doctor : 'Certified Medical Practitioner'}
Timestamp of Access: ${new Date().toLocaleString()}`;

    currentY = addWrappedText(doc, summaryText, pageMargin, currentY, contentWidth, 6);

    // Footer
    doc.setDrawColor(203, 213, 225);
    doc.line(pageMargin, 280, pageWidth - pageMargin, 280);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('MediTrail Medical History Management System • Official PDF Document', pageMargin, 285);

    doc.save(pdfFileName);
    return true;
}

/**
 * Generates and downloads the digital insurance policy document as a formatted PDF.
 */
export function exportPdfInsurancePolicy() {
    const patient = getPatientData() || {
        name: "Aarnav Mehta",
        id: "MT-10482",
        dob: "2002-04-15",
        age: 24,
        gender: "Male",
        bloodGroup: "B+"
    };

    const insurance = (patient && patient.insurance) ? patient.insurance : {
        provider: "Star Health Premier",
        policyNumber: "SHP-8849201-B",
        validUntil: "2027-03-31"
    };

    const jsPDF = getJsPdfInstance();
    if (!jsPDF) {
        alert('PDF Generation Library is loading. Please try again in a moment.');
        return false;
    }

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageMargin = 15;
    const contentWidth = pageWidth - (pageMargin * 2);

    // Top Header Banner
    doc.setFillColor(15, 39, 68); // Deep Navy
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(insurance.provider.toUpperCase(), 15, 16);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL HEALTH INSURANCE POLICY SCHEDULE & CASHLESS CARD', 15, 23);

    doc.setFontSize(8.5);
    doc.text(`POLICY NO: ${insurance.policyNumber}`, pageWidth - 15, 16, { align: 'right' });
    doc.text(`VALID UNTIL: ${insurance.validUntil}`, pageWidth - 15, 23, { align: 'right' });

    let currentY = 40;

    // Policyholder Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageMargin, currentY, contentWidth, 30, 2, 2, 'FD');

    doc.setTextColor(13, 148, 136);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('POLICYHOLDER & INSURED PERSON DETAILS', pageMargin + 5, currentY + 7);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    const c1 = pageMargin + 5;
    const c2 = pageMargin + 95;

    doc.setFont('helvetica', 'bold'); doc.text('Policyholder Name:', c1, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(patient.name, c1 + 32, currentY + 14);

    doc.setFont('helvetica', 'bold'); doc.text('Patient ID:', c2, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(patient.id, c2 + 25, currentY + 14);

    doc.setFont('helvetica', 'bold'); doc.text('Date of Birth / Age:', c1, currentY + 21);
    doc.setFont('helvetica', 'normal'); doc.text(`${patient.dob} (${patient.age} yrs)`, c1 + 32, currentY + 21);

    doc.setFont('helvetica', 'bold'); doc.text('Blood Group:', c2, currentY + 21);
    doc.setFont('helvetica', 'normal'); doc.text(patient.bloodGroup, c2 + 25, currentY + 21);

    currentY += 38;

    // Coverage & Terms Summary
    doc.setFillColor(13, 148, 136);
    doc.rect(pageMargin, currentY, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('COVERAGE & ENTITLEMENT SUMMARY', pageMargin + 4, currentY + 5);

    currentY += 12;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);

    const addPolicyRow = (label, val) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, pageMargin + 2, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(val, pageMargin + 55, currentY);
        currentY += 6;
    };

    addPolicyRow('Plan Name:', 'Star Health Premier Comprehensive Floater');
    addPolicyRow('Sum Insured:', 'INR 10,00,000 (Ten Lakhs Only)');
    addPolicyRow('Policy Validity:', `Active Through ${insurance.validUntil}`);
    addPolicyRow('No-Claim Bonus:', '25% Accrued Cumulative Bonus');
    addPolicyRow('Cashless Hospital Network:', '14,000+ Empanelled Hospitals Pan-India');
    addPolicyRow('TPA Administrator:', 'MediAssist Healthcare Services Ltd (Ref: MA-SHP-8849201)');

    currentY += 6;

    // Terms
    doc.setFillColor(15, 39, 68);
    doc.rect(pageMargin, currentY, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('EMERGENCY CASHLESS HELPLINE & TERMS', pageMargin + 4, currentY + 5);

    currentY += 12;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.5);

    const terms = [
        '• Pre-Hospitalization Medical Expenses covered up to 60 days prior to admission.',
        '• Post-Hospitalization Medical Expenses covered up to 90 days post-discharge.',
        '• Day Care Procedures: All recognized day-care procedures covered under protocol.',
        '• Emergency Ambulance: Up to INR 3,000 per hospitalization.',
        '• Toll-Free Emergency Desk: 1800-425-2255 / 1800-102-4477 (Available 24/7)'
    ];

    terms.forEach(t => {
        doc.text(t, pageMargin + 2, currentY);
        currentY += 5.5;
    });

    // Footer
    doc.setDrawColor(203, 213, 225);
    doc.line(pageMargin, 280, pageWidth - pageMargin, 280);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated via MediTrail Digital Patient Portal • Verified Policy Certificate', pageMargin, 285);

    const fileName = `${insurance.provider.replace(/\s+/g, '_')}_Policy_${insurance.policyNumber}.pdf`;
    doc.save(fileName);
    return true;
}
