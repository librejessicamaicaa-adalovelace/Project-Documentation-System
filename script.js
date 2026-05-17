// --- 1. DATA CORE & STORAGE ---
function getSystemDateTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

let db = JSON.parse(localStorage.getItem('jira_master_db')) || {
    "Project Modification": [], "Parallel Testing Tracker": [], "Project Tracker": [], "Test Case": [],
    "Assignee Enrolment": [], "Project Enrollment": [], "QA Enrollment": [], "Requestor Enrollment": []
};
if (!db["User Management"]) db["User Management"] = [];
if (db["User Management"].length === 0) {
    db["User Management"].push({
        "User ID": 1,
        "Full Name": "System Administrator",
        "Username": "admin",
        "Password": "admin123",
        "Role": "Admin",
        "Status": "Active",
        "Enrollment Date": getSystemDateTime()
    });
}
const save = () => localStorage.setItem('jira_master_db', JSON.stringify(db));

let currentFilterProject = "ALL";
let currentViewName = "Dashboard";
let currentUser = null;
const isEnrollmentDateField = (h) => h === "Enrollment Date";
const isOptionalDateField = (h) => h === "Date Modified";
const isDateField = (h) => h.toLowerCase().includes("date");
const themes = [
    { value: 'professional', label: 'PROFESSIONAL' },
    { value: 'dark-orange', label: 'DARK & ORANGE' },
    { value: 'gray-white', label: 'GRAY & WHITE' },
    { value: 'charcoal', label: 'CHARCOAL' },
    { value: 'neon', label: 'NEON' },
    { value: 'all-gray', label: 'ALL GRAY' },
    { value: 'black-white', label: 'BLACK & WHITE' },
    { value: 'maroon-white', label: 'MAROON & WHITE' },
    { value: 'maroon-black', label: 'MAROON & BLACK' }
];
const normalizeTheme = (theme) => themes.some(t => t.value === theme) ? theme : 'professional';
const formatDateForDisplay = (val) => {
    if (!val) return '';
    const isoMatch = String(val).match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
    if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}${isoMatch[4]}`;
    const usMatch = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
    if (usMatch) return `${String(usMatch[1]).padStart(2, '0')}/${String(usMatch[2]).padStart(2, '0')}/${usMatch[3]}${usMatch[4]}`;
    return val;
};
const toDateInputValue = (val) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const parsed = new Date(val);
    if (Number.isNaN(parsed.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
};
function openDatePicker(input) {
    if (input.showPicker) input.showPicker();
}
const isCelebrationStatus = (status) => ["Complete", "Deployment"].includes(status);

function changeTheme(theme) {
    theme = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jira_theme', theme);
    renderHeaderActions(); // Refresh buttons to match theme
}

function isAdmin() {
    return currentUser && currentUser.Role === "Admin";
}

function initAuth() {
    save();
    const sessionUsername = localStorage.getItem('jira_current_user');
    currentUser = db["User Management"].find(u => u.Username === sessionUsername && u.Status === "Active") || null;

    document.getElementById('loginForm').onsubmit = handleLogin;
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const user = db["User Management"].find(u => u.Username === username && u.Password === password && u.Status === "Active");

    if (!user) {
        document.getElementById('loginError').innerText = "Invalid username, password, or inactive account.";
        return;
    }

    currentUser = user;
    localStorage.setItem('jira_current_user', user.Username);
    document.getElementById('loginError').innerText = "";
    document.getElementById('loginForm').reset();
    showApp();
}

function showLogin() {
    document.querySelector('.app-container').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('.app-container').style.display = 'flex';
    document.getElementById('currentUserBadge').innerHTML = `<strong>${currentUser["Full Name"]}</strong><span>${currentUser.Role}</span>`;
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin() ? '' : 'none');
    if (!isAdmin() && currentViewName === "User Management") currentViewName = "Dashboard";
    showView(currentViewName);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('jira_current_user');
    currentViewName = "Dashboard";
    showLogin();
}

// --- 2. CLOCK ---
function updateClock() {
    const el = document.getElementById('digital-clock');
    if (!el) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()}`;
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `<span>${date}</span><strong>${time}</strong>`;
}
setInterval(updateClock, 1000);

