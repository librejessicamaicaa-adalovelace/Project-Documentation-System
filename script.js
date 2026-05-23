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
if (!db["Task Calendar"]) db["Task Calendar"] = [];
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
let activitySelectedDate = "";
let activityMonthDate = null;
let activityCalendarMode = "month";
let activityEditingTaskId = null;
let activityFilterProject = "ALL";
let appDialogCallback = null;
const isEnrollmentDateField = (h) => h === "Enrollment Date";
const isOptionalDateField = (h) => h === "Date Modified";
const isDateField = (h) => h.toLowerCase().includes("date");
const isLongTextField = (h) => ["Details", "Remarks", "Lacking Requirements"].includes(h);
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
const getTodayInputValue = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
const parseDateInput = (value) => {
    const parts = String(value || getTodayInputValue()).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
};
const toInputFromDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};
const formatMonthYear = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const escapeHTML = (val) => String(val ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[char]));
const getProjectNames = () => (db["Project Enrollment"] || [])
    .map(project => project["Project Name"])
    .filter(Boolean);
const getIdHeader = (view) => getHeaders(view).find(h => h.toLowerCase().includes("id"));
const hasProjectSequence = (view) => getHeaders(view).includes("Project Name") && view !== "Project Enrollment" && !!getIdHeader(view);
const getNextSequenceNumber = (view, projectName = "") => {
    const idHeader = getIdHeader(view);
    if (!idHeader) return 1;
    const rows = (db[view] || []).filter(row => !hasProjectSequence(view) || row["Project Name"] === projectName);
    return rows.reduce((max, row) => Math.max(max, Number(row[idHeader]) || 0), 0) + 1;
};

function updateProjectSequenceField(view) {
    if (!hasProjectSequence(view)) return;
    const idHeader = getIdHeader(view);
    const idField = document.getElementById(`f-${idHeader}`);
    const projectField = document.getElementById('f-Project Name');
    if (!idField || !projectField) return;
    idField.value = getNextSequenceNumber(view, projectField.value);
}
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
        showNotice("Access Restricted", "Only admin users can access User Management.");
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
    } else if (view === 'Task Calendar Activities') {
        renderTaskCalendarActivities(content);
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
    if (currentViewName === 'Dashboard') {
        area.innerHTML = themeHTML + logoutHTML;
    } else if (currentViewName === 'Task Calendar Activities') {
        area.innerHTML = themeHTML
            + `<button class="btn-secondary compact" onclick="exportCurrentView('excel')">Export Excel</button>`
            + `<button class="btn-primary" onclick="prepareActivityTaskNew()">+ Add Task</button>`
            + logoutHTML;
    } else {
        area.innerHTML = themeHTML + exportHTML + `<button class="btn-primary" onclick="openModal('${currentViewName}')">+ Create Record</button>` + logoutHTML;
    }
}

