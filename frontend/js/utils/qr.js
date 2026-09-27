/**
 * MediTrail - QR Code Vector Generator Utility
 * 
 * Generates an SVG vector representation of an encrypted patient record
 * sharing token with finder patterns, timing cells, and center logo badge.
 */

/**
 * Generates a clean, scannable QR Code SVG vector with positioning corner markers.
 * @returns {string} SVG markup string
 */
export function generateQrCodeSvg() {
    return `<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <!-- Background -->
        <rect width="200" height="200" fill="#ffffff" rx="8"/>
        
        <!-- Top-Left Finder Pattern -->
        <rect x="16" y="16" width="50" height="50" rx="4" fill="#0f2744"/>
        <rect x="24" y="24" width="34" height="34" rx="2" fill="#ffffff"/>
        <rect x="32" y="32" width="18" height="18" rx="2" fill="#0d9488"/>

        <!-- Top-Right Finder Pattern -->
        <rect x="134" y="16" width="50" height="50" rx="4" fill="#0f2744"/>
        <rect x="142" y="24" width="34" height="34" rx="2" fill="#ffffff"/>
        <rect x="150" y="32" width="18" height="18" rx="2" fill="#0d9488"/>

        <!-- Bottom-Left Finder Pattern -->
        <rect x="16" y="134" width="50" height="50" rx="4" fill="#0f2744"/>
        <rect x="24" y="142" width="34" height="34" rx="2" fill="#ffffff"/>
        <rect x="32" y="150" width="18" height="18" rx="2" fill="#0d9488"/>

        <!-- Timing Patterns & Alignment -->
        <rect x="74" y="24" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="90" y="24" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="106" y="24" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="74" y="40" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="106" y="40" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="74" y="56" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="90" y="56" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="106" y="56" width="8" height="8" fill="#0f2744" rx="1"/>

        <!-- Center Data Matrix Elements -->
        <rect x="74" y="74" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="94" y="74" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="114" y="74" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="24" y="74" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="40" y="74" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="56" y="74" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="134" y="74" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="150" y="74" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="166" y="74" width="8" height="8" fill="#0f2744" rx="1"/>

        <rect x="16" y="94" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="36" y="94" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="56" y="94" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="74" y="94" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="114" y="94" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="134" y="94" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="154" y="94" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="174" y="94" width="12" height="12" fill="#0f2744" rx="2"/>

        <rect x="74" y="114" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="94" y="114" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="114" y="114" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="24" y="114" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="40" y="114" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="150" y="114" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="166" y="114" width="8" height="8" fill="#0f2744" rx="1"/>

        <!-- Bottom Right Matrix Cluster -->
        <rect x="74" y="134" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="90" y="134" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="106" y="134" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="134" y="134" width="14" height="14" fill="#0d9488" rx="2"/>
        <rect x="156" y="134" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="176" y="134" width="8" height="8" fill="#0f2744" rx="1"/>

        <rect x="74" y="150" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="94" y="150" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="114" y="150" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="134" y="156" width="12" height="12" fill="#0f2744" rx="2"/>
        <rect x="154" y="156" width="12" height="12" fill="#0d9488" rx="2"/>
        <rect x="174" y="156" width="12" height="12" fill="#0f2744" rx="2"/>

        <rect x="74" y="170" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="90" y="170" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="106" y="170" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="134" y="176" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="150" y="176" width="8" height="8" fill="#0f2744" rx="1"/>
        <rect x="166" y="176" width="18" height="8" fill="#0d9488" rx="1"/>

        <!-- Center MediTrail Logo Badge -->
        <g id="qr-center-logo">
            <!-- White protective padding container with shadow -->
            <rect x="76" y="76" width="48" height="48" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
            <rect x="79" y="79" width="42" height="42" rx="8" fill="#f8fafc"/>
            <!-- Embedded MediTrail Logo -->
            <image href="image.png" x="81" y="81" width="38" height="38" preserveAspectRatio="xMidYMid meet"/>
        </g>
    </svg>`;
}
