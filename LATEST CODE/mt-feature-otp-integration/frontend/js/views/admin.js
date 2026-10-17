/**
 * MediTrail - Hospital Staff & Doctor Admin Controller (RBAC)
 */

let currentAdminUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();

    const addBtn = document.getElementById('btn-open-add-doctor');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.openAddDoctorModal) window.openAddDoctorModal();
        });
    }
});

// Reset to login screen gracefully if backend reports 401 Unauthorized
window.addEventListener('meditrail:unauthorized', () => {
    if (currentAdminUser) {
        console.warn('[MediTrail Admin] Session expired or invalid. Returning to login screen.');
        window.logoutAdmin();
        alert('Your session has expired. Please log in again.');
    }
});

/**
 * Checks for existing admin session in sessionStorage
 */
async function checkAdminSession() {
    const savedUser = sessionStorage.getItem('MEDITRAIL_ADMIN_USER');
    const savedToken = sessionStorage.getItem('MEDITRAIL_AUTH_TOKEN');
    if (savedUser) {
        try {
            currentAdminUser = JSON.parse(savedUser);
            // If Java API is active, verify token validity before showing dashboard
            if (savedToken && window.MediTrailAPI && window.MediTrailAPI.getAdminStats) {
                try {
                    await window.MediTrailAPI.getAdminStats();
                } catch (err) {
                    if (err.message && err.message.toLowerCase().includes('unauthorized')) {
                        console.warn('[MediTrail Admin] Stored session token is invalid or expired.');
                        window.logoutAdmin();
                        return;
                    }
                }
            }
            showAdminDashboard();
        } catch (e) {
            sessionStorage.removeItem('MEDITRAIL_ADMIN_USER');
            sessionStorage.removeItem('MEDITRAIL_AUTH_TOKEN');
        }
    }
}

/**
 * Handles admin / doctor login form submission
 */
window.handleAdminLogin = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value.trim();

    if (!email || !password) {
        alert('Please enter your hospital email and password.');
        return;
    }

    // 1. Try Java Backend REST API first
    if (window.MediTrailAPI && window.MediTrailAPI.loginAdmin) {
        try {
            const apiRes = await window.MediTrailAPI.loginAdmin(email, password);
            if (apiRes && apiRes.success && apiRes.user) {
                if (apiRes.token) {
                    sessionStorage.setItem('MEDITRAIL_AUTH_TOKEN', apiRes.token);
                }
                currentAdminUser = {
                    id: apiRes.user.email,
                    name: apiRes.user.name,
                    email: apiRes.user.email,
                    role: apiRes.user.role,
                    hospitalName: apiRes.user.hospitalName || "MediTrail Platform",
                    hospitalId: apiRes.user.hospitalId || 'hosp-1'
                };
                sessionStorage.setItem('MEDITRAIL_ADMIN_USER', JSON.stringify(currentAdminUser));
                showAdminDashboard();
                return;
            }
        } catch (apiErr) {
            console.warn('Java Admin API login notice:', apiErr.message);
            if (apiErr.message && (apiErr.message.toLowerCase().includes('invalid') || apiErr.message.includes('401'))) {
                alert(apiErr.message);
                return;
            }
        }
    }

    // 2. Local Demo / Fallback User Registry
    const data = window.MEDITRAIL_DATA || {};
    let rbacUsers = [...(data.rbacUsers || [])];

    const localUsers = localStorage.getItem('MEDITRAIL_RBAC_USERS');
    if (localUsers) {
        try {
            const parsed = JSON.parse(localUsers);
            if (Array.isArray(parsed)) {
                rbacUsers = [...parsed, ...rbacUsers];
            }
        } catch (e) {}
    }

    const matchedUser = rbacUsers.find(u => 
        (u.email || '').toLowerCase() === email.toLowerCase() && 
        (u.password === password || u.password_hash)
    );

    if (matchedUser) {
        currentAdminUser = matchedUser;
        sessionStorage.setItem('MEDITRAIL_ADMIN_USER', JSON.stringify(matchedUser));
        showAdminDashboard();
    } else {
        alert('Invalid Hospital Email or Password. Please check your login credentials.');
    }
};

/**
 * Renders the dashboard shell after successful authentication
 */
function showAdminDashboard() {
    document.getElementById('admin-auth-screen').style.display = 'none';
    const dash = document.getElementById('admin-dashboard-screen');
    dash.classList.add('active');

    // Set User Tag Header
    document.getElementById('admin-user-name').textContent = currentAdminUser.name;
    
    let roleText = 'ATTENDING DOCTOR / SPECIALIST';
    let brandTag = 'Doctor Portal';
    
    const roleLower = (currentAdminUser.role || '').toLowerCase().replace('-', '_');
    const isSuperAdmin = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    const isHospitalAdmin = (roleLower === 'hospital_admin' || roleLower === 'admin');

    if (isSuperAdmin) {
        roleText = 'PLATFORM MANAGER';
        brandTag = 'Manager Portal';
    } else if (isHospitalAdmin) {
        roleText = 'HOSPITAL MAIN ADMIN';
        brandTag = 'Hospital Admin Portal';
    }

    document.getElementById('admin-user-role').textContent = roleText;
    document.getElementById('hospital-brand-name').textContent = isSuperAdmin
        ? 'MediTrail Platform (Manager Portal)'
        : `${currentAdminUser.hospitalName || 'Hospital'} (${brandTag})`;

    // Configure Register Buttons & Tab Access based on Role
    const addDoctorBtn = document.getElementById('btn-open-add-doctor');
    const addSuperAdminBtn = document.getElementById('btn-open-add-super-admin');
    const addHospitalBtn = document.getElementById('btn-open-add-hospital');
    const tabHospitalsBtn = document.getElementById('tab-btn-hospitals');
    const tabDoctorsBtn = document.getElementById('tab-btn-doctors');
    const tabConsultBtn = document.getElementById('tab-btn-consult');
    const tabAuditBtn = document.getElementById('tab-btn-audit');
    const filterRow = document.getElementById('doctors-filter-row');

    const metricCard1 = document.getElementById('metric-card-1');
    const metricCard2 = document.getElementById('metric-card-2');
    const metricCard3 = document.getElementById('metric-card-3');
    const metricCard4 = document.getElementById('metric-card-4');
    const metricsGrid = document.getElementById('admin-metrics-grid');

    if (isSuperAdmin) {
        // 1. SuperAdmin Dashboard: Empanelled Hospitals, Onboard New Hospital, and Create Super Admin
        if (metricsGrid) metricsGrid.style.display = 'grid';
        if (metricCard1) metricCard1.style.display = '';
        if (metricCard2) metricCard2.style.display = 'none';
        if (metricCard3) metricCard3.style.display = '';
        if (metricCard4) metricCard4.style.display = 'none';
        if (addSuperAdminBtn) addSuperAdminBtn.style.display = 'inline-block';
        if (addHospitalBtn) addHospitalBtn.style.display = 'inline-block';
        if (addDoctorBtn) addDoctorBtn.style.display = 'none';
        if (tabHospitalsBtn) tabHospitalsBtn.style.display = 'inline-block';
        if (tabDoctorsBtn) tabDoctorsBtn.style.display = 'none';
        if (tabAuditBtn) tabAuditBtn.style.display = 'none';
        if (tabConsultBtn) tabConsultBtn.style.display = 'none';
        if (filterRow) filterRow.style.display = 'none';
        switchAdminTab('hospitals');
    } else if (isHospitalAdmin) {
        // 2. Hospital Admin Dashboard: Only doctors info and add doctor
        if (metricsGrid) metricsGrid.style.display = 'grid';
        if (metricCard1) metricCard1.style.display = '';
        if (metricCard2) metricCard2.style.display = 'none';
        if (metricCard3) metricCard3.style.display = 'none';
        if (metricCard4) metricCard4.style.display = 'none';
        if (addSuperAdminBtn) addSuperAdminBtn.style.display = 'none';
        if (addHospitalBtn) addHospitalBtn.style.display = 'none';
        if (addDoctorBtn) {
            addDoctorBtn.style.display = 'inline-block';
            addDoctorBtn.textContent = '+ Register New Doctor';
        }
        if (tabHospitalsBtn) tabHospitalsBtn.style.display = 'none';
        if (tabDoctorsBtn) tabDoctorsBtn.style.display = 'inline-block';
        if (tabAuditBtn) tabAuditBtn.style.display = 'none';
        if (tabConsultBtn) tabConsultBtn.style.display = 'none';
        if (filterRow) filterRow.style.display = 'none';
        switchAdminTab('doctors');
    } else {
        // 3. Doctor Dashboard: Purely clinical consultation and patient record search/access
        if (metricsGrid) metricsGrid.style.display = 'none';
        if (metricCard1) metricCard1.style.display = 'none';
        if (metricCard2) metricCard2.style.display = 'none';
        if (metricCard3) metricCard3.style.display = 'none';
        if (metricCard4) metricCard4.style.display = 'none';
        if (addSuperAdminBtn) addSuperAdminBtn.style.display = 'none';
        if (addHospitalBtn) addHospitalBtn.style.display = 'none';
        if (addDoctorBtn) addDoctorBtn.style.display = 'none';
        if (tabHospitalsBtn) tabHospitalsBtn.style.display = 'none';
        if (tabDoctorsBtn) tabDoctorsBtn.style.display = 'none';
        if (tabAuditBtn) tabAuditBtn.style.display = 'none';
        if (tabConsultBtn) tabConsultBtn.style.display = 'inline-block';
        if (filterRow) filterRow.style.display = 'none';
        switchAdminTab('consult');
    }

    updateDynamicMetrics();
    renderHospitalsTable();
    renderDoctorsTable();
    renderAuditLogs();
    renderDoctorPatientRecords();
}