// --- 3. POLISHED FILTER LOGIC ---
function renderGlobalFilter() {
    const area = document.getElementById('project-filter-area');
    const trackers = ["Project Modification", "Parallel Testing Tracker", "Project Tracker", "Test Case", "Dashboard"];
    
    if (!trackers.includes(currentViewName)) { area.innerHTML = ''; return; }
    
    const projects = db["Project Enrollment"].map(p => p["Project Name"]);
    let opts = `<option value="ALL" ${currentFilterProject === 'ALL' ? 'selected' : ''}>-- ALL PROJECTS --</option>`;
    projects.forEach(p => opts += `<option value="${p}" ${currentFilterProject === p ? 'selected' : ''}>${p}</option>`);

    // Injects the beautified pill-shaped group
    area.innerHTML = `
        <div class="header-filter-group">
            <label class="project-filter-label">Filter</label>
            <select class="project-select" onchange="applyFilter(this.value)">${opts}</select>
        </div>`;
}

function applyFilter(val) { 
    currentFilterProject = val; 
    showView(currentViewName); 
}

// --- 4. NAVIGATION & HEADER ACTIONS ---
function showView(view) {
    if (view === "User Management" && !isAdmin()) {
        alert("Only admin users can access User Management.");
        view = "Dashboard";
    }
    currentViewName = view;
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.toggle('active', (li.dataset.view || li.innerText) === view));
    document.getElementById('view-title').innerText = view;
    
    renderGlobalFilter();
    renderHeaderActions();
    
    const content = document.getElementById('content-area');
    if (view === 'Dashboard') {
        renderDashboard(content);
    } else {
        renderTable(view, content);
    }
}

