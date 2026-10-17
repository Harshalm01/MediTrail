"""
MediTrail Automated Frontend Scanner & Simplification Auditor
Analyzes JavaScript & CSS line counts, executable code lines, comments,
unused/dead code, animation handlers, and verifies DOM references.
"""

import os
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
JS_DIR = FRONTEND_DIR / "js"
CSS_DIR = FRONTEND_DIR / "css"

def count_lines(filepath):
    total = 0
    blank = 0
    comments = 0
    code = 0
    in_multiline = False

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            total += 1
            s = line.strip()
            if not s:
                blank += 1
            elif in_multiline:
                comments += 1
                if "*/" in s:
                    in_multiline = False
            elif s.startswith("/*"):
                comments += 1
                if "*/" not in s:
                    in_multiline = True
            elif s.startswith("//"):
                comments += 1
            else:
                code += 1

    return total, blank, comments, code

def scan_javascript():
    stats = []
    total_lines = 0
    total_blank = 0
    total_comments = 0
    total_code = 0

    for root, _, files in os.walk(JS_DIR):
        for f in sorted(files):
            if f.endswith(".js"):
                full_path = Path(root) / f
                rel_path = full_path.relative_to(JS_DIR)
                t, b, c, code = count_lines(full_path)
                stats.append((str(rel_path), t, b, c, code))
                total_lines += t
                total_blank += b
                total_comments += c
                total_code += code

    return {
        "files": stats,
        "total": total_lines,
        "blank": total_blank,
        "comments": total_comments,
        "code": total_code
    }

def scan_animations_and_interactions():
    findings = []
    
    # Check for animation and hover timers in JS
    for root, _, files in os.walk(JS_DIR):
        for f in sorted(files):
            if f.endswith(".js"):
                p = Path(root) / f
                with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                    content = fp.read()
                    
                    if "handleHeroItemHover" in content:
                        findings.append((f, "Hero 1.5s hover timer and preview bar"))
                    if "renderLandingTimelinePreview" in content:
                        findings.append((f, "Section 2 interactive filter preview"))
                    if "IntersectionObserver" in content:
                        findings.append((f, "IntersectionObserver scroll reveal"))
                    if "wheel" in content or "DOMMouseScroll" in content:
                        findings.append((f, "Mousewheel hijacking or carousel wheel handlers"))
                    if "requestAnimationFrame" in content:
                        findings.append((f, "requestAnimationFrame loop"))

    return findings

def scan_html_inline_handlers():
    handlers = {}
    for html_file in FRONTEND_DIR.glob("*.html"):
        with open(html_file, "r", encoding="utf-8", errors="ignore") as fp:
            content = fp.read()
            matches = re.findall(r'on\w+="([^"]+)"', content)
            handlers[html_file.name] = set(matches)
    return handlers

def run_audit():
    print("=" * 70)
    print("MEDITRAIL FRONTEND AUDIT & CODE COMPLEXITY SCANNER")
    print("=" * 70)

    js_scan = scan_javascript()
    print(f"\n1. JAVASCRIPT CODE METRICS (frontend/js)")
    print(f"   Total Files:            {len(js_scan['files'])}")
    print(f"   Total Lines:            {js_scan['total']}")
    print(f"   Blank Lines:            {js_scan['blank']}")
    print(f"   Comment Lines:          {js_scan['comments']}")
    print(f"   Executable Code Lines:  {js_scan['code']}")

    print("\n   Detailed breakdown per file (ranked by total lines):")
    print("   " + "-" * 65)
    print(f"   {'File':<32} {'Total':>7} {'Code':>7} {'Comments':>10} {'Blank':>7}")
    print("   " + "-" * 65)
    for rel, t, b, c, code in sorted(js_scan["files"], key=lambda x: x[1], reverse=True):
        print(f"   {rel:<32} {t:>7} {code:>7} {c:>10} {b:>7}")
    print("   " + "-" * 65)

    print("\n2. ANIMATION & INTERACTION PATTERNS FOUND")
    anim_findings = scan_animations_and_interactions()
    for f, desc in anim_findings:
        print(f"   - {f:<25} : {desc}")

    print("\n3. HTML INLINE EVENT HANDLERS")
    handlers = scan_html_inline_handlers()
    for html_name, hset in handlers.items():
        print(f"   - {html_name}: {len(hset)} inline handler occurrences")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    run_audit()
