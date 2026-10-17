import http.server
import socketserver
import webbrowser
import os
import sys
import subprocess
import time
import urllib.request
import urllib.error
import socket
import atexit
import signal
import threading

# ── Project Path Resolution ──────────────────────────────────────────────────
# Resolve all directories relative to the location of runner.py (the project root)
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')
JAVA_SERVER_DIR = os.path.join(PROJECT_ROOT, 'backend', 'java-server')
JAVA_SRC_DIR = os.path.join(JAVA_SERVER_DIR, 'src', 'main', 'java')
JAVA_RES_DIR = os.path.join(JAVA_SERVER_DIR, 'src', 'main', 'resources')
JAVA_BIN_DIR = os.path.join(JAVA_SERVER_DIR, 'bin')
JAVA_LIB_DIR = os.path.join(JAVA_SERVER_DIR, 'lib')
JAVA_DATA_DIR = os.path.join(JAVA_SERVER_DIR, 'data')


def load_env_file(filepath):
    """
    Loads environment variables from a .env file without external dependencies.
    Preserves any variables already set in the current shell environment (shell takes precedence).
    Comments (#), empty lines, and surrounding single/double quotes are safely handled.
    Never logs or prints secret values.
    """
    if not os.path.isfile(filepath):
        return 0

    loaded_count = 0
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue

                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()

                # Strip surrounding single or double quotes if present
                if len(value) >= 2 and ((value[0] == '"' and value[-1] == '"') or (value[0] == "'" and value[-1] == "'")):
                    value = value[1:-1]

                # Do not overwrite environment variables already set in the shell
                if key and key not in os.environ:
                    os.environ[key] = value
                    loaded_count += 1
    except Exception as e:
        print(f"[Runner Warning] Could not read .env file at {filepath}: {e}")

    return loaded_count


# Automatically load root .env file if present
_env_path = os.path.join(PROJECT_ROOT, '.env')
_loaded_env_count = load_env_file(_env_path)
if _loaded_env_count > 0:
    print(f"[Runner] Loaded {_loaded_env_count} environment variable(s) from local .env")

# ── Port and Environment Configuration ───────────────────────────────────────
# Frontend port precedence: FRONTEND_PORT -> PORT -> default 8000
FRONTEND_PORT = int(os.environ.get('FRONTEND_PORT', os.environ.get('PORT', 8000)))
# Backend port precedence: API_PORT -> JAVA_PORT -> SERVER_PORT -> default 8080
# (We do NOT fallback to generic $PORT for Java in the local runner so $PORT=3000 doesn't collide both)
JAVA_PORT = int(os.environ.get('API_PORT', os.environ.get('JAVA_PORT', os.environ.get('SERVER_PORT', 8080))))
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'True').lower() == 'true'

# Java Process Reference for Graceful Termination
_java_process = None


def get_debug_mode():
    """Dynamically reads the DEBUG_MODE flag so changes apply immediately."""
    if 'DEBUG_MODE' in os.environ:
        return os.environ.get('DEBUG_MODE', 'True').lower() == 'true'
    return DEBUG_MODE