/**
 * Logs out active staff session
 */
window.logoutAdmin = function() {
    currentAdminUser = null;
    activeDoctorSelectedPatient = null;
    activeDoctorPatientRecords = [];
    const cardEl = document.getElementById('doctor-patient-card');
    if (cardEl) cardEl.style.display = 'none';
    const searchInput = document.getElementById('doctor-patient-search');
    if (searchInput) searchInput.value = '';
    sessionStorage.removeItem('MEDITRAIL_ADMIN_USER');
    sessionStorage.removeItem('MEDITRAIL_AUTH_TOKEN');
    const dashScreen = document.getElementById('admin-dashboard-screen');
    if (dashScreen) dashScreen.classList.remove('active');
    const authScreen = document.getElementById('admin-auth-screen');
    if (authScreen) authScreen.style.display = 'flex';
};

/**
 * Switches active workspace tab
 */
window.switchAdminTab = function(tabName) {
    if (currentAdminUser) {
        const roleLower = (currentAdminUser.role || '').toLowerCase().replace('-', '_');
        const isSuperAdmin = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
        const isHospitalAdmin = (roleLower === 'hospital_admin' || roleLower === 'admin');
        if (isSuperAdmin && tabName !== 'hospitals') {
            tabName = 'hospitals';
        }
        if (isHospitalAdmin && tabName !== 'doctors') {
            tabName = 'doctors';
        }
        if (!isSuperAdmin && !isHospitalAdmin && tabName !== 'consult') {
            tabName = 'consult';
        }
    }
    const views = ['hospitals', 'doctors', 'consult', 'audit'];
    views.forEach(v => {
        const el = document.getElementById(`admin-view-${v}`);
        const btn = document.getElementById(`tab-btn-${v}`);
        if (el) el.style.display = (v === tabName) ? 'block' : 'none';
        if (btn) {
            btn.style.color = (v === tabName) ? '#0f2744' : '#64748b';
            btn.style.borderBottomColor = (v === tabName) ? '#0d9488' : 'transparent';
        }
    });
};

/**
 * Renders empanelled network hospitals table
 */
