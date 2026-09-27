import os
import re
import json

# Absolute path resolving to MediTrail root
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
output_file = os.path.join(os.path.dirname(__file__), 'output.json')

files_to_scan = [
    'frontend/index.html',
    'frontend/css/style.css',
    'frontend/css/components.css',
    'frontend/js/data.js',
    'frontend/js/app.js'
]

file_data = {}
for rel_path in files_to_scan:
    full_path = os.path.join(root_dir, rel_path)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        lines = content.splitlines()
        stat = os.stat(full_path)
        file_data[rel_path] = {
            'path': rel_path,
            'sizeBytes': stat.st_size,
            'lineCount': len(lines),
            'content': content,
            'lines': lines
        }

# 1. Project structure & summary
file_summaries = []
for rel_path, d in file_data.items():
    file_summaries.append({
        'file': rel_path,
        'sizeBytes': d['sizeBytes'],
        'lineCount': d['lineCount']
    })

all_files = []
for root, dirs, fnames in os.walk(root_dir):
    if '.git' in root or 'scanner' in root:
        continue
    for f in fnames:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, root_dir)
        all_files.append({
            'path': rel,
            'sizeBytes': os.path.getsize(full)
        })

# 2. HTML Audit
html_content = file_data.get('frontend/index.html', {}).get('content', '')

inline_styles = re.findall(r'style\s*=\s*["\']([^"\']*)["\']', html_content, re.IGNORECASE)
inline_events = re.findall(r'\s(on[a-z]+)\s*=\s*["\']([^"\']*)["\']', html_content, re.IGNORECASE)
inline_scripts_raw = re.findall(r'<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>', html_content, re.IGNORECASE)
inline_scripts = [{
    'lines': len(s.splitlines()),
    'charLength': len(s),
    'sample': s.strip()[:150]
} for s in inline_scripts_raw]

script_srcs = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
css_links = re.findall(r'<link[^>]+href=["\']([^"\']+)["\']', html_content, re.IGNORECASE)
inline_svgs = re.findall(r'<svg\b[^>]*>([\s\S]*?)<\/svg>', html_content, re.IGNORECASE)

ids_in_html = re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']', html_content, re.IGNORECASE)
id_counts = {}
for i in ids_in_html:
    id_counts[i] = id_counts.get(i, 0) + 1
duplicate_ids = [k for k, v in id_counts.items() if v > 1]

button_tags = re.findall(r'<button\b([^>]*)>', html_content, re.IGNORECASE)
buttons_without_type = [b for b in button_tags if not re.search(r'type\s*=', b, re.IGNORECASE)]

# 3. CSS Audit
def audit_css(content):
    clean = re.sub(r'/\*[\s\S]*?\*/', '', content)
    important_count = len(re.findall(r'!important', clean, re.IGNORECASE))
    z_indices = re.findall(r'z-index\s*:\s*([^;]+);', clean, re.IGNORECASE)
    absolute_count = len(re.findall(r'position\s*:\s*absolute', clean, re.IGNORECASE))
    fixed_count = len(re.findall(r'position\s*:\s*fixed', clean, re.IGNORECASE))
    media_queries = re.findall(r'@media[^{]+', clean)
    
    rules = re.findall(r'([^{}]+)\{([^{}]+)\}', clean)
    selector_counts = {}
    id_selectors = []
    element_selectors = []
    
    for selectors_str, body in rules:
        for s in selectors_str.split(','):
            s = s.strip()
            if not s or s.startswith('@'):
                continue
            selector_counts[s] = selector_counts.get(s, 0) + 1
            if '#' in s:
                id_selectors.append(s)
            if re.match(r'^[a-z]+(\s|$)', s):
                element_selectors.append(s)
                
    duplicate_selectors = {k: v for k, v in selector_counts.items() if v > 1}
    
    return {
        'importantCount': important_count,
        'zIndices': [z.strip() for z in z_indices],
        'absoluteCount': absolute_count,
        'fixedCount': fixed_count,
        'mediaQueryCount': len(media_queries),
        'mediaQueries': [m.strip() for m in media_queries],
        'totalRules': len(rules),
        'totalSelectors': sum(selector_counts.values()),
        'uniqueSelectors': len(selector_counts),
        'duplicateSelectorsCount': len(duplicate_selectors),
        'duplicateSelectorsSample': list(duplicate_selectors.items())[:25],
        'idSelectorsCount': len(id_selectors),
        'idSelectorsSample': id_selectors[:20]
    }

css_audits = {
    'style.css': audit_css(file_data.get('frontend/css/style.css', {}).get('content', '')),
    'components.css': audit_css(file_data.get('frontend/css/components.css', {}).get('content', ''))
}

