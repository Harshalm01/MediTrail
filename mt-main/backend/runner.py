import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend'))

# ── Debug toggle ──────────────────────────────────────────────────────────────
# Set to True to enable diagnostic logging in the browser console.
# Set to False (default) for a clean console with no application output.
DEBUG_MODE = True   
# ─────────────────────────────────────────────────────────────────────────────

def get_debug_mode():
    """Dynamically reads the DEBUG_MODE flag from runner.py so changes apply immediately."""
    try:
        with open(os.path.abspath(__file__), 'r', encoding='utf-8') as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith('DEBUG_MODE') and '=' in stripped:
                    val = stripped.split('=', 1)[1].split('#')[0].strip()
                    return val.lower() == 'true'
    except Exception:
        pass
    return DEBUG_MODE


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Route /admin or /admin/ to admin.html
        if self.path in ('/admin', '/admin/'):
            self.path = '/admin.html'

        # Serve the debug config as a virtual JS file — dynamically reflects runner.py
        if self.path == '/js/debug-config.js':
            is_debug = get_debug_mode()
            payload = f"window.__MEDITRAIL_DEBUG__ = {'true' if is_debug else 'false'};".encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Content-Length', len(payload))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def end_headers(self):
        # Development cache headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress 404 noise for browser-internal probes (e.g. devtools.json)
        if args and '404' in str(args[1]) and 'devtools' in str(args[0]):
            return
        super().log_message(format, *args)


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 64


def run():
    try:
        with ThreadingServer(('', PORT), Handler) as httpd:
            url = f'http://localhost:{PORT}/'
            debug_status = 'ON' if DEBUG_MODE else 'OFF'
            print('=' * 60)
            print(f'MediTrail Local Server running at: {url}')
            print(f'Serving files from: {DIRECTORY}')
            print(f'Debug logging: {debug_status}  (change DEBUG_MODE in runner.py)')
            print('Press Ctrl+C to stop.')
            print('=' * 60)
            webbrowser.open(url)
            httpd.serve_forever()
    except OSError as e:
        if e.winerror == 10048 or 'address already in use' in str(e).lower():
            url = f'http://localhost:{PORT}/'
            print('=' * 60)
            print(f'MediTrail server is already running on port {PORT}!')
            print(f'Opening browser at: {url}')
            print('=' * 60)
            webbrowser.open(url)
        else:
            raise e
    except KeyboardInterrupt:
        print('\nMediTrail server stopped.')
        sys.exit(0)


if __name__ == '__main__':
    run()