async function renderHospitalsTable() {
    const tbody = document.getElementById('hospitals-table-body');
    if (!tbody) return;

    let hospitals = [];
    let fetchedFromApi = false;

    // 1. Fetch from Java Backend REST API
    if (window.MediTrailAPI && window.MediTrailAPI.getHospitals) {
        try {
            const apiData = await window.MediTrailAPI.getHospitals();
            if (Array.isArray(apiData)) {
                hospitals = apiData;
                fetchedFromApi = true;
            }
        } catch (e) {
            console.warn('Java API fetch hospitals warning:', e.message);
        }
    }

    if (!fetchedFromApi) {
        const savedLocal = localStorage.getItem('MEDITRAIL_HOSPITALS');
        if (savedLocal !== null) {
            try {
                const parsed = JSON.parse(savedLocal);
                if (Array.isArray(parsed)) {
                    hospitals = parsed;
                }
            } catch (e) {}
        } else {
            const data = window.MEDITRAIL_DATA || {};
            hospitals = (data.hospitals && data.hospitals.length > 0) ? [...data.hospitals] : [];
        }
    }

    if (hospitals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b; padding: 1.5rem;">No empanelled hospitals found. Click "+ Onboard New Hospital" to add.</td></tr>`;
        return;
    }

    const allDocs = window.MEDITRAIL_DATA ? (window.MEDITRAIL_DATA.doctorsList || []) : [];

    tbody.innerHTML = hospitals.map(hosp => {
        const hospDocs = allDocs.filter(d => 
            (d.hospitalName || '').toLowerCase() === (hosp.name || '').toLowerCase() || 
            (d.hospital_name || '').toLowerCase() === (hosp.name || '').toLowerCase()
        );
        
        const docNamesStr = hospDocs.length > 0 
            ? hospDocs.map(d => `<span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin: 0.15rem;">🩺 ${d.name}</span>`).join(' ') 
            : `<span style="color: #94a3b8; font-size: 0.8rem; font-style: italic;">No doctors assigned yet</span>`;

        const escapedName = (hosp.name || '').replace(/'/g, "\\'");

        return `
        <tr>
            <td style="font-weight: 700; color: #0f2744;">${hosp.name}</td>
            <td style="font-family: monospace; font-size: 0.85rem; color: #0d9488; font-weight: 600;">${hosp.code || 'HOSP-01'}</td>
            <td style="color: #334155; font-weight: 500;">${hosp.city || 'Mumbai'}</td>
            <td>${docNamesStr}</td>
            <td><span class="status-pill active">Empanelled Active</span></td>
            <td>
                <button onclick="deleteHospital('${hosp.id}', '${escapedName}')"
                    style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border: 1px solid #fca5a5; background: #fee2e2; color: #991b1b; border-radius: 6px; cursor: pointer; font-weight: 600;"
                    title="Delete hospital from network and database">
                    Delete Hospital
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

/**
 * Deletes hospital from frontend state and backend DB
 */
window.deleteHospital = async function(hospId, hospName) {
    const roleLower = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isManager = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    if (!currentAdminUser || !isManager) {
        alert('Only Managers can delete hospitals.');
        return;
    }

    if (!confirm(`Are you sure you want to delete hospital "${hospName}"? This action cannot be undone.`)) {
        return;
    }

    // 1. Remove from local state and localStorage
    if (window.MEDITRAIL_DATA && window.MEDITRAIL_DATA.hospitals) {
        window.MEDITRAIL_DATA.hospitals = window.MEDITRAIL_DATA.hospitals.filter(h => 
            (!hospId || h.id !== hospId) && 
            (!hospName || (h.name || '').toLowerCase() !== (hospName || '').toLowerCase())
        );
        localStorage.setItem('MEDITRAIL_HOSPITALS', JSON.stringify(window.MEDITRAIL_DATA.hospitals));
    }
    const savedLocal = localStorage.getItem('MEDITRAIL_HOSPITALS');
    if (savedLocal) {
        try {
            const parsed = JSON.parse(savedLocal);
            if (Array.isArray(parsed)) {
                const filtered = parsed.filter(h => 
                    (!hospId || h.id !== hospId) && 
                    (!hospName || (h.name || '').toLowerCase() !== (hospName || '').toLowerCase())
                );
                localStorage.setItem('MEDITRAIL_HOSPITALS', JSON.stringify(filtered));
            }
        } catch (e) {}
    }

    // Also remove doctors/staff linked to this deleted hospital from local state
    if (window.MEDITRAIL_DATA) {
        if (window.MEDITRAIL_DATA.doctorsList) {
            window.MEDITRAIL_DATA.doctorsList = window.MEDITRAIL_DATA.doctorsList.filter(d => 
                (!hospId || d.hospitalId !== hospId) && 
                (!hospName || (d.hospitalName || '').toLowerCase() !== (hospName || '').toLowerCase())
            );
            localStorage.setItem('MEDITRAIL_DOCTORS', JSON.stringify(window.MEDITRAIL_DATA.doctorsList));
        }
        if (window.MEDITRAIL_DATA.rbacUsers) {
            window.MEDITRAIL_DATA.rbacUsers = window.MEDITRAIL_DATA.rbacUsers.filter(u => 
                u.role === 'super_admin' || u.role === 'manager' || 
                ((!hospId || u.hospitalId !== hospId) && (!hospName || (u.hospitalName || '').toLowerCase() !== (hospName || '').toLowerCase()))
            );
            localStorage.setItem('MEDITRAIL_RBAC_USERS', JSON.stringify(window.MEDITRAIL_DATA.rbacUsers));
        }
    }

    // 2. Delete from Java Backend Database API
    if (window.MediTrailAPI && window.MediTrailAPI.deleteHospital) {
        try {
            if (hospId) await window.MediTrailAPI.deleteHospital(hospId).catch(() => {});
            if (hospName) await window.MediTrailAPI.deleteHospital(hospName).catch(() => {});
        } catch (e) {
            console.warn('Java API delete hospital warning:', e.message);
        }
    }

    await renderHospitalsTable();
    await updateDynamicMetrics();
    alert(`Hospital "${hospName}" has been deleted successfully!`);
};

window.openAddHospitalModal = function() {
    const roleLower = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isManager = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    if (!currentAdminUser || !isManager) {
        alert('Only Managers can onboard new empanelled hospitals.');
        return;
    }
    const modal = document.getElementById('modal-add-hospital');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '999999';
    }
};

window.closeAddHospitalModal = function() {
    const modal = document.getElementById('modal-add-hospital');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
};

window.openAddSuperAdminModal = function() {
    const roleLower = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isManager = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    if (!currentAdminUser || !isManager) {
        alert('Only Managers can create new Platform Manager accounts.');
        return;
    }
    const modal = document.getElementById('modal-add-super-admin');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '999999';
    }
};

window.closeAddSuperAdminModal = function() {
    const modal = document.getElementById('modal-add-super-admin');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
};

window.saveNewSuperAdmin = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const nameInput = document.getElementById('new-super-name');
    const emailInput = document.getElementById('new-super-email');
    const passwordInput = document.getElementById('new-super-password');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!name || !email || !password) {
        alert('Full Name, Email and Password are required to create a Manager.');
        return;
    }

    // Hash password using bcrypt if available
    const bcryptLib = window.bcrypt || (typeof bcrypt !== 'undefined' ? bcrypt : null);
    let passwordHash = null;
    if (bcryptLib) {
        const salt = await bcryptLib.genSalt(10);
        passwordHash = await bcryptLib.hash(password, salt);
    }

    const newSuperUser = {
        id: `usr-admin-${Date.now()}`,
        name: name,
        email: email,
        role: 'super_admin',
        hospitalId: 'hosp-1',
        hospitalName: 'MediTrail Platform',
        password: password,
        password_hash: passwordHash
    };

    const docEntry = {
        id: newSuperUser.id,
        name: name,
        email: email,
        licenseId: 'MCI-00100-IN',
        department: 'Platform Operations',
        role: 'super_admin',
        hospitalName: 'MediTrail Platform',
        status: 'Active'
    };

    // 1. Save locally
    if (!window.MEDITRAIL_DATA) window.MEDITRAIL_DATA = {};
    if (!window.MEDITRAIL_DATA.rbacUsers) window.MEDITRAIL_DATA.rbacUsers = [];
    if (!window.MEDITRAIL_DATA.doctorsList) window.MEDITRAIL_DATA.doctorsList = [];

    window.MEDITRAIL_DATA.rbacUsers.unshift(newSuperUser);
    window.MEDITRAIL_DATA.doctorsList.unshift(docEntry);

    localStorage.setItem('MEDITRAIL_RBAC_USERS', JSON.stringify(window.MEDITRAIL_DATA.rbacUsers));
    localStorage.setItem('MEDITRAIL_DOCTORS', JSON.stringify(window.MEDITRAIL_DATA.doctorsList));

    // 2. Insert to Java Backend Database API
    if (window.MediTrailAPI && window.MediTrailAPI.createDoctor) {
        window.MediTrailAPI.createDoctor({
            name: name,
            email: email,
            role: 'super_admin',
            department: 'Platform Operations',
            licenseId: 'MCI-00100-IN',
            status: 'Active',
            hospitalName: 'MediTrail Platform',
            password: password
        }).then(() => {
            console.log(`Manager (${email}) created and synced to Java backend!`);
        }).catch(err => {
            console.warn('Java API create manager notice:', err.message);
        });
    }

    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    await renderDoctorsTable();
    closeAddSuperAdminModal();
    alert(`Platform Manager account "${name}" (${email}) created successfully!`);
};

window.saveNewHospital = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById('new-hosp-name');
    const codeInput = document.getElementById('new-hosp-code');
    const cityInput = document.getElementById('new-hosp-city');
    const adminNameInput = document.getElementById('new-hosp-admin-name');
    const adminEmailInput = document.getElementById('new-hosp-admin-email');
    const adminPasswordInput = document.getElementById('new-hosp-admin-password');

    const name = nameInput ? nameInput.value.trim() : '';
    const code = codeInput ? codeInput.value.trim() : '';
    const city = cityInput ? cityInput.value.trim() : '';
    const adminName = adminNameInput ? adminNameInput.value.trim() : `Main Admin (${name})`;
    const adminEmail = adminEmailInput ? adminEmailInput.value.trim().toLowerCase() : '';
    const adminPassword = adminPasswordInput ? adminPasswordInput.value : '';

    if (!name || !code) {
        alert('Hospital Name and Unique Code are required.');
        return;
    }
    if (!adminEmail || !adminPassword) {
        alert('Hospital Admin Email and Password are required to create login credentials.');
        return;
    }

    // 1. Generate password hash
    const bcryptLib = window.bcrypt || (typeof bcrypt !== 'undefined' ? bcrypt : null);
    let passwordHash = null;
    if (bcryptLib) {
        const salt = await bcryptLib.genSalt(10);
        passwordHash = await bcryptLib.hash(adminPassword, salt);
    }

    const hospId = `hosp-${Date.now()}`;
    const newHosp = {
        id: hospId,
        name,
        code,
        city: city || 'Mumbai',
        status: 'Active',
        adminName,
        adminEmail,
        adminPassword
    };

    const newAdminUser = {
        id: `usr-admin-${Date.now()}`,
        name: adminName,
        email: adminEmail,
        role: 'hospital_admin',
        hospitalId: hospId,
        hospitalName: name,
        password: adminPassword,
        password_hash: passwordHash
    };

    // 2. Save locally
    if (!window.MEDITRAIL_DATA) window.MEDITRAIL_DATA = {};
    if (!window.MEDITRAIL_DATA.hospitals) window.MEDITRAIL_DATA.hospitals = [];
    if (!window.MEDITRAIL_DATA.rbacUsers) window.MEDITRAIL_DATA.rbacUsers = [];
    if (!window.MEDITRAIL_DATA.doctorsList) window.MEDITRAIL_DATA.doctorsList = [];

    window.MEDITRAIL_DATA.hospitals.unshift(newHosp);
    window.MEDITRAIL_DATA.rbacUsers.unshift(newAdminUser);
    window.MEDITRAIL_DATA.doctorsList.unshift({
        id: newAdminUser.id,
        name: adminName,
        email: adminEmail,
        licenseId: 'ADM-REG-IN',
        department: 'Hospital Administration',
        role: 'hospital_admin',
        hospitalName: name,
        status: 'Active'
    });

    localStorage.setItem('MEDITRAIL_HOSPITALS', JSON.stringify(window.MEDITRAIL_DATA.hospitals));
    localStorage.setItem('MEDITRAIL_RBAC_USERS', JSON.stringify(window.MEDITRAIL_DATA.rbacUsers));
    localStorage.setItem('MEDITRAIL_DOCTORS', JSON.stringify(window.MEDITRAIL_DATA.doctorsList));

    // 3. Insert to Java Backend Database API
    if (window.MediTrailAPI) {
        if (window.MediTrailAPI.createHospital) {
            await window.MediTrailAPI.createHospital(newHosp).catch(e => console.warn('Java API create hospital warning:', e.message));
        }
        if (window.MediTrailAPI.createDoctor) {
            await window.MediTrailAPI.createDoctor({
                name: adminName,
                email: adminEmail,
                role: 'hospital_admin',
                department: 'Hospital Administration',
                licenseId: 'ADM-REG-IN',
                status: 'Active',
                hospitalId: hospId,
                hospitalName: name,
                password: adminPassword
            }).catch(e => console.warn('Java API create hospital admin warning:', e.message));
        }
    }

    if (nameInput) nameInput.value = '';
    if (codeInput) codeInput.value = '';
    if (cityInput) cityInput.value = '';
    if (adminNameInput) adminNameInput.value = '';
    if (adminEmailInput) adminEmailInput.value = '';
    if (adminPasswordInput) adminPasswordInput.value = '';

    await renderHospitalsTable();
    await renderDoctorsTable();
    closeAddHospitalModal();
    alert(`Hospital "${name}" onboarded and Main Admin account (${adminEmail}) created successfully! You can now log in with this email and password.`);
};

/**
 * Renders registered doctors table
 */
async function renderDoctorsTable() {
    const tbody = document.getElementById('doctors-table-body');
    if (!tbody) return;

    let doctors = [];
    let fetchedFromApi = false;

    // 1. Fetch directly from Java Backend REST API
    if (window.MediTrailAPI && window.MediTrailAPI.getDoctors) {
        try {
            const apiData = await window.MediTrailAPI.getDoctors();
            if (Array.isArray(apiData) && apiData.length > 0) {
                doctors = apiData;
                fetchedFromApi = true;
            }
        } catch (e) {
            console.warn('Java API fetch doctors warning:', e.message);
        }
    }

    if (!fetchedFromApi) {
        const data = window.MEDITRAIL_DATA || {};
        doctors = (data.doctorsList && data.doctorsList.length > 0) ? [...data.doctorsList] : [
            { id: "doc-101", name: "Dr. Meera Nambiar", email: "dr.nambiar@stjude.org", licenseId: "MCI-88942-IN", department: "Orthopedics & Sports Medicine", status: "Active", role: "doctor", hospitalName: "St. Jude Orthopedic Care" },
            { id: "doc-102", name: "Dr. Rajesh Kulkarni", email: "dr.kulkarni@stjude.org", licenseId: "MCI-44109-IN", department: "Pulmonology", status: "Active", role: "doctor", hospitalName: "Apollo Specialty Clinic" },
            { id: "doc-103", name: "Dr. Ananya Sharma", email: "dr.sharma@citycare.org", licenseId: "MCI-99231-IN", department: "Internal Medicine", status: "Active", role: "doctor", hospitalName: "CityCare Hospital" }
        ];
    }
    // Always merge with localStorage to ensure newly added doctors appear immediately
    const savedLocal = localStorage.getItem('MEDITRAIL_DOCTORS');
    if (savedLocal) {
        try {
            const parsed = JSON.parse(savedLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const map = new Map();
                doctors.forEach(d => map.set((d.email || '').toLowerCase(), d));
                parsed.forEach(d => map.set((d.email || '').toLowerCase(), d));
                doctors = Array.from(map.values());
            }
        } catch (e) {}
    }

    if (window.MEDITRAIL_DATA) {
        window.MEDITRAIL_DATA.doctorsList = doctors;
    }

    const roleLowerUser = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isSuperAdminUser = (roleLowerUser === 'super_admin' || roleLowerUser === 'superadmin' || roleLowerUser === 'manager');

    // Populate Hospital filter options for Super Admin / Manager
    const hospFilterEl = document.getElementById('filter-doctor-hospital');
    if (hospFilterEl && isSuperAdminUser) {
        const currentSelectedHosp = hospFilterEl.value;
        const uniqueHospitals = Array.from(new Set(doctors.map(d => d.hospitalName || d.hospital_name).filter(Boolean)));
        hospFilterEl.innerHTML = '<option value="">All Network Hospitals</option>' + 
            uniqueHospitals.map(h => `<option value="${h}" ${h === currentSelectedHosp ? 'selected' : ''}>${h}</option>`).join('');
    }

    // Scope Filtering
    if (currentAdminUser && !isSuperAdminUser) {
        // Hospital Admins & Doctors only view staff from their own hospital
        const userHospRaw = (currentAdminUser.hospitalName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        doctors = doctors.filter(d => {
            const docHospRaw = (d.hospitalName || d.hospital_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return !userHospRaw || !docHospRaw || docHospRaw === userHospRaw || docHospRaw.includes(userHospRaw) || userHospRaw.includes(docHospRaw);
        });
    } else if (currentAdminUser && isSuperAdminUser) {
        // Manager can view all staff across all hospitals, with interactive filter controls
        const hospFilter = hospFilterEl ? hospFilterEl.value.trim().toLowerCase() : '';
        const roleFilterEl = document.getElementById('filter-doctor-role');
        const roleFilter = roleFilterEl ? roleFilterEl.value.trim().toLowerCase() : '';

        if (hospFilter) {
            doctors = doctors.filter(d => (d.hospitalName || d.hospital_name || '').toLowerCase() === hospFilter);
        }
        if (roleFilter) {
            doctors = doctors.filter(d => (d.role || '').toLowerCase() === roleFilter);
        }
    }

    const metricCount = document.getElementById('metric-docs-count');
    if (metricCount) metricCount.textContent = doctors.length;

    if (doctors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 1.5rem;">No staff or doctors found matching criteria. Click "+ Register New Staff / Doctor" to add.</td></tr>`;
        return;
    }

    tbody.innerHTML = doctors.map(doc => {
        let roleBadge = 'Doctor';
        let roleBg = '#e0f2fe';
        let roleColor = '#0369a1';
        if (doc.role === 'super_admin' || doc.role === 'manager') {
            roleBadge = 'Manager';
            roleBg = '#fef3c7';
            roleColor = '#92400e';
        } else if (doc.role === 'hospital_admin' || doc.role === 'admin') {
            roleBadge = 'Hospital Admin';
            roleBg = '#ccfbf1';
            roleColor = '#0f766e';
        }

        const isSuperAdmin = currentAdminUser && (currentAdminUser.role === 'super_admin' || currentAdminUser.role === 'manager');
        const isSelf = currentAdminUser && currentAdminUser.email && (currentAdminUser.email.toLowerCase() === (doc.email || '').toLowerCase());
        const isSuspended = doc.status && doc.status.toLowerCase() === 'suspended';

        // Super Admin Actions: Role Management, Status Toggle, Suspend & Remove
        let actionsHtml = '';
        if (isSuperAdmin) {
            const safeName = (doc.name || '').replace(/'/g, "\\'");
            const safeEmail = (doc.email || '').replace(/'/g, "\\'");
            const safeRole = (doc.role || 'doctor').replace(/'/g, "\\'");
            const safeStatus = (doc.status || 'Active').replace(/'/g, "\\'");

            actionsHtml = `
                <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    <button onclick="openEditRoleModal('${doc.id}', '${safeName}', '${safeEmail}', '${safeRole}')"
                        style="padding: 0.25rem 0.55rem; font-size: 0.72rem; border: 1px solid #c7d2fe; background: #e0e7ff; color: #3730a3; border-radius: 5px; cursor: pointer; font-weight: 600;"
                        title="Manage administrative role and permissions">
                        Role
                    </button>
                    <button onclick="toggleDoctorStatus('${doc.id}', '${safeEmail}', '${safeStatus}')"
                        style="padding: 0.25rem 0.55rem; font-size: 0.72rem; border: 1px solid ${isSuspended ? '#86efac' : '#fed7aa'}; background: ${isSuspended ? '#f0fdf4' : '#fff7ed'}; color: ${isSuspended ? '#166534' : '#c2410c'}; border-radius: 5px; cursor: pointer; font-weight: 600;"
                        title="Toggle Active / Suspended account status">
                        ${isSuspended ? 'Activate' : 'Suspend'}
                    </button>
                    ${!isSelf ? `
                    <button onclick="suspendAndDeleteDoctor('${doc.id}', '${safeEmail}')"
                        style="padding: 0.25rem 0.55rem; font-size: 0.72rem; border: 1px solid #fca5a5; background: #fee2e2; color: #991b1b; border-radius: 5px; cursor: pointer; font-weight: 600;"
                        title="Remove staff account from network and database">
                        Remove
                    </button>` : ''}
                </div>
            `;
        } else {
            const safeEmail = (doc.email || '').replace(/'/g, "\\'");
            const safeStatus = (doc.status || 'Active').replace(/'/g, "\\'");
            actionsHtml = `
                <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                    <button onclick="toggleDoctorStatus('${doc.id}', '${safeEmail}', '${safeStatus}')"
                        style="padding: 0.25rem 0.55rem; font-size: 0.72rem; border: 1px solid ${isSuspended ? '#86efac' : '#fed7aa'}; background: ${isSuspended ? '#f0fdf4' : '#fff7ed'}; color: ${isSuspended ? '#166534' : '#c2410c'}; border-radius: 5px; cursor: pointer; font-weight: 600;"
                        title="Toggle Active / Suspended account status">
                        ${isSuspended ? 'Activate' : 'Suspend'}
                    </button>
                    <button onclick="suspendAndDeleteDoctor('${doc.id}', '${safeEmail}')"
                        style="padding: 0.25rem 0.55rem; font-size: 0.72rem; border: 1px solid #fca5a5; background: #fee2e2; color: #991b1b; border-radius: 5px; cursor: pointer; font-weight: 600;"
                        title="Suspend & delete doctor from hospital database">
                        Remove
                    </button>
                </div>
            `;
        }

        return `
        <tr>
            <td style="font-weight: 600; color: #0f2744;">${doc.name}</td>
            <td><span style="background: ${roleBg}; color: ${roleColor}; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;">${roleBadge}</span></td>
            <td style="font-size: 0.85rem; color: #334155; font-weight: 500;">${doc.hospitalName || doc.hospital_name || 'MediTrail Platform'}</td>
            <td style="font-family: monospace; font-size: 0.85rem;">${doc.licenseId || 'MCI-REG-IN'}</td>
            <td>${doc.department || 'Specialist'}</td>
            <td style="color: #64748b;">${doc.email}</td>
            <td>
                <span class="status-pill ${doc.status && doc.status.toLowerCase() === 'active' ? 'active' : 'suspended'}">
                    ${doc.status || 'Active'}
                </span>
            </td>
            <td>${actionsHtml}</td>
        </tr>
        `;
    }).join('');
    
    updateDynamicMetrics();
}

/**
 * Suspends and deletes doctor from frontend state and backend DB
 */
window.suspendAndDeleteDoctor = async function(docId, email) {
    if (currentAdminUser && (currentAdminUser.email || '').toLowerCase() === (email || '').toLowerCase()) {
        alert('Cannot remove your own active login session.');
        return;
    }

    if (!confirm(`Are you sure you want to permanently remove staff account (${email || docId}) from network and database?`)) {
        return;
    }

    // 1. Remove from frontend local state
    let doctors = window.MEDITRAIL_DATA ? (window.MEDITRAIL_DATA.doctorsList || []) : [];
    doctors = doctors.filter(d => d.id !== docId && (d.email || '').toLowerCase() !== (email || '').toLowerCase());
    
    if (window.MEDITRAIL_DATA) {
        window.MEDITRAIL_DATA.doctorsList = doctors;
    }
    localStorage.setItem('MEDITRAIL_DOCTORS', JSON.stringify(doctors));

    // 2. Delete from Java Backend Database API
    if (window.MediTrailAPI && window.MediTrailAPI.deleteDoctor) {
        try {
            await window.MediTrailAPI.deleteDoctor(email || docId);
            showAdminToast(`Staff member (${email || docId}) removed from database.`, 'success');
        } catch (e) {
            console.warn('Java API delete doctor warning:', e.message);
            showAdminToast(e.message, 'warning');
        }
    }

    await renderDoctorsTable();
    await updateDynamicMetrics();
};

/**
 * Toggles doctor active status
 */
window.toggleDoctorStatus = async function(docId, email, currentStatus) {
    const newStatus = (currentStatus || 'Active').toLowerCase() === 'active' ? 'Suspended' : 'Active';

    // 1. Update backend via REST API
    if (window.MediTrailAPI && window.MediTrailAPI.updateDoctorStatus) {
        try {
            await window.MediTrailAPI.updateDoctorStatus(email || docId, newStatus);
            showAdminToast(`Account status updated to ${newStatus} for ${email || docId}`, 'success');
        } catch (e) {
            console.warn('Java API status toggle error:', e.message);
            showAdminToast('Could not update status: ' + e.message, 'warning');
            return;
        }
    }

    // 2. Update local state
    const data = window.MEDITRAIL_DATA || {};
    const doc = (data.doctorsList || []).find(d => d.id === docId || (d.email || '').toLowerCase() === (email || '').toLowerCase());
    if (doc) {
        doc.status = newStatus;
    }
    localStorage.setItem('MEDITRAIL_DOCTORS', JSON.stringify(data.doctorsList || []));

    await renderDoctorsTable();
};

/**
 * SuperAdmin Role Management Modals
 */
window.openEditRoleModal = function(id, name, email, currentRole) {
    const roleLower = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isManager = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    if (!currentAdminUser || !isManager) {
        alert('Only Managers can manage administrative roles and permissions.');
        return;
    }

    const idInput = document.getElementById('edit-role-id');
    const emailInput = document.getElementById('edit-role-email');
    const nameDisplay = document.getElementById('edit-role-display-name');
    const select = document.getElementById('edit-role-select');

    if (idInput) idInput.value = id;
    if (emailInput) emailInput.value = email;
    if (nameDisplay) nameDisplay.textContent = `${name} (${email})`;
    if (select) select.value = currentRole || 'doctor';

    const modal = document.getElementById('modal-edit-role');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '999999';
    }
};

window.closeEditRoleModal = function() {
    const modal = document.getElementById('modal-edit-role');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
};

window.saveRoleChange = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const email = document.getElementById('edit-role-email').value;
    const newRole = document.getElementById('edit-role-select').value;

    if (!email || !newRole) {
        alert('Staff identifier and role are required.');
        return;
    }

    if (window.MediTrailAPI && window.MediTrailAPI.updateDoctorRole) {
        try {
            await window.MediTrailAPI.updateDoctorRole(email, newRole);
            showAdminToast(`Updated administrative role for ${email} to ${newRole}!`, 'success');
        } catch (err) {
            alert('Failed to update role on backend: ' + err.message);
            return;
        }
    }

    // Update local state
    if (window.MEDITRAIL_DATA && window.MEDITRAIL_DATA.doctorsList) {
        const d = window.MEDITRAIL_DATA.doctorsList.find(x => (x.email || '').toLowerCase() === email.toLowerCase());
        if (d) d.role = newRole;
    }

    closeEditRoleModal();
    await renderDoctorsTable();
    await updateDynamicMetrics();
};

// Opens Add Doctor Modal – Manager & Hospital Admin can access
window.openAddDoctorModal = function() {
    const roleLower = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isManager = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    const isHospitalAdmin = (roleLower === 'hospital_admin' || roleLower === 'admin');
    if (!currentAdminUser || (!isManager && !isHospitalAdmin)) {
        alert('Only Hospital Admins and Managers can register new staff/doctors.');
        return;
    }
    const hospInput = document.getElementById('new-doc-hospital');
    if (hospInput && currentAdminUser) {
        hospInput.value = currentAdminUser.hospitalName || 'St. Jude Orthopedic Care';
    }

    const datalist = document.getElementById('hospitals-datalist');
    if (datalist && window.MEDITRAIL_DATA && window.MEDITRAIL_DATA.hospitals) {
        datalist.innerHTML = window.MEDITRAIL_DATA.hospitals.map(h => `<option value="${h.name}">`).join('');
    }

    const roleContainer = document.getElementById('container-new-doc-role');
    const roleSelect = document.getElementById('new-doc-role');
    if (currentAdminUser.role === 'hospital_admin' || currentAdminUser.role === 'admin') {
        if (roleSelect) roleSelect.value = 'doctor';
    }

    const modal = document.getElementById('modal-add-doctor');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '999999';
    }
};

window.closeAddDoctorModal = function() {
    const modal = document.getElementById('modal-add-doctor');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
};

/**
 * Saves new staff/doctor registration to Java backend & local state
 */
window.saveNewDoctor = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById('new-doc-name');
    const licenseInput = document.getElementById('new-doc-license');
    const deptInput = document.getElementById('new-doc-dept');
    const hospInput = document.getElementById('new-doc-hospital');
    const emailInput = document.getElementById('new-doc-email');
    const passwordInput = document.getElementById('new-doc-password');
    const roleSelect = document.getElementById('new-doc-role');

    const name = nameInput ? nameInput.value.trim() : '';
    const license = licenseInput ? licenseInput.value.trim() : '';
    const dept = deptInput ? deptInput.value.trim() : '';
    const hospName = hospInput ? hospInput.value.trim() : (currentAdminUser ? currentAdminUser.hospitalName : 'St. Jude Orthopedic Care');
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const selectedRole = roleSelect ? roleSelect.value : 'doctor';

    if (!name || !email) {
        alert('Full Name, Email and Password are required.');
        return;
    }
    if (!password) {
        alert('Password is required for registration.');
        return;
    }

    // Generate bcrypt hash for the password
    const bcryptLib = window.bcrypt || (typeof bcrypt !== 'undefined' ? bcrypt : null);
    let passwordHash = null;
    if (bcryptLib) {
        const salt = await bcryptLib.genSalt(10);
        passwordHash = await bcryptLib.hash(password, salt);
    }

    const newDoc = {
        id: `doc-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        licenseId: license || 'MCI-00100-IN',
        department: dept || 'General Medicine',
        specialization: dept || 'General Medicine',
        hospitalId: currentAdminUser ? currentAdminUser.hospitalId : 'hosp-1',
        hospitalName: hospName,
        status: 'Active',
        role: selectedRole,
        patientsVisited: 0,
        password_hash: passwordHash
    };

    // 1. Add to local state
    if (!window.MEDITRAIL_DATA.doctorsList) window.MEDITRAIL_DATA.doctorsList = [];
    window.MEDITRAIL_DATA.doctorsList.unshift(newDoc);
    localStorage.setItem('MEDITRAIL_DOCTORS', JSON.stringify(window.MEDITRAIL_DATA.doctorsList));

    // 2. Insert to Java Backend Database API
    if (window.MediTrailAPI && window.MediTrailAPI.createDoctor) {
        window.MediTrailAPI.createDoctor({
            name: newDoc.name,
            email: newDoc.email,
            licenseId: newDoc.licenseId,
            department: newDoc.department,
            role: selectedRole,
            status: 'Active',
            password: password,
            hospitalName: hospName
        }).then(() => {
            console.log(`Doctor (${newDoc.email}) synced to Java backend!`);
        }).catch(err => {
            console.warn('Java API register doctor warning:', err.message);
        });
    }

    // Reset input fields
    if (nameInput) nameInput.value = '';
    if (licenseInput) licenseInput.value = '';
    if (deptInput) deptInput.value = '';
    if (hospInput) hospInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    await renderDoctorsTable();
    closeAddDoctorModal();
    showAdminToast(`Account (${name} - ${selectedRole}) registered successfully for ${hospName} and synced with database!`, 'success');
};

function showAdminToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = type === 'success'
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div style="flex: 1; font-weight: 500;">${message}</div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3200);
}

/**
 * Doctor patient search handler
 */
/**
 * Doctor patient search & Access OTP state
 */
let activeDoctorSelectedPatient = null;
let activeDoctorPatientRecords = [];
let pendingPatientAccess = null;
let currentAccessRequestId = null;
let accessOtpCooldownTimer = null;
let accessOtpCooldownSeconds = 0;

function startAccessOtpCooldown(duration = 60) {
    if (accessOtpCooldownTimer) {
        clearInterval(accessOtpCooldownTimer);
    }
    accessOtpCooldownSeconds = duration;
    const resendBtn = document.getElementById('btn-resend-access-otp');
    const timerSpan = document.getElementById('access-otp-timer');
    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.style.cursor = 'not-allowed';
        resendBtn.style.background = '#f1f5f9';
        resendBtn.style.color = '#64748b';
    }
    if (timerSpan) timerSpan.textContent = `${accessOtpCooldownSeconds}s`;

    accessOtpCooldownTimer = setInterval(() => {
        accessOtpCooldownSeconds--;
        if (timerSpan) timerSpan.textContent = `${accessOtpCooldownSeconds}s`;
        if (accessOtpCooldownSeconds <= 0) {
            clearInterval(accessOtpCooldownTimer);
            accessOtpCooldownTimer = null;
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.style.cursor = 'pointer';
                resendBtn.style.background = '#ffffff';
                resendBtn.style.color = '#0d9488';
            }
            if (timerSpan) timerSpan.textContent = 'Ready';
        }
    }, 1000);
}

/**
 * Doctor patient search & access initiation handler
 */
window.doctorSearchPatient = async function() {
    const queryInput = document.getElementById('doctor-patient-search');
    const query = queryInput ? queryInput.value.trim() : '';

    if (!query) {
        showAdminToast('Please enter a Patient ID (e.g., MT-26926) or Mobile Phone Number (e.g., 9820480534)', 'warning');
        return;
    }

    const queryDigits = query.replace(/[^0-9]/g, '');
    const queryClean = query.trim().toUpperCase();

    // Reset current active and pending states & hide patient card
    activeDoctorSelectedPatient = null;
    activeDoctorPatientRecords = [];
    pendingPatientAccess = null;
    currentAccessRequestId = null;

    const patientCard = document.getElementById('doctor-patient-card');
    if (patientCard) patientCard.style.display = 'none';

    const otpCard = document.getElementById('doctor-access-otp-card');
    const otpInput = document.getElementById('doctor-access-otp-input');
    const otpErrMsg = document.getElementById('access-otp-error-msg');
    if (otpErrMsg) otpErrMsg.style.display = 'none';
    if (otpInput) {
        otpInput.value = '';
        otpInput.style.borderColor = '#cbd5e1';
    }

    let matchedPatient = null;

    // 1. Check Java Backend Search API
    if (window.MediTrailAPI && window.MediTrailAPI.searchPatientAdmin) {
        try {
            const apiPt = await window.MediTrailAPI.searchPatientAdmin(queryClean);
            if (apiPt && (apiPt.name || apiPt.patient_code || apiPt.id)) {
                matchedPatient = apiPt;
            }
        } catch (e) {
            console.warn('Java API patient search notice:', e.message);
        }
    }

    // 2. Check mock/demo patients if API did not find
    if (!matchedPatient) {
        if (queryClean === 'MT-26926' || queryDigits === '9820480534' || queryClean.includes('MANDORA')) {
            matchedPatient = {
                id: 'MT-26926',
                patient_code: 'MT-26926',
                name: 'Dev Mandora',
                phone: '9820480534',
                email: 'dev.mandora@somaiya.edu',
                age: 21,
                blood_group: 'B+',
                allergies: ['Penicillin'],
                chronic_conditions: []
            };
        } else if (queryClean === 'MT-50298' || queryDigits === '9324476116' || queryClean.includes('HARSHAL')) {
            matchedPatient = {
                id: 'MT-50298',
                patient_code: 'MT-50298',
                name: 'Harshal Mehta',
                phone: '9324476116',
                email: 'harshal.mehta@somaiya.edu',
                age: 21,
                blood_group: 'O+',
                allergies: [],
                chronic_conditions: []
            };
        } else if (queryClean === 'MT-10482' || queryDigits === '9876543210' || queryClean.includes('AARNAV')) {
            matchedPatient = {
                id: 'MT-10482',
                patient_code: 'MT-10482',
                name: 'Aarnav Mehta',
                phone: '9876543210',
                email: 'aarnav.mehta@example.com',
                age: 24,
                blood_group: 'B+',
                allergies: ['Penicillin', 'Dust Mites'],
                chronic_conditions: ['Mild Asthma (controlled)']
            };
        }
    }

    // 3. Fallback local session search
    if (!matchedPatient) {
        const savedPt = sessionStorage.getItem('MEDITRAIL_CURRENT_PATIENT');
        if (savedPt) {
            try {
                const ptObj = JSON.parse(savedPt);
                const ptPhone = (ptObj.phone || '').replace(/[^0-9]/g, '');
                const ptCode = (ptObj.patient_code || ptObj.id || '').toUpperCase();
                if ((queryDigits && ptPhone.includes(queryDigits)) || ptCode === queryClean) {
                    matchedPatient = ptObj;
                }
            } catch (e) {}
        }
    }

    // 4. Auto-register patient if not found
    if (!matchedPatient) {
        const newCode = queryClean.startsWith('MT-') ? queryClean : `MT-${Math.floor(10000 + Math.random() * 90000)}`;
        const ptName = (queryDigits.length >= 7 && !queryClean.startsWith('MT-')) ? `Patient (${queryDigits})` : (queryClean.startsWith('MT-') ? `Patient (${queryClean})` : query);

        matchedPatient = {
            id: newCode,
            patient_code: newCode,
            name: ptName,
            phone: queryDigits || '9876543210',
            age: 24,
            dob: '2002-04-15',
            gender: 'Male',
            blood_group: 'B+',
            allergies: [],
            chronic_conditions: []
        };

        if (window.MediTrailAPI && window.MediTrailAPI.registerPatient) {
            try {
                await window.MediTrailAPI.registerPatient({
                    patientCode: matchedPatient.patient_code,
                    name: matchedPatient.name,
                    phone: matchedPatient.phone,
                    dob: matchedPatient.dob,
                    gender: matchedPatient.gender,
                    bloodGroup: matchedPatient.blood_group
                });
            } catch (e) {
                console.warn('Java API patient auto-create notice:', e.message);
            }
        }
    }

    const ptCode = matchedPatient.patient_code || matchedPatient.id;
    pendingPatientAccess = matchedPatient;

    // Initiate Dedicated Patient Access OTP Flow
    showAdminToast(`Requesting Patient Access OTP for ${matchedPatient.name}...`, 'info');

    try {
        if (window.MediTrailAPI && window.MediTrailAPI.requestPatientAccessOtp) {
            const resp = await window.MediTrailAPI.requestPatientAccessOtp(ptCode);
            currentAccessRequestId = resp.accessRequestId;

            // Update UI elements in the Access OTP Card
            const badgeEl = document.getElementById('access-otp-patient-badge');
            if (badgeEl) badgeEl.textContent = `Patient: ${matchedPatient.name} (${ptCode})`;

            const recipientEl = document.getElementById('access-otp-recipient');
            if (recipientEl) {
                recipientEl.textContent = resp.maskedContact || matchedPatient.email || matchedPatient.phone || 'registered contact';
            }

            if (otpCard) {
                otpCard.style.display = 'block';
                otpCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            startAccessOtpCooldown(60);

            if (otpInput) {
                otpInput.focus();
            }

            showAdminToast(`Security Access OTP dispatched to ${resp.maskedContact || 'patient'}. Please enter the 6-digit code to unlock records.`, 'success');
        } else {
            throw new Error('Patient Access OTP service unavailable');
        }
    } catch (err) {
        console.error('Failed to request patient access OTP:', err);
        showAdminToast(err.message || 'Unable to dispatch Patient Access OTP. Please try again.', 'error');
        if (otpCard) otpCard.style.display = 'none';
    }
};

/**
 * Verifies entered Patient Access OTP through the backend
 */
window.verifyDoctorAccessOtp = async function() {
    if (!pendingPatientAccess) {
        showAdminToast('No active patient access request. Please search for a patient first.', 'warning');
        return;
    }

    const otpInput = document.getElementById('doctor-access-otp-input');
    const otp = otpInput ? otpInput.value.trim() : '';
    const errorMsg = document.getElementById('access-otp-error-msg');
    const verifyBtn = document.getElementById('btn-verify-access-otp');

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        if (errorMsg) {
            errorMsg.textContent = 'Please enter a valid 6-digit numeric access OTP.';
            errorMsg.style.display = 'block';
        }
        if (otpInput) otpInput.style.borderColor = '#ef4444';
        return;
    }

    if (errorMsg) errorMsg.style.display = 'none';
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
    }

    const ptCode = pendingPatientAccess.patient_code || pendingPatientAccess.id;

    try {
        if (!window.MediTrailAPI || !window.MediTrailAPI.verifyPatientAccessOtp) {
            throw new Error('Access OTP verification service is unavailable.');
        }

        const verifyRes = await window.MediTrailAPI.verifyPatientAccessOtp(currentAccessRequestId, ptCode, otp);

        if (verifyRes.success) {
            // Access granted!
            if (accessOtpCooldownTimer) {
                clearInterval(accessOtpCooldownTimer);
                accessOtpCooldownTimer = null;
            }

            const otpCard = document.getElementById('doctor-access-otp-card');
            if (otpCard) otpCard.style.display = 'none';

            activeDoctorSelectedPatient = pendingPatientAccess;
            pendingPatientAccess = null;
            currentAccessRequestId = null;

            // Load records securely (backend will now authorize because session is verified)
            await loadDoctorPatientRecords(ptCode);
            renderDoctorPatientRecords();

            showAdminToast(`Medical records unlocked! Access granted for ${activeDoctorSelectedPatient.name} (${ptCode})`, 'success');
        } else {
            throw new Error(verifyRes.error || 'Verification failed. Please check the OTP.');
        }
    } catch (err) {
        console.error('Access OTP verification error:', err);
        const errMsg = err.message || 'Invalid or expired OTP. Please try again.';
        if (errorMsg) {
            errorMsg.textContent = errMsg;
            errorMsg.style.display = 'block';
        }
        if (otpInput) {
            otpInput.style.borderColor = '#ef4444';
            otpInput.select();
        }
        showAdminToast(errMsg, 'error');
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Unlock Records';
        }
    }
};

/**
 * Resends Patient Access OTP respecting the cooldown period
 */
window.resendDoctorAccessOtp = async function() {
    if (!pendingPatientAccess) {
        showAdminToast('No active patient access request.', 'warning');
        return;
    }
    if (accessOtpCooldownSeconds > 0) {
        showAdminToast(`Please wait ${accessOtpCooldownSeconds}s before requesting a new OTP.`, 'warning');
        return;
    }

    const ptCode = pendingPatientAccess.patient_code || pendingPatientAccess.id;
    const otpErrMsg = document.getElementById('access-otp-error-msg');
    if (otpErrMsg) otpErrMsg.style.display = 'none';

    try {
        const resp = await window.MediTrailAPI.requestPatientAccessOtp(ptCode);
        currentAccessRequestId = resp.accessRequestId;

        const recipientEl = document.getElementById('access-otp-recipient');
        if (recipientEl && resp.maskedContact) {
            recipientEl.textContent = resp.maskedContact;
        }

        startAccessOtpCooldown(60);

        const otpInput = document.getElementById('doctor-access-otp-input');
        if (otpInput) {
            otpInput.value = '';
            otpInput.style.borderColor = '#cbd5e1';
            otpInput.focus();
        }

        showAdminToast(`A new Patient Access OTP has been dispatched to ${resp.maskedContact || 'patient'}.`, 'success');
    } catch (err) {
        console.error('Failed to resend access OTP:', err);
        showAdminToast(err.message || 'Failed to resend OTP. Please try again.', 'error');
    }
};

/**
 * Cancels current Patient Access OTP verification request
 */
window.cancelDoctorAccessOtp = function() {
    if (accessOtpCooldownTimer) {
        clearInterval(accessOtpCooldownTimer);
        accessOtpCooldownTimer = null;
    }
    pendingPatientAccess = null;
    currentAccessRequestId = null;

    const otpCard = document.getElementById('doctor-access-otp-card');
    if (otpCard) otpCard.style.display = 'none';

    const otpInput = document.getElementById('doctor-access-otp-input');
    if (otpInput) otpInput.value = '';

    const patientCard = document.getElementById('doctor-patient-card');
    if (patientCard) patientCard.style.display = 'none';

    showAdminToast('Patient record access request cancelled.', 'info');
};

/**
 * Loads patient records for Doctor view
 */
async function loadDoctorPatientRecords(ptCode) {
    activeDoctorPatientRecords = [];

    // Java Backend API fetch (authoritative access controlled)
    if (window.MediTrailAPI && window.MediTrailAPI.getMedicalRecords) {
        try {
            const apiRecords = await window.MediTrailAPI.getMedicalRecords(ptCode);
            if (Array.isArray(apiRecords)) {
                activeDoctorPatientRecords = apiRecords;
                return;
            }
        } catch (e) {
            console.warn('Java API load doctor records warning:', e.message);
            // If backend blocked access with 403 Forbidden or OTP required, enforce gating strictly
            if (e.message && (e.message.includes('403') || e.message.includes('OTP') || e.message.includes('Forbidden') || e.message.includes('unauthorized'))) {
                throw e;
            }
        }
    }

    // Local storage fetch fallback for offline development
    const local = localStorage.getItem(`MEDITRAIL_RECORDS_${ptCode}`);
    if (local) {
        try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) activeDoctorPatientRecords = parsed;
        } catch (e) {}
    }
}

/**
 * Renders patient records in Doctor view
 */
function renderDoctorPatientRecords() {
    const cardEl = document.getElementById('doctor-patient-card');
    const listEl = document.getElementById('doc-patient-records-list');
    if (!listEl) return;

    if (!activeDoctorSelectedPatient) {
        if (cardEl) cardEl.style.display = 'none';
        return;
    }

    if (cardEl) cardEl.style.display = 'block';

    const pt = activeDoctorSelectedPatient;
    const ptCode = pt.patient_code || pt.id || 'MT-10482';
    const records = activeDoctorPatientRecords || [];

    document.getElementById('doc-pt-name').textContent = pt.name || 'Patient';
    document.getElementById('doc-pt-info').textContent = `ID: ${ptCode} • Age: ${pt.age || 24} (${pt.dob || 'N/A'}) • Blood Group: ${pt.blood_group || pt.bloodGroup || 'B+'} • Phone: ${pt.phone || 'N/A'}`;

    if (records.length === 0) {
        listEl.innerHTML = `
            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 2rem; border-radius: 8px; text-align: center; color: #64748b;">
                <p style="margin-bottom: 0.5rem; font-weight: 500;">No clinical records found for Patient ${pt.name} (${ptCode})</p>
                <p style="font-size: 0.8rem;">Click <strong>"+ Add New Clinical Event / Prescription"</strong> above to add medical entries for this patient.</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = records.map(rec => {
        const isOngoing = (rec.status || '').toLowerCase() === 'ongoing';
        const badgeBg = isOngoing ? '#fff7ed' : '#dcfce7';
        const badgeColor = isOngoing ? '#c2410c' : '#166534';
        const badgeBorder = isOngoing ? '#ffedd5' : '#bbf7d0';
        const badgeIcon = isOngoing 
            ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:-1px; margin-right:3px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>Status: Ongoing' 
            : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:-1px; margin-right:3px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Status: Completed';

        return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 1.15rem; border-radius: 10px; margin-bottom: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                <div>
                    <span style="display: inline-flex; align-items: center; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.35rem;">
                        ${badgeIcon}
                    </span>
                    <h4 style="font-weight: 700; color: #0f2744; font-size: 1.05rem; margin: 0;">${rec.title}</h4>
                </div>
                <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:-1px; margin-right:3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    ${rec.date} (${rec.hospital})
                </span>
            </div>
            <p style="font-size: 0.875rem; color: #334155; margin: 0.4rem 0 0.6rem 0;">${rec.shortDescription || rec.details?.diagnosis || ''}</p>
            <div style="font-size: 0.8rem; color: #0d9488; font-weight: 600; border-top: 1px dashed #e2e8f0; padding-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Physician: ${rec.doctor} • Category: ${rec.category}
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Doctor adding new clinical record
 */
window.openAddRecordModal = function() {
    if (!activeDoctorSelectedPatient) {
        showAdminToast('Please search and select a patient first before adding a prescription or clinical record.', 'warning');
        return;
    }
    const modal = document.getElementById('modal-add-record');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '999999';
    }
};

window.closeAddRecordModal = function() {
    const modal = document.getElementById('modal-add-record');
    if (modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
    }
};

window.saveDoctorClinicalRecord = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const titleInput = document.getElementById('rec-add-title');
    const catInput = document.getElementById('rec-add-category');
    const statusInput = document.getElementById('rec-add-status');
    const diagInput = document.getElementById('rec-add-diagnosis');
    const notesInput = document.getElementById('rec-add-notes');
    const medInput = document.getElementById('rec-add-med');

    const title = titleInput ? titleInput.value.trim() : '';
    const category = catInput ? catInput.value : 'Treatments';
    const status = statusInput ? statusInput.value : 'Completed';
    const diagnosis = diagInput ? diagInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';
    const med = medInput ? medInput.value.trim() : '';

    if (!title || !diagnosis) {
        showAdminToast('Event Title and Diagnosis & Findings are required.', 'warning');
        return;
    }

    const ptCode = activeDoctorSelectedPatient ? (activeDoctorSelectedPatient.patient_code || activeDoctorSelectedPatient.id) : 'MT-50298';
    const ptName = activeDoctorSelectedPatient ? activeDoctorSelectedPatient.name : 'Patient';

    const newRecord = {
        id: `rec-${Date.now()}`,
        year: new Date().getFullYear(),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        type: category.slice(0, -1),
        category: category,
        title: title,
        hospital: currentAdminUser ? currentAdminUser.hospitalName : "St. Jude Orthopedic Care",
        doctor: currentAdminUser ? currentAdminUser.name : "Dr. Meera Nambiar",
        department: "Orthopedics & Clinical Care",
        shortDescription: diagnosis,
        status: status,
        badgeColor: status === 'Ongoing' ? 'orange' : 'teal',
        details: {
            diagnosis: diagnosis,
            procedure: "Clinical Specialist Assessment",
            clinicalNotes: notes,
            treatmentPlan: "Follow up in 2 weeks.",
            medications: med ? [{ name: med, dose: "As prescribed", instructions: "Daily" }] : [],
            attachments: []
        }
    };

    // Ensure MEDITRAIL_DATA arrays exist safely
    if (!window.MEDITRAIL_DATA) window.MEDITRAIL_DATA = {};
    if (!window.MEDITRAIL_DATA.timelineRecords) window.MEDITRAIL_DATA.timelineRecords = [];
    if (!window.MEDITRAIL_DATA.auditLogs) window.MEDITRAIL_DATA.auditLogs = [];

    // 1. Save locally to active patient record store
    if (!activeDoctorPatientRecords) activeDoctorPatientRecords = [];
    activeDoctorPatientRecords.unshift(newRecord);
    localStorage.setItem(`MEDITRAIL_RECORDS_${ptCode}`, JSON.stringify(activeDoctorPatientRecords));

    window.MEDITRAIL_DATA.timelineRecords.unshift(newRecord);

    const auditData = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        doctorName: currentAdminUser ? currentAdminUser.name : "Dr. Meera Nambiar",
        patientId: ptCode,
        hospitalName: currentAdminUser ? currentAdminUser.hospitalName : "St. Jude Orthopedic Care",
        action: `Added Prescription/Record for ${ptName}: ${title} (${status})`,
        ipAddress: "192.168.1.55"
    };

    window.MEDITRAIL_DATA.auditLogs.unshift(auditData);

    // 2. Insert to Java Backend Database API
    if (window.MediTrailAPI && window.MediTrailAPI.createMedicalRecord) {
        window.MediTrailAPI.createMedicalRecord({
            patientCode: ptCode,
            year: newRecord.year,
            date: newRecord.date,
            type: newRecord.type,
            category: newRecord.category,
            title: newRecord.title,
            hospital: newRecord.hospital,
            doctor: newRecord.doctor,
            department: newRecord.department,
            shortDescription: newRecord.shortDescription,
            status: status,
            diagnosis: diagnosis,
            procedureNotes: "Clinical Specialist Assessment",
            clinicalNotes: notes,
            treatmentPlan: "Follow up in 2 weeks.",
            medications: newRecord.details.medications,
            attachments: []
        }).catch(e => console.warn('Java API record insert warning:', e.message));

        window.MediTrailAPI.createAuditLog(auditData).catch(e => console.warn('Java API audit insert warning:', e.message));
    }

    // Reset form inputs
    if (titleInput) titleInput.value = '';
    if (diagInput) diagInput.value = '';
    if (notesInput) notesInput.value = '';
    if (medInput) medInput.value = '';

    renderDoctorPatientRecords();
    renderAuditLogs();
    closeAddRecordModal();
    showAdminToast(`Prescription / Clinical Record created for Patient ${ptName} (${ptCode}) and saved!`, 'success');
};

/**
 * Renders security audit logs table
 */
async function renderAuditLogs() {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    let logs = [];
    let fetched = false;

    if (window.MediTrailAPI && window.MediTrailAPI.getAuditLogs) {
        try {
            const apiLogs = await window.MediTrailAPI.getAuditLogs();
            if (Array.isArray(apiLogs) && apiLogs.length > 0) {
                logs = apiLogs;
                fetched = true;
            }
        } catch (e) {
            console.warn('Java API audit logs fetch error:', e.message);
        }
    }

    if (!fetched) {
        const data = window.MEDITRAIL_DATA || {};
        logs = data.auditLogs || [];
    }

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 1.5rem;">No audit logs recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td style="font-size: 0.8rem; color: #64748b;">${new Date(log.timestamp).toLocaleString()}</td>
            <td style="font-weight: 600; color: #0f2744;">${log.doctorName || log.doctor_name || 'System / Staff'}</td>
            <td style="font-family: monospace;">${log.patientId || log.patient_id || 'N/A'}</td>
            <td style="color: #0d9488; font-weight: 500;">${log.action || ''}</td>
            <td style="font-size: 0.8rem; color: #94a3b8;">${log.ipAddress || log.ip_address || '127.0.0.1'}</td>
        </tr>
    `).join('');
}

/**
 * Updates the header metric cards dynamically based on current local and session state.
 */
async function updateDynamicMetrics() {
    const title1 = document.getElementById('metric-title-1');
    const val1 = document.getElementById('metric-val-1');
    const title2 = document.getElementById('metric-title-2');
    const val2 = document.getElementById('metric-val-2');
    const title3 = document.getElementById('metric-title-3');
    const val3 = document.getElementById('metric-val-3');
    const title4 = document.getElementById('metric-title-4');
    const val4 = document.getElementById('metric-val-4');

    let backendStats = null;
    if (window.MediTrailAPI && window.MediTrailAPI.getAdminStats) {
        try {
            backendStats = await window.MediTrailAPI.getAdminStats();
        } catch (e) {
            console.warn('Java API stats fetch warning:', e.message);
        }
    }

    const data = window.MEDITRAIL_DATA || {};
    const card1 = document.getElementById('metric-card-1');
    const card2 = document.getElementById('metric-card-2');
    const card3 = document.getElementById('metric-card-3');
    const card4 = document.getElementById('metric-card-4');
    const metricsGrid = document.getElementById('admin-metrics-grid');

    const roleLower = currentAdminUser ? (currentAdminUser.role || '').toLowerCase().replace('-', '_') : '';
    const isSuperAdmin = (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'manager');
    const isHospitalAdmin = (roleLower === 'hospital_admin' || roleLower === 'admin');

    if (isSuperAdmin) {
        if (metricsGrid) metricsGrid.style.display = 'grid';
        if (card1) card1.style.display = '';
        if (card2) card2.style.display = 'none';
        if (card3) card3.style.display = '';
        if (card4) card4.style.display = 'none';
        // Manager Specific Metrics
        const hospitals = data.hospitals || [];
        const users = data.rbacUsers || [];
        
        const hospAdminsCount = users.filter(u => u.role === 'hospital_admin' || u.role === 'admin').length;
        const superAdminsCount = users.filter(u => u.role === 'super_admin' || u.role === 'manager').length;

        if (title1) title1.textContent = 'Empanelled Network Hospitals';
        const totalHosp = backendStats ? (backendStats.totalHospitals ?? backendStats.total_hospitals) : null;
        if (val1) val1.textContent = totalHosp != null ? totalHosp : (hospitals.length || 0);

        if (title3) title3.textContent = 'Platform Managers';
        const totalSA = backendStats ? (backendStats.totalSuperAdmins ?? backendStats.total_super_admins) : null;
        if (val3) val3.textContent = totalSA != null ? totalSA : (superAdminsCount || 1);
    } else if (isHospitalAdmin) {
        // Hospital Admin: Only Registered Hospital Doctors
        if (metricsGrid) metricsGrid.style.display = 'grid';
        if (card1) card1.style.display = '';
        if (card2) card2.style.display = 'none';
        if (card3) card3.style.display = 'none';
        if (card4) card4.style.display = 'none';

        let doctors = data.doctorsList || [];
        let docCount = 0;
        if (currentAdminUser) {
            const userHospRaw = (currentAdminUser.hospitalName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            docCount = doctors.filter(d => {
                const docHospRaw = (d.hospitalName || d.hospital_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return (!d.role || d.role === 'doctor') && (docHospRaw.includes(userHospRaw) || userHospRaw.includes(docHospRaw));
            }).length;
        }

        const hospDocs = backendStats ? (backendStats.hospitalDoctors ?? backendStats.hospital_doctors) : null;
        if (hospDocs != null) {
            docCount = hospDocs;
        }
        
        if (title1) title1.textContent = 'Registered Hospital Doctors';
        if (val1) val1.textContent = docCount || 0;
    } else {
        // Doctor: Purely clinical consultation and patient record search - hide all metric cards
        if (metricsGrid) metricsGrid.style.display = 'none';
        if (card1) card1.style.display = 'none';
        if (card2) card2.style.display = 'none';
        if (card3) card3.style.display = 'none';
        if (card4) card4.style.display = 'none';
    }
}
