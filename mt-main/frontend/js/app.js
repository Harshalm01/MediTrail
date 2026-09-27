/**
 * MediTrail - Application Core & Shared Coordination Controller
 * 
 * Provides view switching, modal management, data access service wrappers,
 * and high-level platform coordination across all sub-views.
 */

// Import view modules
import {
    renderDashboard,
    resetDashboardState,
    updateStatCarouselCard,
    nextStatCard,
    prevStatCard,
    goToStatCard,
    handleStatCardClick,
    handleStatCardWheel,
    startStatCarouselAutoRotate,
    stopStatCarouselAutoRotate
} from './views/dashboard.js?v=3';

import {
    renderTimeline,
    scrollToYearSection,
    setTimelineFilter,
    handleTimelineSearch,
    resetTimelineFilters,
    updateFilterPillsUI
} from './views/timeline.js';

import { renderMedicationsView } from './views/medications.js';
import { renderSharedAccess } from './views/shared-access.js';
import {
    openProfileModal,
    closeProfileModal,
    openEditEmergencyModal,
    closeEditEmergencyModal,
    saveEmergencyChanges,
    renderEmergencyView,
    focusTagInput,
    removeTag,
    handleTagInputKeydown,
    triggerPolicyFileInput,
    handlePolicyFileUpload,
    triggerPolicyFileInputAtIndex,
    handlePolicyFileUploadAtIndex,
    addNewPolicyRow,
    removePolicyRow,
    updatePolicyField,
    renderPoliciesEditList,
    addNewConditionRow,
    removeConditionRow,
    updateConditionField
} from './views/emergency.js';
import {
    scrollLandingToSection,
    initLandingScrollExperience,
    updateActiveLandingDot,
    handleHeroItemHover,
    cancelHeroItemHover,
    initTimelinePreviewCard,
    renderLandingTimelinePreview,
    scrollLandingPreviewToYear
} from './views/landing.js';
import {
    selectTab,
    toggleMobileSidebar,
    navigateToView,
    currentView,
    currentTab
} from './core/navigation.js?v=3';
import {
    showToast,
    openRecordDetail,
    downloadMedicalRecord,
    downloadActiveDrawerRecord,
    downloadAttachment,
    closeRecordDetail,
    viewPolicyDocument,
    closePolicyModal,
    downloadPolicyDocument,
    openQrModal,
    closeQrModal,
    refreshQrCode,
    copyQrShareLink,
    triggerButtonOnHover,
    cancelButtonHoverTrigger
} from './core/ui.js';
import {
    getPatientData,
    getMedicalRecords,
    getRecordById,
    getActiveMedications,
    getRecentReports,
    getSharedAccessList,
    formatDate
} from './services/data.js';
import { generateQrCodeSvg } from './utils/qr.js';
import { enableDebug, disableDebug, isDebugEnabled, isDebugMode, debugLog } from './utils/debug.js';

// Re-export for callers
export {
    scrollLandingToSection,
    initLandingScrollExperience,
    selectTab,
    toggleMobileSidebar,
    navigateToView,
    currentView,
    currentTab,
    showToast,
    openRecordDetail,
    downloadMedicalRecord,
    downloadActiveDrawerRecord,
    downloadAttachment,
    closeRecordDetail,
    viewPolicyDocument,
    closePolicyModal,
    downloadPolicyDocument,
    openQrModal,
    closeQrModal,
    refreshQrCode,
    copyQrShareLink,
    getPatientData,
    getMedicalRecords,
    getRecordById,
    getActiveMedications,
    getRecentReports,
    getSharedAccessList,
    formatDate,
    updateFilterPillsUI,
    enableDebug,
    disableDebug,
    isDebugEnabled,
    isDebugMode,
    debugLog
};

// (Data access service layer extracted to ./services/data.js)
// (UI helpers, record drawer, policy modal, and QR modal extracted to ./core/ui.js)
// (updateFilterPillsUI consolidated into ./views/timeline.js)