function renderTaskCalendarActivities(area) {
    activitySelectedDate = activitySelectedDate || getTodayInputValue();
    activityMonthDate = activityMonthDate || parseDateInput(activitySelectedDate);
    const tasks = getActivityTasksForProject();
    const selectedTasks = getTasksForDate(activitySelectedDate);
    const projectNames = getProjectNames();

    area.innerHTML = `
        <div class="activity-calendar-view">
            <section class="activity-project-strip">
                <div>
                    <span>Select Project</span>
                    <strong>${activityFilterProject === "ALL" ? "All Projects" : escapeHTML(activityFilterProject)}</strong>
                </div>
                <div class="activity-project-select-wrap">
                    <select class="activity-project-select" onchange="setActivityProjectFilter(this.value)">
                        <option value="ALL" ${activityFilterProject === "ALL" ? "selected" : ""}>All Projects</option>
                        ${projectNames.map(project => `<option value="${escapeHTML(project)}" ${activityFilterProject === project ? "selected" : ""}>${escapeHTML(project)}</option>`).join('')}
                    </select>
                    ${projectNames.length === 0 ? `<em>No projects enrolled yet.</em>` : ''}
                </div>
            </section>
            <section class="activity-calendar-main">
                <div class="activity-calendar-toolbar">
                    <div class="calendar-mode-toggle">
                        <button type="button" class="${activityCalendarMode === 'week' ? 'active' : ''}" onclick="setActivityCalendarMode('week')">Week</button>
                        <button type="button" class="${activityCalendarMode === 'month' ? 'active' : ''}" onclick="setActivityCalendarMode('month')">Month</button>
                    </div>
                    <div class="calendar-month-control">
                        <button type="button" onclick="moveActivityMonth(-1)" aria-label="Previous period">&#8249;</button>
                        <strong>${formatMonthYear(activityMonthDate)}</strong>
                        <button type="button" onclick="moveActivityMonth(1)" aria-label="Next period">&#8250;</button>
                    </div>
                    <button type="button" class="calendar-today-btn" onclick="goToActivityToday()">Today</button>
                </div>
                <div class="activity-calendar-grid ${activityCalendarMode === 'week' ? 'week-view' : ''}" style="${getActivityCalendarGridStyle(tasks)}">
                    ${renderActivityCalendarGrid(tasks)}
                </div>
            </section>
            <aside class="activity-task-panel">
                <div class="activity-panel-head">
                    <span>Selected Date</span>
                    <strong>${formatDateForDisplay(activitySelectedDate)}</strong>
                </div>
                <form id="activityTaskForm" class="activity-task-form">
                    <textarea id="activityTaskNotes" placeholder="Details..." rows="5" required></textarea>
                    <div class="activity-task-actions">
                        <button id="activityCancelEditBtn" type="button" class="btn-secondary compact" onclick="cancelActivityTaskEdit()" style="${activityEditingTaskId === null ? 'display:none' : ''}">Cancel</button>
                        <button id="activityTaskSubmitBtn" type="submit" class="btn-primary compact">${activityEditingTaskId === null ? 'Add task' : 'Save task'}</button>
                    </div>
                </form>
                <div class="activity-selected-list">
                    <h4>${selectedTasks.length} ${selectedTasks.length === 1 ? 'Activity' : 'Activities'}</h4>
                    ${renderActivitySelectedTasks(selectedTasks)}
                </div>
            </aside>
        </div>`;

    document.getElementById('activityTaskForm').onsubmit = saveActivityTask;
    hydrateActivityTaskForm();
}

function renderActivityCalendarGrid(tasks) {
    const days = activityCalendarMode === "week" ? getWeekCalendarDays() : getMonthCalendarDays();
    const labels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return `
        ${labels.map(label => `<div class="activity-day-label">${label}</div>`).join('')}
        ${days.map(date => {
            const value = toInputFromDate(date);
            const dayTasks = tasks.filter(task => task.Date === value);
            const isSelected = value === activitySelectedDate;
            const isOutside = date.getMonth() !== activityMonthDate.getMonth();
            return `
                <button type="button" class="activity-day-cell ${isSelected ? 'selected' : ''} ${isOutside && activityCalendarMode === 'month' ? 'outside' : ''}" onclick="selectActivityDate('${value}')">
                    <span class="activity-day-number">${date.getDate()}</span>
                    <div class="activity-day-tasks">
                        ${dayTasks.map(task => `<span>${escapeHTML(getActivityTaskDetails(task)).replace(/\n/g, '<br>')}</span>`).join('')}
                    </div>
                </button>`;
        }).join('')}`;
}

function getActivityCalendarGridStyle(tasks) {
    const days = activityCalendarMode === "week" ? getWeekCalendarDays() : getMonthCalendarDays();
    const weekCount = activityCalendarMode === "week" ? 1 : 6;
    const rowHeights = Array.from({ length: weekCount }, (_, weekIndex) => {
        const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
        const maxHeight = weekDays.reduce((height, date) => {
            const value = toInputFromDate(date);
            const dayTasks = tasks.filter(task => task.Date === value);
            const taskHeight = dayTasks.reduce((sum, task) => {
                const text = getActivityTaskDetails(task);
                const lines = Math.max(1, Math.ceil(text.length / 22) + (text.match(/\n/g) || []).length);
                return sum + 18 + (lines * 15);
            }, 0);
            return Math.max(height, 52 + taskHeight + Math.max(0, dayTasks.length - 1) * 5);
        }, activityCalendarMode === "week" ? 380 : 104);
        return `minmax(${Math.ceil(maxHeight)}px, auto)`;
    }).join(' ');

    return `--activity-week-rows: ${rowHeights};`;
}