function renderHeaderActions() {
    const area = document.getElementById('header-action-area');
    const cur = normalizeTheme(localStorage.getItem('jira_theme'));
    
    const themeHTML = `
        <select class="project-select" style="border:1px solid var(--border); padding:5px 10px; border-radius:50px; margin-right:10px;" onchange="changeTheme(this.value)">
            ${themes.map(t => `<option value="${t.value}" ${cur === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>`;

    const logoutHTML = currentUser ? `<button class="btn-secondary compact" onclick="logout()">Logout</button>` : '';
    const exportHTML = `<button class="btn-secondary compact" onclick="exportCurrentView('excel')">Export Excel</button>`;
    area.innerHTML = (currentViewName === 'Dashboard')
        ? themeHTML + logoutHTML
        : themeHTML + exportHTML + `<button class="btn-primary" onclick="openModal('${currentViewName}')">+ Create Record</button>` + logoutHTML;
}

// --- 5. DASHBOARD RENDERING ---
function renderDashboard(area) {
    area.innerHTML = '';
    const sets = [
        { title: "Summary of Project Modification", key: "Project Modification", accent: "var(--summary-a)", stats: ["To Do", "In Progress", "For Review", "Next Phase", "Complete"] }, 
        { title: "Summary of Parallel Testing Modification", key: "Parallel Testing Tracker", accent: "var(--summary-b)", stats: ["To Do", "In Progress", "For Review", "Next Phase", "Complete"] }, 
        { title: "Summary of Project Portfolio", key: "Project Tracker", accent: "var(--summary-c)", stats: ["Planning", "Requirements", "Design", "Implementation", "Testing", "Deployment", "Maintenance"] }
    ];
    sets.forEach(s => {
        let data = db[s.key] || [];
        if (currentFilterProject !== "ALL") data = data.filter(i => i["Project Name"] === currentFilterProject);
        const countHTML = s.stats.map(st => {
            const count = data.filter(i => i.Status === st).length;
            const celebrateClass = isCelebrationStatus(st) ? ' stat-card-celebrate' : '';
            return `<div class="stat-card${celebrateClass}" onclick="handleStatClick('${s.key}', '${st}')"><h5>${st}</h5><span>${count}</span></div>`;
        }).join('');
        area.innerHTML += `<div class="summary-section" style="--summary-accent:${s.accent};"><h4>${s.title}</h4><div class="stats-grid" style="grid-template-columns: repeat(${s.stats.length}, 1fr);">${countHTML}</div></div>`;
    });
}

function handleStatClick(key, status) {
    if (isCelebrationStatus(status)) launchConfetti();
    viewDetails(key, status);
}

function launchConfetti() {
    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
    for (let i = 0; i < 70; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = `${Math.random() * 0.25}s`;
        piece.style.transform = `rotate(${Math.random() * 180}deg)`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 1800);
    }
}

function viewDetails(key, status) {
    let list = db[key].filter(i => i.Status === status);
    if (currentFilterProject !== "ALL") list = list.filter(i => i["Project Name"] === currentFilterProject);
    const hdrs = getHeaders(key);
    document.getElementById('dashModalTitle').innerText = `${key} - [${status}] Details`;
    let html = list.length === 0 ? `<div style="padding:80px; text-align:center;">No records found.</div>` : 
        `<div class="table-container" style="padding:0"><table><thead><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${list.map(r => `<tr>${hdrs.map(h => `<td>${formatCellValue(h, r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    document.getElementById('dashModalBody').innerHTML = html;
    document.getElementById('dashboardListModal').style.display = "block";
}

// --- 6. TABLE & MODAL LOGIC ---
function renderTable(v, area) {
    const hdrs = getHeaders(v);
    let data = getViewData(v);
    area.innerHTML = `<div class="table-container"><table><thead><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}<th>Action</th></tr></thead>
    <tbody>${data.length === 0 ? `<tr><td colspan="${hdrs.length+1}" align="center" style="padding:40px">No records found.</td></tr>` : data.map((r, i) => `<tr>${hdrs.map(h => `<td>${formatCellValue(h, r[h])}</td>`).join('')}<td><span style="color:var(--primary);cursor:pointer;font-weight:bold" onclick="editItem('${v}',${db[v].indexOf(r)})">Edit</span> | <span style="color:#ef4444;cursor:pointer;font-weight:bold" onclick="deleteItem('${v}',${db[v].indexOf(r)})">Delete</span></td></tr>`).join('')}</tbody></table></div>`;
}

function formatCellValue(header, value) {
    if (header === "Password") return value ? "••••••" : "-";
    if (isDateField(header)) return formatDateForDisplay(value) || "-";
    return value || "-";
}

function getViewData(v) {
    let data = db[v] || [];
    if (currentFilterProject !== "ALL" && getHeaders(v).includes("Project Name") && v !== "Project Enrollment") {
        data = data.filter(r => r["Project Name"] === currentFilterProject);
    }
    return data;
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function exportCurrentView(type) {
    const hdrs = getHeaders(currentViewName);
    const rows = getViewData(currentViewName);
    const stamp = new Date().toISOString().slice(0, 10);
    const filenameBase = `${currentViewName.replace(/[^a-z0-9]+/gi, '_')}_${stamp}`;

    if (type === 'excel') {
        const table = `<table><thead><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${hdrs.map(h => `<td>${h === "Password" ? "" : (isDateField(h) ? formatDateForDisplay(r[h]) : (r[h] || ''))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        downloadFile(`${filenameBase}.xls`, table, 'application/vnd.ms-excel');
        return;
    }

    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
        hdrs.map(escapeCsv).join(','),
        ...rows.map(r => hdrs.map(h => escapeCsv(isDateField(h) ? formatDateForDisplay(r[h]) : r[h])).join(','))
    ].join('\n');
    downloadFile(`${filenameBase}.csv`, csv, 'text/csv;charset=utf-8;');
}

function openModal(view, idx = null) {
    if (view === "User Management" && !isAdmin()) {
        alert("Only admin users can manage users.");
        return;
    }
    const hdrs = getHeaders(view);
    const isEdit = idx !== null;
    const record = isEdit ? db[view][idx] : {};
    document.getElementById('modalTitle').innerText = isEdit ? "Edit Record" : `New ${view}`;

    document.getElementById('formFields').innerHTML = hdrs.filter(h => h !== "Action").map(h => {
        let val = record[h] || '';
        if (!isEdit && h === 'Project Name' && view !== 'Project Enrollment' && currentFilterProject !== "ALL") {
            val = currentFilterProject;
        }

        // Auto-Increment ID
        if (h.toLowerCase().includes("id") && !isEdit) {
            return `<div class="form-group"><label>${h}</label><input id="f-${h}" value="${db[view].length + 1}" readonly style="background:var(--border); opacity:0.7;"></div>`;
        }

        // Relational Mapping
        if (view === 'User Management' && h === 'Role') return genDrop(h, ["Admin", "User"], val);
        if (view === 'User Management' && h === 'Status') return genDrop(h, ["Active", "Inactive"], val || "Active");
        if (h === 'Project Name' && view !== 'Project Enrollment') return genDrop(h, db["Project Enrollment"].map(p => p["Project Name"]), val, "Project");
        if (h === 'Requested') return genDrop(h, db["Requestor Enrollment"].map(r => r["Client / Requestor Name"]), val, "Requestor");
        if (h === 'Assignee') return genDrop(h, db["Assignee Enrolment"].map(a => a["Employee Name"]), val, "Assignee");
        if (h === 'QA') return genDrop(h, db["QA Enrollment"].map(q => q["Employee Name"]), val, "QA");
        if (h === 'Status') {
            const opts = view === 'Project Tracker'
                ? ["Planning", "Requirements", "Design", "Implementation", "Testing", "Deployment", "Maintenance"]
                : view === 'Test Case'
                    ? ["Ready for Testing", "In Progress", "Passed", "Failed"]
                    : ["To Do", "In Progress", "For Review", "Next Phase", "Complete"];
            return genDrop(h, opts, val);
        }

        // System-generated enrollment timestamp
        if (isEnrollmentDateField(h)) {
            const displayValue = val || 'Auto-generated on save';
            return `<div class="form-group"><label>${h}</label><input id="f-${h}" value="${displayValue}" readonly style="background:var(--border); opacity:0.7;"></div>`;
        }

        // Date Picker Fix
        if (isDateField(h)) {
            const requiredAttr = isOptionalDateField(h) ? '' : 'required';
            return `<div class="form-group"><label>${h}</label><input type="date" id="f-${h}" value="${toDateInputValue(val)}" ${requiredAttr} onclick="openDatePicker(this)" style="cursor:pointer"></div>`;
        }

        if (h === 'Password') {
            return `<div class="form-group"><label>${h}</label><input type="password" id="f-${h}" value="${val}" required autocomplete="new-password"></div>`;
        }

        return `<div class="form-group"><label>${h}</label><input id="f-${h}" value="${val}" required autocomplete="off"></div>`;
    }).join('');

    document.getElementById('dataModal').style.display = 'block';
    document.getElementById('entryForm').onsubmit = (e) => {
        e.preventDefault();
        let entry = isEdit ? record : {};
        hdrs.forEach(h => {
            const field = document.getElementById(`f-${h}`);
            if (!field) return;
            if (isEnrollmentDateField(h) && (!isEdit || !record[h])) {
                entry[h] = getSystemDateTime();
            } else if (isDateField(h) && field.value) {
                entry[h] = formatDateForDisplay(field.value);
            } else {
                entry[h] = field.value;
            }
        });
        if (view === 'User Management') {
            const duplicate = db["User Management"].some((u, i) => u.Username === entry.Username && i !== idx);
            if (duplicate) {
                alert("Username already exists. Please use a different username.");
                return;
            }
        }
        if (!isEdit) db[view].push(entry); save(); closeModal(); showView(view);
    };
}

// --- 7. HELPERS ---
function genDrop(h, list, cur, ph) {
    let opts = `<option value="">--Select ${ph || h}--</option>` + list.map(i => `<option value="${i}" ${i === cur ? 'selected' : ''}>${i}</option>`).join('');
    return `<div class="form-group"><label>${h}</label><select id="f-${h}" required>${opts}</select></div>`;
}

function getHeaders(v) {
    const m = {
        "Test Case": ["Test Case ID", "Project Name", "Details", "Status", "Date Tested", "Remarks", "QA"],
        "Parallel Testing Tracker": ["Parallel Testing ID", "Project Name", "Details", "Requested", "Date Reported", "Date Modified", "Remarks", "Status"],
        "Project Modification": ["Project Modification ID", "Project Name", "Requested", "Date Reported", "Date Modified", "Remarks", "Status"],
        "Project Tracker": ["Project ID", "Project Name", "Status", "Assignee", "Lacking Requirements", "Remarks"],
        "QA Enrollment": ["QA ID", "Employee Name", "Position", "Enrollment Date"],
        "Requestor Enrollment": ["Requestor ID", "Client / Requestor Name", "Department", "Enrollment Date"],
        "Project Enrollment": ["Project ID", "Project Name", "Department", "Enrollment Date"],
        "Assignee Enrolment": ["Assignee ID", "Employee Name", "Position", "Project Name", "Enrollment Date"],
        "User Management": ["User ID", "Full Name", "Username", "Password", "Role", "Status", "Enrollment Date"]
    };
    return m[v] || ["ID", "Name", "Status", "Date"];
}

function closeModal() { document.getElementById('dataModal').style.display = 'none'; }
function closeDashModal() { document.getElementById('dashboardListModal').style.display = 'none'; }
function deleteItem(v, i) { if (confirm("Delete this record?")) { db[v].splice(i, 1); save(); showView(v); } }
function editItem(v, i) { openModal(v, i); }

// Global Event Listeners
window.onclick = (e) => { if (e.target.className === 'modal') { closeModal(); closeDashModal(); } }
window.onload = () => { updateClock(); changeTheme(localStorage.getItem('jira_theme')); initAuth(); };