// ==========================================================================
// 2. WINDOW-SCOPE BRIDGE (Ensures 100% compatibility with HTML inline handlers)
// ==========================================================================

if (typeof window !== 'undefined') {
    window.selectTab = selectTab;
    window.toggleMobileSidebar = toggleMobileSidebar;
    window.navigateToView = navigateToView;
    window.showToast = showToast;
    window.updateFilterPillsUI = updateFilterPillsUI;
    window.openRecordDetail = openRecordDetail;
    window.downloadMedicalRecord = downloadMedicalRecord;
    window.downloadActiveDrawerRecord = downloadActiveDrawerRecord;
    window.downloadAttachment = downloadAttachment;
    window.closeRecordDetail = closeRecordDetail;
    window.viewPolicyDocument = viewPolicyDocument;
    window.closePolicyModal = closePolicyModal;
    window.downloadPolicyDocument = downloadPolicyDocument;
    window.generateQrCodeSvg = generateQrCodeSvg;
    window.openQrModal = openQrModal;
    window.closeQrModal = closeQrModal;
    window.refreshQrCode = refreshQrCode;
    window.copyQrShareLink = copyQrShareLink;
    window.scrollLandingToSection = scrollLandingToSection;
    window.initLandingScrollExperience = initLandingScrollExperience;
    window.updateActiveLandingDot = updateActiveLandingDot;
    window.handleHeroItemHover = handleHeroItemHover;
    window.cancelHeroItemHover = cancelHeroItemHover;
    window.triggerButtonOnHover = triggerButtonOnHover;
    window.cancelButtonHoverTrigger = cancelButtonHoverTrigger;
    window.initTimelinePreviewCard = initTimelinePreviewCard;
    window.renderLandingTimelinePreview = renderLandingTimelinePreview;
    window.scrollLandingPreviewToYear = scrollLandingPreviewToYear;

    // View-specific handlers called from HTML inline events
    window.renderDashboard = renderDashboard;
    window.nextStatCard = nextStatCard;
    window.prevStatCard = prevStatCard;
    window.goToStatCard = goToStatCard;
    window.handleStatCardClick = handleStatCardClick;
    window.handleStatCardWheel = handleStatCardWheel;
    window.startStatCarouselAutoRotate = startStatCarouselAutoRotate;
    window.stopStatCarouselAutoRotate = stopStatCarouselAutoRotate;
    window.resetDashboardState = resetDashboardState;

    window.renderTimeline = renderTimeline;
    window.scrollToYearSection = scrollToYearSection;
    window.setTimelineFilter = setTimelineFilter;
    window.handleTimelineSearch = handleTimelineSearch;
    window.resetTimelineFilters = resetTimelineFilters;

    window.renderMedicationsView = renderMedicationsView;
    window.renderSharedAccess = renderSharedAccess;
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.openEditEmergencyModal = openEditEmergencyModal;
    window.closeEditEmergencyModal = closeEditEmergencyModal;
    window.saveEmergencyChanges = saveEmergencyChanges;
    window.renderEmergencyView = renderEmergencyView;
    window.focusTagInput = focusTagInput;
    window.removeTag = removeTag;
    window.handleTagInputKeydown = handleTagInputKeydown;
    window.triggerPolicyFileInput = triggerPolicyFileInput;
    window.handlePolicyFileUpload = handlePolicyFileUpload;
    window.triggerPolicyFileInputAtIndex = triggerPolicyFileInputAtIndex;
    window.handlePolicyFileUploadAtIndex = handlePolicyFileUploadAtIndex;
    window.addNewPolicyRow = addNewPolicyRow;
    window.removePolicyRow = removePolicyRow;
    window.updatePolicyField = updatePolicyField;
    window.renderPoliciesEditList = renderPoliciesEditList;
    window.addNewConditionRow = addNewConditionRow;
    window.removeConditionRow = removeConditionRow;
    window.updateConditionField = updateConditionField;
    window.enableDebug = enableDebug;
    window.disableDebug = disableDebug;
    window.isDebugEnabled = isDebugEnabled;
}
