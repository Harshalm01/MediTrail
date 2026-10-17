/**
 * MediTrail - Debug Mode Controller
 *
 * Debug mode is controlled entirely by `DEBUG_MODE` in runner.py.
 * The server injects `window.__MEDITRAIL_DEBUG__ = true/false` via /js/debug-config.js.
 *
 * No localStorage, no persistence — just restart the server with DEBUG_MODE = True/False.
 */

/**
 * Returns true if debug mode is active (set by the server via debug-config.js).
 * @returns {boolean}
 */
export function isDebugEnabled() {
    return window.__MEDITRAIL_DEBUG__ === true;
}

// Backward-compatible alias
export const isDebugMode = isDebugEnabled;

/**
 * Toggles the `debug` CSS class on <html> so debug-only styles can be shown/hidden.
 */
export function applyDebugState() {
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.toggle('debug', isDebugEnabled());
    }
}

/**
 * Conditional debug log — only outputs when debug mode is ON.
 * Never log secrets, tokens, passwords, or private user data.
 * @param {...any} args
 */
export function debugLog(...args) {
    if (isDebugEnabled()) {
        console.log('[Debug]', ...args);
    }
}

// Kept for backwards compatibility — these now just toggle the CSS class at runtime
// but do NOT persist anything. Restart the server to permanently change debug mode.
export function enableDebug() {
    window.__MEDITRAIL_DEBUG__ = true;
    applyDebugState();
    console.info('[Debug] Enabled (runtime only — restart server with DEBUG_MODE=True to persist)');
}

export function disableDebug() {
    window.__MEDITRAIL_DEBUG__ = false;
    applyDebugState();
    console.info('[Debug] Disabled (runtime only — restart server with DEBUG_MODE=False to persist)');
}

// Apply debug CSS class on load
applyDebugState();

// Announce debug mode status when enabled
if (isDebugEnabled()) {
    console.info('[MediTrail Debug Mode] Active (DEBUG_MODE = True in runner.py)');
}

// Expose to DevTools console
if (typeof window !== 'undefined') {
    window.enableDebug = enableDebug;
    window.disableDebug = disableDebug;
    window.isDebugEnabled = isDebugEnabled;
}