def is_port_in_use(port, host='127.0.0.1'):
    """Checks whether a TCP port is currently occupied."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def kill_process_on_port(port):
    """Gracefully terminates any process listening on the specified port."""
    if os.name == 'nt':
        try:
            cmd = f'netstat -ano | findstr ":{port} "'
            out = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
            current_pid = os.getpid()
            for line in out.splitlines():
                if "LISTENING" in line:
                    parts = line.strip().split()
                    pid = int(parts[-1])
                    if pid > 0 and pid != current_pid:
                        subprocess.run(f'taskkill /F /PID {pid}', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
    else:
        try:
            out = subprocess.check_output(['lsof', '-t', f'-i:{port}'], text=True, stderr=subprocess.DEVNULL)
            current_pid = os.getpid()
            for pid_str in out.split():
                pid = int(pid_str.strip())
                if pid > 0 and pid != current_pid:
                    subprocess.run(['kill', '-9', str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass


def _bind_to_job(proc):
    """On Windows, associates a child process with a Job Object to terminate automatically when runner dies."""
    if os.name != 'nt':
        return
    try:
        import ctypes
        from ctypes import wintypes
        kernel32 = ctypes.windll.kernel32
        hJob = kernel32.CreateJobObjectW(None, None)
        class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
            _fields_ = [('PerProcessUserTimeLimit', ctypes.c_int64),
                        ('PerJobUserTimeLimit', ctypes.c_int64),
                        ('LimitFlags', wintypes.DWORD),
                        ('MinimumWorkingSetSize', ctypes.c_size_t),
                        ('MaximumWorkingSetSize', ctypes.c_size_t),
                        ('ActiveProcessLimit', wintypes.DWORD),
                        ('Affinity', ctypes.c_size_t),
                        ('PriorityClass', wintypes.DWORD),
                        ('SchedulingClass', wintypes.DWORD)]
        class IO_COUNTERS(ctypes.Structure):
            _fields_ = [('ReadOperationCount', ctypes.c_uint64),
                        ('WriteOperationCount', ctypes.c_uint64),
                        ('OtherOperationCount', ctypes.c_uint64),
                        ('ReadTransferCount', ctypes.c_uint64),
                        ('WriteTransferCount', ctypes.c_uint64),
                        ('OtherTransferCount', ctypes.c_uint64)]
        class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
            _fields_ = [('BasicLimitInformation', JOBOBJECT_BASIC_LIMIT_INFORMATION),
                        ('IoInfo', IO_COUNTERS),
                        ('ProcessMemoryLimit', ctypes.c_size_t),
                        ('JobMemoryLimit', ctypes.c_size_t),
                        ('PeakProcessMemoryLimit', ctypes.c_size_t),
                        ('PeakJobMemoryLimit', ctypes.c_size_t)]
        info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
        info.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        kernel32.SetInformationJobObject(hJob, 9, ctypes.byref(info), ctypes.sizeof(info))
        kernel32.AssignProcessToJobObject(hJob, int(proc._handle))
    except Exception:
        pass


def ensure_java_environment():
    """Validates that javac and java commands are available in the PATH."""
    try:
        subprocess.run(['java', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception:
        print("[Runner Error] 'java' executable not found in PATH. Please install Java (JDK 17+) to run MediTrail.")
        sys.exit(1)

    try:
        subprocess.run(['javac', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception:
        print("[Runner Error] 'javac' compiler not found in PATH. Please install a JDK to compile MediTrail.")
        sys.exit(1)


def get_latest_mtime(directory, extension=None):
    """Finds the maximum modification time among files matching extension in directory."""
    latest = 0
    if not os.path.exists(directory):
        return 0
    for root, _, files in os.walk(directory):
        for f in files:
            if extension is None or f.endswith(extension):
                path = os.path.join(root, f)
                try:
                    mtime = os.path.getmtime(path)
                    if mtime > latest:
                        latest = mtime
                except OSError:
                    pass
    return latest


def compile_java_if_needed():
    """Checks source timestamps against bin/ and compiles if sources or resources are newer. Returns (success, did_compile)."""
    os.makedirs(JAVA_BIN_DIR, exist_ok=True)
    os.makedirs(JAVA_DATA_DIR, exist_ok=True)

    src_mtime = get_latest_mtime(JAVA_SRC_DIR, '.java')
    res_mtime = get_latest_mtime(JAVA_RES_DIR)
    bin_mtime = get_latest_mtime(JAVA_BIN_DIR, '.class')

    needs_compilation = (bin_mtime == 0) or (src_mtime > bin_mtime) or (res_mtime > bin_mtime)

    if not needs_compilation:
        return True, False

    print("[Runner] Java source changes detected. Compiling Java backend...")

    # Copy SQL schemas and resources into bin directory
    if os.path.exists(JAVA_RES_DIR):
        for f in os.listdir(JAVA_RES_DIR):
            src_file = os.path.join(JAVA_RES_DIR, f)
            dest_file = os.path.join(JAVA_BIN_DIR, f)
            if os.path.isfile(src_file):
                with open(src_file, 'rb') as sf, open(dest_file, 'wb') as df:
                    df.write(sf.read())

    # Collect all Java source files
    java_files = []
    for root, _, files in os.walk(JAVA_SRC_DIR):
        for f in files:
            if f.endswith('.java'):
                java_files.append(os.path.join(root, f))

    if not java_files:
        print("[Runner Error] No Java source files found in:", JAVA_SRC_DIR)
        return False

    sources_txt = os.path.join(JAVA_SERVER_DIR, 'sources.txt')
    with open(sources_txt, 'w', encoding='utf-8') as f:
        for path in java_files:
            # Use forward slashes for cross-platform javac compatibility
            normalized_path = path.replace('\\', '/')
            f.write(f'"{normalized_path}"\n')

    # Classpath with all JARs in lib/
    cp_separator = ';' if os.name == 'nt' else ':'
    classpath = f"{JAVA_LIB_DIR}/*"

    cmd = [
        'javac',
        '-encoding', 'UTF-8',
        '-cp', classpath,
        '-d', JAVA_BIN_DIR,
        f'@{sources_txt}'
    ]

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print("[Runner Error] Java compilation failed:")
        print(result.stderr)
        return False, False

    print("[Runner] Java backend compilation completed successfully.")
    return True, True


def stop_java_backend():
    """Terminates the Java backend child process if currently running."""
    global _java_process
    if _java_process and _java_process.poll() is None:
        print("\n[Runner] Stopping MediTrail Java Backend Server...")
        try:
            _java_process.terminate()
            _java_process.wait(timeout=3)
        except Exception:
            try:
                _java_process.kill()
            except Exception:
                pass
        _java_process = None


def start_java_backend(did_compile=False):
    """Starts the Java backend server as a managed child process and waits for health."""
    global _java_process

    # Check if port is already in use
    if is_port_in_use(JAVA_PORT):
        if did_compile:
            print(f"[Runner] Backend was recompiled. Stopping previous instance on port {JAVA_PORT}...")
            kill_process_on_port(JAVA_PORT)
            time.sleep(1.0)
        else:
            # Verify if it is genuinely a compatible MediTrail backend
            try:
                with urllib.request.urlopen(f"http://localhost:{JAVA_PORT}/api/health", timeout=1.5) as req:
                    if req.status == 200:
                        data = req.read().decode('utf-8', errors='ignore')
                        if '"status":"UP"' in data and ('"meditrail"' in data.lower() or '"database"' in data):
                            print(f"[Runner] Existing verified MediTrail Java backend detected on port {JAVA_PORT} (reusing).")
                            return True
            except Exception:
                pass
            print(f"[Runner] Port {JAVA_PORT} is occupied by an outdated process. Freeing port...")
            kill_process_on_port(JAVA_PORT)
            time.sleep(1.0)

    cp_separator = ';' if os.name == 'nt' else ':'
    classpath = f"{JAVA_BIN_DIR}{cp_separator}{JAVA_LIB_DIR}/*"

    java_env = os.environ.copy()
    # Explicitly pass the resolved JAVA_PORT as API_PORT and PORT to the child Java process
    java_env['API_PORT'] = str(JAVA_PORT)
    java_env['PORT'] = str(JAVA_PORT)
    java_env.setdefault('DB_TYPE', 'h2')

    cmd = ['java', '-Djava.net.preferIPv4Stack=true', '-cp', classpath, 'com.meditrail.MediTrailServer']

    print(f"[Runner] Launching MediTrail Java Backend on port {JAVA_PORT}...")
    _java_process = subprocess.Popen(
        cmd,
        cwd=PROJECT_ROOT,
        env=java_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Stream Java backend logs in real time to the runner console
    def _stream_backend_output(proc):
        try:
            for line in iter(proc.stdout.readline, ''):
                if line:
                    sys.stdout.write(f"[Backend] {line}")
                    sys.stdout.flush()
        except Exception:
            pass

    threading.Thread(target=_stream_backend_output, args=(_java_process,), daemon=True).start()

    # Bind process to Windows Job Object so it terminates if python dies
    _bind_to_job(_java_process)

    # Register exit handlers to stop Java on runner exit
    atexit.register(stop_java_backend)

    # Poll /api/health until ready or child process dies
    health_url = f"http://localhost:{JAVA_PORT}/api/health"
    start_time = time.time()
    max_wait = 15  # seconds

    while time.time() - start_time < max_wait:
        if _java_process.poll() is not None:
            output, _ = _java_process.communicate()
            print("[Runner Error] Java backend process exited unexpectedly with code:", _java_process.returncode)
            print(output)
            sys.exit(1)

        try:
            with urllib.request.urlopen(health_url, timeout=0.8) as resp:
                if resp.status == 200:
                    body = resp.read().decode('utf-8', errors='ignore')
                    if '"status":"UP"' in body:
                        print(f"[Runner] Java Backend is ready and verified at {health_url}")
                        return True
        except Exception:
            time.sleep(0.3)

    # If health check timed out, terminate child process and exit cleanly with error
    print(f"[Runner Error] Java backend health check timed out after {max_wait}s.")
    stop_java_backend()
    sys.exit(1)


# ── HTTP Handler for Frontend ────────────────────────────────────────────────
class FrontendHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        # Route /admin or /admin/ to admin.html
        if self.path in ('/admin', '/admin/'):
            self.path = '/admin.html'

        # Serve virtual /js/debug-config.js with runtime API URL and debug flags
        if self.path == '/js/debug-config.js':
            is_debug = get_debug_mode()
            api_url = os.environ.get('API_URL', f"http://localhost:{JAVA_PORT}/api")
            payload = (
                f"window.__MEDITRAIL_DEBUG__ = {'true' if is_debug else 'false'};\n"
                f"window.__MEDITRAIL_API_URL__ = '{api_url}';\n"
            ).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_header('Content-Length', len(payload))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress 404 noise for browser internal probes
        if args and '404' in str(args[1]) and 'devtools' in str(args[0]):
            return
        super().log_message(format, *args)


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 64


def run():
    # Handle termination signals cleanly
    def signal_handler(signum, frame):
        stop_java_backend()
        sys.exit(0)

    try:
        signal.signal(signal.SIGINT, signal_handler)
        if hasattr(signal, 'SIGTERM'):
            signal.signal(signal.SIGTERM, signal_handler)
    except Exception:
        pass

    print("=" * 60)
    print(" MediTrail — Unified Development Runner")
    print("=" * 60)

    # 1. Verify Java compiler & runtime
    ensure_java_environment()

    # 2. Check & compile Java backend
    compile_success, did_compile = compile_java_if_needed()
    if not compile_success:
        sys.exit(1)

    # 3. Start managed Java backend process
    start_java_backend(did_compile=did_compile)

    # Ensure frontend port is not blocked by a stale process
    if is_port_in_use(FRONTEND_PORT):
        print(f"[Runner] Frontend port {FRONTEND_PORT} is in use. Freeing port...")
        kill_process_on_port(FRONTEND_PORT)
        time.sleep(0.5)

    # 4. Start Frontend HTTP server
    try:
        with ThreadingServer(('', FRONTEND_PORT), FrontendHandler) as httpd:
            frontend_url = f'http://localhost:{FRONTEND_PORT}/'
            api_url = os.environ.get('API_URL', f'http://localhost:{JAVA_PORT}/api')
            debug_status = 'ON' if DEBUG_MODE else 'OFF'

            print("=" * 60)
            print(f" Frontend Portal : {frontend_url}")
            print(f" Admin Portal    : http://localhost:{FRONTEND_PORT}/admin.html")
            print(f" Java REST API   : {api_url}")
            print(f" API Health      : http://localhost:{JAVA_PORT}/api/health")
            print(f" Database Mode   : {os.environ.get('DB_TYPE', 'H2 (Persistent File)')}")
            print(f" Debug Logging   : {debug_status}")
            print("=" * 60)
            print(" Press Ctrl+C to stop both Frontend and Java backend.")

            try:
                webbrowser.open(frontend_url)
            except Exception:
                pass

            httpd.serve_forever()

    except OSError as e:
        if getattr(e, 'winerror', None) == 10048 or 'address already in use' in str(e).lower():
            print(f"[Runner] Frontend port {FRONTEND_PORT} is already occupied.")
            stop_java_backend()
            sys.exit(1)
        else:
            stop_java_backend()
            raise e
    except KeyboardInterrupt:
        print("\nShutting down MediTrail...")
    finally:
        stop_java_backend()


if __name__ == '__main__':
    run()