function getMonthCalendarDays() {
    const first = new Date(activityMonthDate.getFullYear(), activityMonthDate.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = addDays(first, -mondayOffset);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function getWeekCalendarDays() {
    const selected = parseDateInput(activitySelectedDate);
    const mondayOffset = (selected.getDay() + 6) % 7;
    const start = addDays(selected, -mondayOffset);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function getTasksForDate(dateValue) {
    return getActivityTasksForProject().filter(task => task.Date === dateValue);
}

function getActivityTasksForProject() {
    const tasks = db["Task Calendar"] || [];
    if (activityFilterProject === "ALL") return tasks;
    return tasks.filter(task => task["Project Name"] === activityFilterProject);
}

function renderActivitySelectedTasks(tasks) {
    if (tasks.length === 0) return `<div class="activity-empty">No activities yet.</div>`;
    return tasks.map(task => `
        <article class="activity-list-item">
            <button type="button" class="activity-check" onclick="editActivityTask(${task.ID})" aria-label="Edit task"></button>
            <div>
                <strong>${escapeHTML(getActivityTaskDetails(task)).replace(/\n/g, '<br>')}</strong>
                <span class="activity-project-tag">${escapeHTML(task["Project Name"] || "No project assigned")}</span>
            </div>
            <div class="activity-list-actions">
                <button type="button" onclick="editActivityTask(${task.ID})">Edit</button>
                <button type="button" class="danger" onclick="deleteActivityTask(${task.ID})">Delete</button>
            </div>
        </article>
    `).join('');
}

function getActivityTaskDetails(task) {
    return task.Notes || task.Details || task.Description || task.Title || "";
}

function setActivityProjectFilter(projectName) {
    activityFilterProject = projectName || "ALL";
    activityEditingTaskId = null;
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function selectActivityDate(dateValue) {
    activitySelectedDate = dateValue;
    activityMonthDate = parseDateInput(dateValue);
    activityEditingTaskId = null;
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function setActivityCalendarMode(mode) {
    activityCalendarMode = mode;
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function moveActivityMonth(direction) {
    if (activityCalendarMode === "week") {
        const nextDate = addDays(parseDateInput(activitySelectedDate), direction * 7);
        activitySelectedDate = toInputFromDate(nextDate);
        activityMonthDate = nextDate;
    } else {
        activityMonthDate = new Date(activityMonthDate.getFullYear(), activityMonthDate.getMonth() + direction, 1);
    }
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function goToActivityToday() {
    activitySelectedDate = getTodayInputValue();
    activityMonthDate = parseDateInput(activitySelectedDate);
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function prepareActivityTaskNew() {
    activityEditingTaskId = null;
    if (currentViewName !== 'Task Calendar Activities') {
        showView('Task Calendar Activities');
        return;
    }
    const notes = document.getElementById('activityTaskNotes');
    if (notes) {
        hydrateActivityTaskForm();
        notes.focus();
    }
}

function hydrateActivityTaskForm() {
    const notes = document.getElementById('activityTaskNotes');
    if (!notes) return;
    const task = activityEditingTaskId !== null ? db["Task Calendar"].find(item => item.ID === activityEditingTaskId) : null;
    notes.value = task ? getActivityTaskDetails(task) : '';
}

function saveActivityTask(e) {
    e.preventDefault();
    const notes = document.getElementById('activityTaskNotes').value.trim();
    const projectName = activityFilterProject !== "ALL" ? activityFilterProject : "";
    if (!projectName) {
        showNotice("Select Project", "Please select a project at the top before adding a task.");
        return;
    }
    if (!notes) return;
    const title = notes.split(/\r?\n/).find(line => line.trim())?.trim().slice(0, 80) || "Task";

    if (activityEditingTaskId !== null) {
        const task = db["Task Calendar"].find(item => item.ID === activityEditingTaskId);
        if (task) {
            task["Project Name"] = projectName;
            task.Date = activitySelectedDate;
            task.Title = title;
            task.Notes = notes;
        }
    } else {
        const nextId = (db["Task Calendar"].reduce((max, task) => Math.max(max, Number(task.ID) || 0), 0) + 1);
        db["Task Calendar"].push({
            ID: nextId,
            "Project Name": projectName,
            Date: activitySelectedDate,
            Title: title,
            Notes: notes,
            Created: getSystemDateTime()
        });
    }

    activityEditingTaskId = null;
    if (activityFilterProject !== "ALL" && activityFilterProject !== projectName) activityFilterProject = projectName;
    save();
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function editActivityTask(id) {
    const task = db["Task Calendar"].find(item => item.ID === id);
    if (!task) return;
    activityEditingTaskId = id;
    activitySelectedDate = task.Date;
    activityMonthDate = parseDateInput(task.Date);
    if (task["Project Name"]) activityFilterProject = task["Project Name"];
    renderTaskCalendarActivities(document.getElementById('content-area'));
    document.getElementById('activityTaskNotes').focus();
}

function deleteActivityTask(id) {
    showConfirm("Delete Task", "Delete this task? This action cannot be undone.", () => {
        db["Task Calendar"] = db["Task Calendar"].filter(task => task.ID !== id);
        if (activityEditingTaskId === id) activityEditingTaskId = null;
        save();
        renderTaskCalendarActivities(document.getElementById('content-area'));
    });
}

function cancelActivityTaskEdit() {
    activityEditingTaskId = null;
    renderTaskCalendarActivities(document.getElementById('content-area'));
}

function normalizeImportHeader(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(cell);
            cell = "";
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i++;
            row.push(cell);
            if (row.some(value => String(value).trim())) rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += char;
        }
    }

    row.push(cell);
    if (row.some(value => String(value).trim())) rows.push(row);
    return rows;
}

function parseExcelXmlRows(text) {
    const doc = new DOMParser().parseFromString(text, "text/xml");
    if (doc.querySelector("parsererror")) return null;
    const rows = [...doc.getElementsByTagName("Row")];
    if (rows.length === 0) return null;
    return rows.map(row => [...row.getElementsByTagName("Cell")].map(cell => {
        const data = cell.getElementsByTagName("Data")[0];
        return data ? data.textContent : "";
    })).filter(row => row.some(value => String(value).trim()));
}

function parseHtmlTableRows(text) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    const rows = [...doc.querySelectorAll("tr")];
    if (rows.length === 0) return null;
    return rows.map(row => [...row.querySelectorAll("th,td")].map(cell => cell.innerText.trim()))
        .filter(row => row.some(value => String(value).trim()));
}

function parseImportDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const excelSerial = Number(raw);
    if (Number.isFinite(excelSerial) && excelSerial > 20000) {
        const date = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
        return toInputFromDate(date);
    }

    const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slash) {
        const date = new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
        return Number.isNaN(date.getTime()) ? "" : toInputFromDate(date);
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? "" : toInputFromDate(parsed);
}

function importTaskCalendarFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xlsx")) {
        showNotice("Import Excel", "Please save the worksheet as CSV or Excel 97-2003 .xls, then import it again.");
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const text = String(reader.result || '');
        const rows = lowerName.endsWith(".csv")
            ? parseCsvRows(text)
            : (parseExcelXmlRows(text) || parseHtmlTableRows(text));

        if (!rows || rows.length < 2) {
            showNotice("Import Failed", "Please import a CSV or Excel .xls file with headers and at least one task row.");
            input.value = "";
            return;
        }

        const headers = rows[0].map(normalizeImportHeader);
        const findIndex = (names) => names.map(normalizeImportHeader).map(name => headers.indexOf(name)).find(index => index >= 0);
        const projectIndex = findIndex(["Project Name", "Project"]);
        const dateIndex = findIndex(["Date", "Task Date", "Activity Date"]);
        const titleIndex = findIndex(["Title", "Task Title", "Task", "Activity", "Details"]);
        const notesIndex = findIndex(["Notes", "Description", "Details", "Remarks"]);

        if (projectIndex === undefined || dateIndex === undefined || titleIndex === undefined) {
            showNotice("Import Failed", "Required columns: Project Name, Date, and Title or Details.");
            input.value = "";
            return;
        }

        let imported = 0;
        rows.slice(1).forEach(row => {
            const projectName = String(row[projectIndex] || '').trim();
            const date = parseImportDate(row[dateIndex]);
            const title = String(row[titleIndex] || '').trim();
            const notes = notesIndex !== undefined && notesIndex !== titleIndex ? String(row[notesIndex] || '').trim() : "";
            if (!projectName || !date || !title) return;

            const nextId = (db["Task Calendar"].reduce((max, task) => Math.max(max, Number(task.ID) || 0), 0) + 1);
            db["Task Calendar"].push({
                ID: nextId,
                "Project Name": projectName,
                Date: date,
                Title: title,
                Notes: notes,
                Created: getSystemDateTime()
            });
            imported++;
        });

        save();
        input.value = "";
        renderTaskCalendarActivities(document.getElementById('content-area'));
        showNotice("Import Complete", `${imported} task${imported === 1 ? "" : "s"} imported to the task calendar.`);
    };
    reader.onerror = () => {
        showNotice("Import Failed", "The selected file could not be read.");
        input.value = "";
    };
    reader.readAsText(file);
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
        `<div class="table-container dashboard-details-table-wrap"><table class="dashboard-details-table"><thead><tr>${hdrs.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${list.map(r => `<tr onclick="selectDashboardDetailRow(this)">${hdrs.map(h => `<td>${formatCellValue(h, r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    document.getElementById('dashModalBody').innerHTML = html;
    document.getElementById('dashboardListModal').style.display = "block";
}

function selectDashboardDetailRow(row) {
    row.closest('tbody').querySelectorAll('tr').forEach(item => item.classList.remove('detail-row-selected'));
    row.classList.add('detail-row-selected');
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
    if (isLongTextField(header)) return value ? escapeHTML(value).replace(/\n/g, '<br>') : "-";
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
    const isTaskCalendarExport = currentViewName === 'Task Calendar Activities';
    const hdrs = isTaskCalendarExport ? ["Project Name", "Date", "Details"] : getHeaders(currentViewName);
    const rows = isTaskCalendarExport ? getActivityTasksForProject() : getViewData(currentViewName);
    const stamp = new Date().toISOString().slice(0, 10);
    const filenameBase = `${currentViewName.replace(/[^a-z0-9]+/gi, '_')}_${stamp}`;
    const exportValue = (row, header) => {
        if (header === "Password") return "";
        if (isTaskCalendarExport && header === "Details") return getActivityTaskDetails(row);
        if (isDateField(header)) return formatDateForDisplay(row[header]);
        return row[header] ?? "";
    };
    const escapeXml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/\r?\n/g, '&#10;');

    if (type === 'excel') {
        const columnWidth = (header) => {
            if (header.toLowerCase().includes("id")) return 95;
            if (header === "Project Name") return 150;
            if (isDateField(header)) return 115;
            if (isLongTextField(header)) return 280;
            return 145;
        };
        const columns = hdrs.map(h => `<Column ss:Width="${columnWidth(h)}"/>`).join('');
        const headerRow = `<Row ss:Height="28">${hdrs.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`;
        const dataRows = rows.map(row => (
            `<Row ss:AutoFitHeight="1">${hdrs.map(h => `<Cell ss:StyleID="${isLongTextField(h) ? 'WrapText' : 'Body'}"><Data ss:Type="String">${escapeXml(exportValue(row, h))}</Data></Cell>`).join('')}</Row>`
        )).join('');
        const worksheet = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/></Borders>
  </Style>
  <Style ss:ID="Body">
   <Alignment ss:Vertical="Top"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders>
  </Style>
  <Style ss:ID="WrapText">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(currentViewName).slice(0, 31)}">
  <Table>${columns}${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;
        downloadFile(`${filenameBase}.xls`, worksheet, 'application/vnd.ms-excel;charset=utf-8;');
        return;
    }

    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [
        hdrs.map(escapeCsv).join(','),
        ...rows.map(r => hdrs.map(h => escapeCsv(exportValue(r, h))).join(','))
    ].join('\n');
    downloadFile(`${filenameBase}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8;');
}

function openModal(view, idx = null) {
    if (view === "User Management" && !isAdmin()) {
        showNotice("Access Restricted", "Only admin users can manage users.");
        return;
    }
    const hdrs = getHeaders(view);
    const isEdit = idx !== null;
    const record = isEdit ? db[view][idx] : {};
    const idHeader = getIdHeader(view);
    document.getElementById('modalTitle').innerText = isEdit ? "Edit Record" : `New ${view}`;

    document.getElementById('formFields').innerHTML = hdrs.filter(h => h !== "Action").map(h => {
        let val = record[h] || '';
        if (!isEdit && h === 'Project Name' && view !== 'Project Enrollment' && currentFilterProject !== "ALL") {
            val = currentFilterProject;
        }

        // Auto-Increment ID
        if (h.toLowerCase().includes("id") && !isEdit) {
            const projectName = hasProjectSequence(view) ? (record["Project Name"] || (currentFilterProject !== "ALL" ? currentFilterProject : "")) : "";
            return `<div class="form-group"><label>${h}</label><input id="f-${h}" value="${getNextSequenceNumber(view, projectName)}" readonly style="background:var(--border); opacity:0.7;"></div>`;
        }

        // Relational Mapping
        if (view === 'User Management' && h === 'Role') return genDrop(h, ["Admin", "User"], val);
        if (view === 'User Management' && h === 'Status') return genDrop(h, ["Active", "Inactive"], val || "Active");
        if (h === 'Project Name' && view !== 'Project Enrollment') {
            const attrs = !isEdit && hasProjectSequence(view) ? `onchange="updateProjectSequenceField('${view}')"` : "";
            return genDrop(h, db["Project Enrollment"].map(p => p["Project Name"]), val, "Project", attrs);
        }
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

        if (isLongTextField(h)) {
            return `<div class="form-group"><label>${h}</label><textarea id="f-${h}" rows="4" required autocomplete="off">${escapeHTML(val)}</textarea></div>`;
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
        if (!isEdit && hasProjectSequence(view) && idHeader) {
            entry[idHeader] = getNextSequenceNumber(view, entry["Project Name"]);
        }
        if (view === 'User Management') {
            const duplicate = db["User Management"].some((u, i) => u.Username === entry.Username && i !== idx);
            if (duplicate) {
                showNotice("Duplicate Username", "Username already exists. Please use a different username.");
                return;
            }
        }
        if (!isEdit) db[view].push(entry); save(); closeModal(); showView(view);
    };
}

// --- 7. HELPERS ---
function genDrop(h, list, cur, ph, attrs = "") {
    let opts = `<option value="">--Select ${ph || h}--</option>` + list.map(i => `<option value="${i}" ${i === cur ? 'selected' : ''}>${i}</option>`).join('');
    return `<div class="form-group dropdown-group"><label>${h}</label><div class="select-shell"><select id="f-${h}" required ${attrs}>${opts}</select></div></div>`;
}

function getHeaders(v) {
    const m = {
        "Test Case": ["Test Case ID", "Project Name", "Details", "Status", "Date Tested", "Remarks", "QA"],
        "Parallel Testing Tracker": ["Parallel Testing ID", "Project Name", "Details", "Requested", "Date Reported", "Date Modified", "Remarks", "Status"],
        "Project Modification": ["Project Modification ID", "Project Name", "Details", "Requested", "Date Reported", "Date Modified", "Remarks", "Status"],
        "Project Tracker": ["Project ID", "Project Name", "Details", "Status", "Assignee", "Lacking Requirements", "Remarks"],
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
function showAppDialog({ title, message, confirmText = "OK", cancelText = "Cancel", mode = "notice", onConfirm = null }) {
    const modal = document.getElementById('appDialogModal');
    const titleEl = document.getElementById('appDialogTitle');
    const messageEl = document.getElementById('appDialogMessage');
    const iconEl = document.getElementById('appDialogIcon');
    const confirmBtn = document.getElementById('appDialogConfirm');
    const cancelBtn = document.getElementById('appDialogCancel');
    if (!modal || !titleEl || !messageEl || !iconEl || !confirmBtn || !cancelBtn) return;

    appDialogCallback = onConfirm;
    titleEl.innerText = title;
    messageEl.innerText = message;
    iconEl.innerText = mode === "confirm" ? "!" : "i";
    confirmBtn.innerText = confirmText;
    cancelBtn.innerText = cancelText;
    cancelBtn.style.display = mode === "confirm" ? "" : "none";
    confirmBtn.className = mode === "confirm" ? "btn-danger" : "btn-primary";
    modal.style.display = "block";
}

function closeAppDialog(confirmed) {
    const modal = document.getElementById('appDialogModal');
    if (modal) modal.style.display = "none";
    const callback = appDialogCallback;
    appDialogCallback = null;
    if (confirmed && callback) callback();
}

function showConfirm(title, message, onConfirm) {
    showAppDialog({ title, message, confirmText: "Delete", cancelText: "Cancel", mode: "confirm", onConfirm });
}

function showNotice(title, message) {
    showAppDialog({ title, message, confirmText: "OK", mode: "notice" });
}

function deleteItem(v, i) {
    showConfirm("Delete Record", "Delete this record? This action cannot be undone.", () => {
        db[v].splice(i, 1);
        save();
        showView(v);
    });
}
function editItem(v, i) { openModal(v, i); }

// Global Event Listeners
window.onclick = (e) => {
    if (!e.target.classList || !e.target.classList.contains('modal')) return;
    if (e.target.id === 'appDialogModal') {
        closeAppDialog(false);
        return;
    }
    closeModal();
    closeDashModal();
}
window.onload = () => { updateClock(); changeTheme(localStorage.getItem('jira_theme')); initAuth(); };
