import os
import re
import json

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
output_file = os.path.join(os.path.dirname(__file__), 'deep_output.json')

with open(os.path.join(root_dir, 'frontend/js/app.js'), 'r', encoding='utf-8') as f:
    app_js = f.read()

with open(os.path.join(root_dir, 'frontend/index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

with open(os.path.join(root_dir, 'frontend/css/components.css'), 'r', encoding='utf-8') as f:
    components_css = f.read()

with open(os.path.join(root_dir, 'frontend/js/data.js'), 'r', encoding='utf-8') as f:
    data_js = f.read()

fetch_matches = []
for m in re.finditer(r'fetch\s*\(([^)]+)\)', app_js):
    start = max(0, m.start() - 100)
    end = min(len(app_js), m.end() + 100)
    fetch_matches.append(app_js[start:end].strip())

external_links = re.findall(r'<(?:link|script|img)[^>]+(?:href|src)=["\'](https?://[^"\']+)["\']', html)

dash_height_snippets = []
for m in re.finditer(r'(?:syncDashboardListHeights|adjustDashboardListHeights|dashboard.*height|dash-medications-list)', app_js, re.IGNORECASE):
    line_no = app_js[:m.start()].count('\n') + 1
    dash_height_snippets.append({
        'match': m.group(0),
        'line': line_no,
        'context': app_js[max(0, m.start() - 200):min(len(app_js), m.end() + 300)]
    })

func_names = re.findall(r'function\s+([a-zA-Z0-9_$]+)\s*\(', app_js)
data_keys = re.findall(r'^\s*([a-zA-Z0-9_$]+)\s*:', data_js, re.MULTILINE)
svg_views = re.findall(r'<svg[^>]*viewBox=["\']([^"\']+)["\'][^>]*>([\s\S]*?)<\/svg>', html)
svg_paths_count = [len(re.findall(r'<path|<circle|<rect|<polygon', s[1])) for s in svg_views]

nav_snippets = []
for m in re.finditer(r'function\s+(?:navigateToView|selectTab|switchTab)', app_js):
    line_no = app_js[:m.start()].count('\n') + 1
    nav_snippets.append({
        'name': m.group(0),
        'line': line_no,
        'body': app_js[m.start():m.start() + 1500]
    })

deep_results = {
    'externalLinks': external_links,
    'fetchMatches': fetch_matches,
    'allFunctionsInApp': func_names,
    'dataKeysInDataJs': data_keys,
    'svgDetails': {
        'totalSvgs': len(svg_views),
        'pathCounts': svg_paths_count[:20]
    },
    'dashHeightSnippets': dash_height_snippets[:5],
    'navSnippets': nav_snippets
}

with open(output_file, 'w', encoding='utf-8') as out:
    json.dump(deep_results, out, indent=2)

print("Deep scan complete. deep_output.json saved.")