# 4. JavaScript Audit
def audit_js(content, filename):
    lines = content.splitlines()
    func_pattern = r'(?:function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*function\s*\(([^)]*)\))'
    functions = []
    for m in re.finditer(func_pattern, content):
        name = m.group(1) or m.group(3) or m.group(5)
        params = m.group(2) or m.group(4) or m.group(6) or ''
        start_idx = m.start()
        line_no = content[:start_idx].count('\n') + 1
        functions.append({
            'name': name,
            'line': line_no,
            'params': [p.strip() for p in params.split(',') if p.strip()]
        })
        
    func_sizes = []
    for i, f in enumerate(functions):
        start_line = f['line']
        end_line = functions[i+1]['line'] if i + 1 < len(functions) else len(lines)
        func_sizes.append({
            'name': f['name'],
            'startLine': start_line,
            'approxLines': end_line - start_line
        })
    func_sizes.sort(key=lambda x: x['approxLines'], reverse=True)
    
    top_level_vars = []
    level = 0
    for idx, line in enumerate(lines):
        clean_line = re.sub(r'//.*$', '', line)
        if level == 0:
            var_match = re.match(r'^\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)', clean_line)
            if var_match:
                top_level_vars.append({'name': var_match.group(1), 'line': idx + 1})
        level += clean_line.count('{') - clean_line.count('}')
        if level < 0: level = 0
        
    event_listeners = re.findall(r'addEventListener\s*\(\s*["\']([^"\']+)["\']', content)
    inner_html_matches = len(re.findall(r'\.innerHTML\s*=', content))
    dom_queries = len(re.findall(r'document\.(?:getElementById|querySelector|querySelectorAll|getElementsByClassName|getElementsByTagName)', content))
    direct_styles = len(re.findall(r'\.style\.[a-zA-Z]+\s*=', content))
    set_attr_styles = len(re.findall(r'setAttribute\s*\(\s*["\']style["\']', content))
    class_list = len(re.findall(r'\.classList\.(?:add|remove|toggle|contains)', content))
    local_storage = re.findall(r'localStorage\.(getItem|setItem|removeItem|clear)', content)
    session_storage = re.findall(r'sessionStorage\.(getItem|setItem|removeItem|clear)', content)
    timers = len(re.findall(r'(?:setTimeout|setInterval)\s*\(', content))
    raf = len(re.findall(r'requestAnimationFrame\s*\(', content))
    intersection_observers = len(re.findall(r'new\s+IntersectionObserver', content))
    resize_listeners = len(re.findall(r'["\']resize["\']', content))
    scroll_listeners = len(re.findall(r'["\']scroll["\']', content))
    fetch_calls = len(re.findall(r'fetch\s*\(', content))
    try_catch = len(re.findall(r'try\s*\{', content))
    
    return {
        'totalFunctions': len(functions),
        'topLevelVarsCount': len(top_level_vars),
        'topLevelVars': top_level_vars,
        'largestFunctions': func_sizes[:10],
        'eventListenersCount': len(event_listeners),
        'eventListenerTypes': event_listeners,
        'innerHtmlCount': inner_html_matches,
        'domQueriesCount': dom_queries,
        'directStylesCount': direct_styles,
        'setAttrStylesCount': set_attr_styles,
        'classListCount': class_list,
        'localStorageCalls': local_storage,
        'sessionStorageCalls': session_storage,
        'timersCount': timers,
        'requestAnimationFrameCount': raf,
        'intersectionObserverCount': intersection_observers,
        'resizeListenersCount': resize_listeners,
        'scrollListenersCount': scroll_listeners,
        'fetchCallsCount': fetch_calls,
        'tryCatchCount': try_catch
    }

js_audits = {
    'data.js': audit_js(file_data.get('frontend/js/data.js', {}).get('content', ''), 'data.js'),
    'app.js': audit_js(file_data.get('frontend/js/app.js', {}).get('content', ''), 'app.js')
}

app_content = file_data.get('frontend/js/app.js', {}).get('content', '')
height_calc = re.findall(r'(?:offsetHeight|scrollHeight|clientHeight|getBoundingClientRect|style\.height)', app_content)

output_data = {
    'allFiles': all_files,
    'fileSummaries': file_summaries,
    'htmlAudit': {
        'inlineStylesCount': len(inline_styles),
        'inlineStylesSample': inline_styles[:20],
        'inlineEventsCount': len(inline_events),
        'inlineEvents': inline_events[:20],
        'inlineScriptsCount': len(inline_scripts),
        'inlineScripts': inline_scripts,
        'scriptSrcs': script_srcs,
        'cssLinks': css_links,
        'inlineSvgsCount': len(inline_svgs),
        'duplicateIdsCount': len(duplicate_ids),
        'duplicateIds': duplicate_ids,
        'buttonsWithoutTypeCount': len(buttons_without_type)
    },
    'cssAudits': css_audits,
    'jsAudits': js_audits,
    'dashboardHeightCalculations': len(height_calc),
    'heightCalcKeywords': list(set(height_calc))
}

with open(output_file, 'w', encoding='utf-8') as out:
    json.dump(output_data, out, indent=2)

print("Scan completed. output.json saved.")
