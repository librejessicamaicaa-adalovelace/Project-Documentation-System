const STORAGE_KEY = "directory-management-records-v1";
const THEME_KEY = "directory-management-theme";
const LOGIN_ATTEMPTS_KEY = "login-attempts-v1";
const REMEMBER_ME_KEY = "remember-me-v1";
const AUTH_SESSION_KEY = "auth-session-v1";
const THEMES = ["maroonWhite", "maroonBlack", "blackWhite", "darkMode", "midnightSlate"];
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Project@2026";
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const CLOUD_DATA_ENDPOINT = "/api/data";
const CLOUD_SAVE_DELAY_MS = 800;
let cloudSyncReady = false;
let cloudSaveTimer = null;

const calendarTaskSeed = [];

const directoryViews = {
  modification: {
    label: "Project Modification",
    title: "Project Modification",
    idLabel: "Project Modification ID",
    generatedDateLabel: "Date Reported",
    generatedDateKey: "dateReported",
    fields: [
      { key: "projectName", label: "Project Name", placeholder: "Project name", required: true },
      { key: "details", label: "Details", placeholder: "Modification details", type: "textarea" },
      { key: "requested", label: "Requested", placeholder: "Requested by", required: true },
      { key: "dateModified", label: "Date Modified", type: "date" },
      { key: "remarks", label: "Remarks", placeholder: "Remarks", type: "textarea" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["To Do", "In Progress", "For Review", "Complete"],
        required: true
      },
      { key: "attachmentName", label: "Attachment", type: "file", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx", table: false }
    ],
    seed: []
  },
  userManagement: {
    label: "User Management",
    title: "User Management",
    idLabel: "User Management ID",
    generatedDateLabel: "Created Date",
    generatedDateKey: "createdDate",
    fields: [
      { key: "userName", label: "Username", placeholder: "Username", required: true },
      { key: "password", label: "Password", placeholder: "Password", type: "password", required: true, table: false },
      { key: "role", label: "Role", placeholder: "User role", required: true },
      { key: "department", label: "Department", placeholder: "Department", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Active", "Inactive", "Pending"],
        required: true
      },
      { key: "attachmentName", label: "Photo", type: "file", accept: "image/*", table: false }
    ],
    seed: []
  },
  assignee: {
    label: "Assignee",
    title: "Assignee Enrollment",
    idLabel: "Assignee ID",
    generatedDateLabel: "Enrollment Date",
    generatedDateKey: "enrollmentDate",
    fields: [
      { key: "employeeName", label: "Employee Name", placeholder: "Employee name", required: true },
      { key: "position", label: "Position", placeholder: "Position", required: true },
      { key: "projectName", label: "Project Name", placeholder: "Project name", required: true }
    ],
    seed: []
  },
  project: {
    label: "Project",
    title: "Project Enrollment",
    idLabel: "Project ID",
    generatedDateLabel: "Enrollment Date",
    generatedDateKey: "enrollmentDate",
    fields: [
      { key: "projectName", label: "Project Name", placeholder: "Project name", required: true },
      { key: "department", label: "Department", placeholder: "Department", required: true }
    ],
    seed: []
  },
  qa: {
    label: "QA",
    title: "QA Enrollment",
    idLabel: "QA ID",
    generatedDateLabel: "Enrollment Date",
    generatedDateKey: "enrollmentDate",
    fields: [
      { key: "employeeName", label: "Employee Name", placeholder: "Employee name", required: true },
      { key: "position", label: "Position", placeholder: "Position", required: true }
    ],
    seed: []
  },
  requestor: {
    label: "Requestor",
    title: "Requestor Enrollment",
    idLabel: "Requestor ID",
    generatedDateLabel: "Enrollment Date",
    generatedDateKey: "enrollmentDate",
    fields: [
      { key: "requestorName", label: "Requestor Name", placeholder: "Requestor name", required: true },
      { key: "department", label: "Department", placeholder: "Department", required: true },
      { key: "projectName", label: "Project Name", placeholder: "Project name", required: true }
    ],
    seed: []
  },
  testCases: {
    label: "Test Cases",
    title: "Test Case Management",
    idLabel: "Test Case ID",
    generatedDateLabel: "Date Tested",
    generatedDateKey: "dateTested",
    fields: [
      { key: "projectName", label: "Project Name", placeholder: "Select project", required: true },
      { key: "details", label: "Details", placeholder: "Test case details", type: "textarea", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["To Do", "In Progress", "For Review", "Complete"],
        required: true
      },
      { key: "remarks", label: "Remarks", placeholder: "Testing remarks", type: "textarea" },
      { key: "qa", label: "QA", placeholder: "Assigned QA", required: true },
      { key: "attachmentName", label: "Attachment", type: "file", accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx", table: false }
    ],
    seed: []
  }
};

const state = {
  isAuthenticated: false,
  activeView: "dashboard",
  editId: "",
  calendarEditId: "",
  pendingDeleteId: "",
  calendarDate: new Date(),
  calendarSelectedDate: new Date(),
  calendarMode: "month",
  calendarProject: "All",
  dashboardProject: "All",
  modificationProject: "All",
  data: loadData()
};

const elements = {
  appLayout: document.querySelector(".app-layout"),
  navButtons: document.querySelectorAll("[data-directory]"),
  pageTitle: document.querySelector("#pageTitle"),
  todayText: document.querySelector("#todayText"),
  clockText: document.querySelector("#clockText"),
  createBtn: document.querySelector("#createBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  loginBtn: document.querySelector("#loginBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  loginModal: document.querySelector("#loginModal"),
  loginForm: document.querySelector("#loginForm"),
  loginUsername: document.querySelector("#loginUsername"),
  loginPassword: document.querySelector("#loginPassword"),
  togglePassword: document.querySelector("#togglePassword"),
  rememberMe: document.querySelector("#rememberMe"),
  loginMessage: document.querySelector("#loginMessage"),
  loginLockMessage: document.querySelector("#loginLockMessage"),
  cancelLoginBtn: document.querySelector("#cancelLoginBtn"),
  deleteModal: document.querySelector("#deleteModal"),
  deleteRecordName: document.querySelector("#deleteRecordName"),
  cancelDeleteBtn: document.querySelector("#cancelDeleteBtn"),
  confirmDeleteBtn: document.querySelector("#confirmDeleteBtn"),
  dashboardPanel: document.querySelector("#dashboardPanel"),
  dashboardSubtitle: document.querySelector("#dashboardSubtitle"),
  dashboardTaskMonthLabel: document.querySelector("#dashboardTaskMonthLabel"),
  dashboardTaskMonthCount: document.querySelector("#dashboardTaskMonthCount"),
  dashboardMeetingDayCount: document.querySelector("#dashboardMeetingDayCount"),
  dashboardStatusCounts: document.querySelector("#dashboardStatusCounts"),
  dashboardMiniCalendar: document.querySelector("#dashboardMiniCalendar"),
  dashboardDonut: document.querySelector("#dashboardDonut"),
  dashboardDistributionTotal: document.querySelector("#dashboardDistributionTotal"),
  dashboardDistributionLegend: document.querySelector("#dashboardDistributionLegend"),
  dashboardRecentActivity: document.querySelector("#dashboardRecentActivity"),
  dashboardProjectHealth: document.querySelector("#dashboardProjectHealth"),
  dashboardProjectSelect: document.querySelector("#dashboardProjectSelect"),
  dashboardThemeSelect: document.querySelector("#dashboardThemeSelect"),
  dashboardDetailModal: document.querySelector("#dashboardDetailModal"),
  dashboardDetailTitle: document.querySelector("#dashboardDetailTitle"),
  dashboardDetailBody: document.querySelector("#dashboardDetailBody"),
  closeDashboardDetailBtn: document.querySelector("#closeDashboardDetailBtn"),
  attachmentPreviewModal: document.querySelector("#attachmentPreviewModal"),
  attachmentPreviewTitle: document.querySelector("#attachmentPreviewTitle"),
  attachmentPreviewImage: document.querySelector("#attachmentPreviewImage"),
  closeAttachmentPreviewBtn: document.querySelector("#closeAttachmentPreviewBtn"),
  calendarPanel: document.querySelector("#calendarPanel"),
  modificationFilterPanel: document.querySelector("#modificationFilterPanel"),
  modificationProjectFilter: document.querySelector("#modificationProjectFilter"),
  calendarProjectFilter: document.querySelector("#calendarProjectFilter"),
  calendarProjectText: document.querySelector("#calendarProjectText"),
  addCalendarTaskBtn: document.querySelector("#addCalendarTaskBtn"),
  calendarTaskForm: document.querySelector("#calendarTaskForm"),
  calendarTaskProject: document.querySelector("#calendarTaskProject"),
  calendarTaskTitle: document.querySelector("#calendarTaskTitle"),
  calendarTaskDate: document.querySelector("#calendarTaskDate"),
  cancelCalendarTaskBtn: document.querySelector("#cancelCalendarTaskBtn"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarTitle: document.querySelector("#calendarTitle"),
  selectedDateText: document.querySelector("#selectedDateText"),
  selectedActivityCount: document.querySelector("#selectedActivityCount"),
  selectedActivityList: document.querySelector("#selectedActivityList"),
  weekViewBtn: document.querySelector("#weekViewBtn"),
  monthViewBtn: document.querySelector("#monthViewBtn"),
  prevCalendarBtn: document.querySelector("#prevCalendarBtn"),
  nextCalendarBtn: document.querySelector("#nextCalendarBtn"),
  todayCalendarBtn: document.querySelector("#todayCalendarBtn"),
  recordFormPanel: document.querySelector("#recordFormPanel"),
  recordForm: document.querySelector("#recordForm"),
  formTitle: document.querySelector("#formTitle"),
  formFields: document.querySelector("#formFields"),
  editId: document.querySelector("#editId"),
  saveBtn: document.querySelector("#saveBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  tableHead: document.querySelector("#tableHead"),
  recordRows: document.querySelector("#recordRows")
};

function loadData() {
  const cloneRecords = records => JSON.parse(JSON.stringify(records));
  const createSeedData = () => {
    const data = Object.fromEntries(
      Object.keys(directoryViews).map(key => [key, cloneRecords(directoryViews[key].seed)])
    );
    data.calendarTasks = cloneRecords(calendarTaskSeed);
    return data;
  };

  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    return createSeedData();
  }
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const viewData = Object.fromEntries(
        Object.keys(directoryViews).map(key => [
          key,
          Array.isArray(parsed[key]) ? parsed[key] : cloneRecords(directoryViews[key].seed)
        ])
      );
      viewData.calendarTasks = Array.isArray(parsed.calendarTasks)
        ? parsed.calendarTasks
        : cloneRecords(calendarTaskSeed);
      return viewData;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return createSeedData();
}

function normalizeDataShape(input) {
  const cloneRecords = records => JSON.parse(JSON.stringify(records));
  const source = input && typeof input === "object" ? input : {};
  const data = Object.fromEntries(
    Object.keys(directoryViews).map(key => [
      key,
      Array.isArray(source[key]) ? source[key] : cloneRecords(directoryViews[key].seed)
    ])
  );
  data.calendarTasks = Array.isArray(source.calendarTasks)
    ? source.calendarTasks
    : cloneRecords(calendarTaskSeed);
  return data;
}

function saveLocalData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (error) {
    console.warn("Changes could not be saved in this browser session.", error);
  }
}

async function saveCloudData() {
  try {
    const response = await fetch(CLOUD_DATA_ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: state.data })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Cloud sync failed with status ${response.status}`);
    }
  } catch (error) {
    console.warn("Cloud sync is unavailable. Local changes are still saved.", error);
  }
}

function scheduleCloudSave() {
  if (!cloudSyncReady) return;
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(saveCloudData, CLOUD_SAVE_DELAY_MS);
}

function saveData() {
  saveLocalData();
  scheduleCloudSave();
}

async function hydrateCloudData() {
  try {
    const response = await fetch(CLOUD_DATA_ENDPOINT, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) throw new Error(`Cloud load failed with status ${response.status}`);

    const payload = await response.json();
    if (payload.data) {
      state.data = normalizeDataShape(payload.data);
      saveLocalData();
      render();
    } else {
      cloudSyncReady = true;
      await saveCloudData();
      return;
    }
  } catch (error) {
    console.warn("Cloud data is unavailable. Using local browser data.", error);
  }

  cloudSyncReady = true;
}

function updateClock() {
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric"
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  elements.todayText.textContent = `${formattedDate} / ${formattedTime}`;
  elements.clockText.textContent = "";
}

function enrollmentDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function idPrefix(viewKey) {
  return {
    modification: "PM",
    userManagement: "USR",
    assignee: "ASG",
    project: "PRJ",
    qa: "QA",
    requestor: "REQ",
    testCases: "TC"
  }[viewKey];
}

function nextId(viewKey) {
  const prefix = idPrefix(viewKey);
  const maxNumber = state.data[viewKey].reduce((max, record) => {
    const number = Number(String(record.id).replace(`${prefix}-`, ""));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);
  return `${prefix}-${String(maxNumber + 1).padStart(3, "0")}`;
}

function projectSequenceCode(projectName) {
  const project = state.data.project.find(record => record.projectName === projectName);
  const idNumber = Number(String(project?.id || "").replace("PRJ-", ""));
  if (!Number.isNaN(idNumber) && idNumber > 0) {
    return String(idNumber).padStart(3, "0");
  }

  const projectNames = [...new Set([
    ...state.data.project.map(record => record.projectName),
    ...state.data.modification.map(record => record.projectName)
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const fallbackIndex = projectNames.indexOf(projectName);
  return String(fallbackIndex + 1 || 1).padStart(3, "0");
}

function nextModificationId(projectName) {
  const projectCode = projectSequenceCode(projectName);
  const prefix = `PM-${projectCode}-`;
  const maxNumber = state.data.modification.reduce((max, record) => {
    if (record.projectName !== projectName || !String(record.id).startsWith(prefix)) return max;
    const number = Number(String(record.id).replace(prefix, ""));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);

  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

function nextTestCaseId(projectName) {
  const projectCode = projectSequenceCode(projectName);
  const prefix = `TC-${projectCode}-`;
  const maxNumber = state.data.testCases.reduce((max, record) => {
    if (record.projectName !== projectName || !String(record.id).startsWith(prefix)) return max;
    const number = Number(String(record.id).replace(prefix, ""));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);
  return `${prefix}${String(maxNumber + 1).padStart(3, "0")}`;
}

function visibleRecords(viewKey = state.activeView) {
  const records = state.data[viewKey] || [];
  if ((viewKey !== "modification" && viewKey !== "testCases") || state.modificationProject === "All") return records;
  return records.filter(record => record.projectName === state.modificationProject);
}

function projectOptions() {
  return [...new Set(
    state.data.project
      .map(record => String(record.projectName || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function updateDashboardProjectSelect() {
  const projects = projectOptions();
  const current = state.dashboardProject;

  elements.dashboardProjectSelect.innerHTML = '<option value="All">All Projects</option>';
  projects.forEach(projectName => {
    const option = document.createElement("option");
    option.value = projectName;
    option.textContent = projectName;
    elements.dashboardProjectSelect.append(option);
  });

  state.dashboardProject = projects.includes(current) ? current : "All";
  elements.dashboardProjectSelect.value = state.dashboardProject;
}

function updateModificationProjectFilter() {
  const projects = projectOptions();
  const current = state.modificationProject;

  elements.modificationProjectFilter.innerHTML = '<option value="All">All Project</option>';
  projects.forEach(projectName => {
    const option = document.createElement("option");
    option.value = projectName;
    option.textContent = projectName;
    elements.modificationProjectFilter.append(option);
  });

  state.modificationProject = projects.includes(current) ? current : "All";
  elements.modificationProjectFilter.value = state.modificationProject;
}

function syncModificationProjectField() {
  if ((state.activeView !== "modification" && state.activeView !== "testCases") || state.modificationProject === "All") return;

  const projectField = elements.formFields.querySelector('[name="projectName"]');
  if (!projectField) return;

  projectField.value = state.modificationProject;
}

function normalizeModificationIds() {
  const projectCounters = {};
  let changed = false;

  state.data.modification.forEach(record => {
    const projectCode = projectSequenceCode(record.projectName);
    const match = String(record.id || "").match(/^PM-(\d{3})-(\d{3})$/);
    if (match) {
      const sequence = Number(match[2]);
      projectCounters[projectCode] = Math.max(projectCounters[projectCode] || 0, sequence);
    }
  });

  state.data.modification = state.data.modification.map(record => {
    if (/^PM-\d{3}-\d{3}$/.test(String(record.id || ""))) return record;

    const projectCode = projectSequenceCode(record.projectName);
    projectCounters[projectCode] = (projectCounters[projectCode] || 0) + 1;
    changed = true;

    return {
      ...record,
      id: `PM-${projectCode}-${String(projectCounters[projectCode]).padStart(3, "0")}`
    };
  });

  return changed;
}

function normalizeTestCaseIds() {
  const projectCounters = {};
  let changed = false;

  state.data.testCases.forEach(record => {
    const projectCode = projectSequenceCode(record.projectName);
    const match = String(record.id || "").match(/^TC-(\d{3})-(\d{3})$/);
    if (match) {
      const sequence = Number(match[2]);
      projectCounters[projectCode] = Math.max(projectCounters[projectCode] || 0, sequence);
    }
  });

  state.data.testCases = state.data.testCases.map(record => {
    if (/^TC-\d{3}-\d{3}$/.test(String(record.id || ""))) return record;

    const projectCode = projectSequenceCode(record.projectName);
    projectCounters[projectCode] = (projectCounters[projectCode] || 0) + 1;
    changed = true;

    return {
      ...record,
      id: `TC-${projectCode}-${String(projectCounters[projectCode]).padStart(3, "0")}`
    };
  });

  return changed;
}

function isCalendarView() {
  return state.activeView === "calendar";
}

function applyTheme(theme) {
  const selectedTheme = THEMES.includes(theme) ? theme : "maroonWhite";
  document.body.dataset.theme = selectedTheme;
  elements.dashboardThemeSelect.value = selectedTheme;
  localStorage.setItem(THEME_KEY, selectedTheme);
}

function statusClass(value) {
  const status = String(value || "").trim().toLowerCase() === "done" ? "Complete" : value;
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "empty";
}

function normalizeStatusValues() {
  let changed = false;
  ["modification"].forEach(viewKey => {
    (state.data[viewKey] || []).forEach(record => {
      if (record.status !== "Done") return;
      record.status = "Complete";
      changed = true;
    });
  });
  return changed;
}

function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: dateKey(start),
    end: dateKey(end),
    label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  };
}

function recordsInMonth(records, key, date = new Date()) {
  const { start, end } = monthBounds(date);
  return records.filter(record => {
    const recordDate = parseDateKey(record[key]);
    return recordDate && recordDate >= start && recordDate <= end;
  });
}

function showLoginModal() {
  elements.loginForm.reset();
  elements.loginForm.classList.remove("has-error");
  elements.loginMessage.textContent = "";
  elements.loginLockMessage.textContent = "";
  elements.loginPassword.type = "password";
  elements.togglePassword?.classList.remove("password-visible");
  elements.togglePassword?.setAttribute("aria-label", "Show password");
  if (elements.togglePassword) elements.togglePassword.title = "Show password";
  elements.loginModal.classList.remove("hidden");
  elements.loginUsername.focus();
}

function hideLoginModal() {
  if (!state.isAuthenticated) return;
  elements.loginModal.classList.add("hidden");
}

function setAuthenticated(isAuthenticated) {
  state.isAuthenticated = isAuthenticated;
  elements.appLayout.classList.toggle("hidden", !state.isAuthenticated);
  elements.loginModal.classList.toggle("hidden", state.isAuthenticated);
  elements.loginBtn.classList.toggle("hidden", state.isAuthenticated);
  elements.logoutBtn.classList.toggle("hidden", !state.isAuthenticated);
  if (!state.isAuthenticated) {
    elements.loginForm.reset();
    elements.loginForm.classList.remove("has-error");
    elements.loginMessage.textContent = "";
    elements.loginLockMessage.textContent = "";
    elements.rememberMe.checked = false;
    elements.loginPassword.type = "password";
    elements.togglePassword?.classList.remove("password-visible");
    requestAnimationFrame(() => elements.loginUsername.focus());
  }
}

function recordDisplayName(record) {
  return [
    record?.id,
    record?.projectName,
    record?.userName,
    record?.employeeName,
    record?.requestorName
  ].filter(Boolean).join(" - ") || "Directory record";
}

function showDeleteModal(id) {
  const record = state.data[state.activeView].find(item => item.id === id);
  state.pendingDeleteId = id;
  elements.deleteRecordName.textContent = recordDisplayName(record);
  elements.deleteModal.classList.remove("hidden");
  elements.cancelDeleteBtn.focus();
}

function hideDeleteModal() {
  state.pendingDeleteId = "";
  elements.deleteModal.classList.add("hidden");
}

function hideDashboardDetailModal() {
  elements.dashboardDetailModal.classList.add("hidden");
}

function showAttachmentPreview(src, name = "Attachment Preview") {
  if (!src) return;
  elements.attachmentPreviewTitle.textContent = name || "Attachment Preview";
  elements.attachmentPreviewImage.src = src;
  elements.attachmentPreviewImage.alt = name || "Attachment preview";
  elements.attachmentPreviewModal.classList.remove("hidden");
}

function hideAttachmentPreview() {
  elements.attachmentPreviewModal.classList.add("hidden");
  elements.attachmentPreviewImage.removeAttribute("src");
  elements.attachmentPreviewImage.alt = "";
}

function isImageAttachment(record) {
  if (!record?.attachmentData) return false;

  const type = String(record.attachmentType || "").toLowerCase();
  const name = String(record.attachmentName || "").toLowerCase();

  return type.startsWith("image/") || /\.(avif|bmp|gif|jpe?g|jfif|png|webp|svg)$/i.test(name);
}

function detailDateLabel(value) {
  const key = parseDateKey(value);
  if (!key) return "-";
  return new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function detailColumns(type) {
  if (type === "modification") {
    return [
      { key: "id", label: "Project Modification ID", value: record => record.id },
      { key: "projectName", label: "Project Name", value: record => record.projectName },
      { key: "details", label: "Details", value: record => record.details },
      { key: "requested", label: "Requested", value: record => record.requested },
      { key: "dateReported", label: "Date Reported", value: record => record.dateReported },
      { key: "dateModified", label: "Date Modified", value: record => detailDateLabel(record.dateModified) },
      { key: "remarks", label: "Remarks", value: record => record.remarks },
      { key: "status", label: "Status", value: record => record.status }
    ];
  }
  
  if (type === "testCases") {
    return [
      { key: "id", label: "Test Case ID", value: record => record.id },
      { key: "projectName", label: "Project Name", value: record => record.projectName },
      { key: "details", label: "Details", value: record => record.details },
      { key: "status", label: "Status", value: record => record.status },
      { key: "dateTested", label: "Date Tested", value: record => record.dateTested },
      { key: "remarks", label: "Remarks", value: record => record.remarks },
      { key: "qa", label: "QA", value: record => record.qa }
    ];
  }

  if (type === "project") {
    return [
      { key: "id", label: "Project ID", value: record => record.id },
      { key: "projectName", label: "Project Name", value: record => record.projectName },
      { key: "department", label: "Department", value: record => record.department },
      { key: "enrollmentDate", label: "Enrollment Date", value: record => record.enrollmentDate }
    ];
  }

  return [
    { key: "id", label: "Task ID", value: record => record.id },
    { key: "projectName", label: "Project Name", value: record => record.projectName },
    { key: "details", label: "Details", value: record => record.title },
    { key: "date", label: "Date", value: record => detailDateLabel(record.date) }
  ];
}

function hasDetailValue(record, type) {
  if (type === "project") return Boolean(String(record.projectName || "").trim());
  const value = type === "modification" || type === "testCases" ? record.details : record.title;
  return Boolean(String(value || "").trim());
}

function showDashboardDetailModal(title, records, type = "task") {
  const detailRecords = Array.isArray(records) ? records : [];
  elements.dashboardDetailTitle.textContent = title;
  elements.dashboardDetailBody.innerHTML = "";

  if (!detailRecords.length) {
    const empty = document.createElement("p");
    empty.className = "detail-empty";
    empty.textContent = "No details found for this count.";
    elements.dashboardDetailBody.append(empty);
  } else {
    const columns = detailColumns(type);
    const tableWrap = document.createElement("div");
    const table = document.createElement("table");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    const body = document.createElement("tbody");

    tableWrap.className = "detail-table-wrap";
    table.className = "detail-table";

    columns.forEach(column => {
      const th = document.createElement("th");
      th.textContent = column.label;
      headRow.append(th);
    });
    head.append(headRow);

    detailRecords.forEach(record => {
      const row = document.createElement("tr");
      const status = record.status || "";
      row.className = `detail-row status-${statusClass(status)}`;

      if (hasDetailValue(record, type)) {
        row.tabIndex = 0;
        row.setAttribute("aria-selected", "false");
        row.title = "Select row to highlight details";
        row.addEventListener("click", () => {
          body.querySelectorAll(".selected-detail-row").forEach(selectedRow => {
            selectedRow.classList.remove("selected-detail-row");
            selectedRow.setAttribute("aria-selected", "false");
          });
          row.classList.add("selected-detail-row");
          row.setAttribute("aria-selected", "true");
        });
        row.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          row.click();
        });
      }

      columns.forEach(column => {
        const cell = document.createElement("td");
        const value = column.value(record) || "-";

        if (column.key === "details") {
          cell.className = "detail-text-cell";
          cell.classList.toggle("has-detail-value", value !== "-");
        }

        if (column.key === "status") {
          const badge = document.createElement("span");
          badge.className = `status-badge status-${statusClass(value)}`;
          badge.textContent = value;
          cell.append(badge);
        } else if (column.key === "details") {
          const detailValue = document.createElement("span");
          detailValue.className = "detail-value-highlight";
          detailValue.textContent = value;
          cell.append(detailValue);
        } else {
          cell.textContent = value;
        }

        row.append(cell);
      });
      body.append(row);
    });

    table.append(head, body);
    tableWrap.append(table);
    elements.dashboardDetailBody.append(tableWrap);
  }

  elements.dashboardDetailModal.classList.remove("hidden");
  elements.closeDashboardDetailBtn.focus();
}

function directoryLookupOptions(fieldKey, recordValue = "") {
  const lookupMap = {
    projectName: {
      viewKey: "project",
      valueKey: "projectName",
      placeholder: "Select project"
    },
    requested: {
      viewKey: "requestor",
      valueKey: "requestorName",
      placeholder: "Select requestor"
    },
    qa: {
      viewKey: "qa",
      valueKey: "employeeName",
      placeholder: "Select QA personnel"
    }
  };
  const lookup = (state.activeView === "modification" || state.activeView === "testCases") ? lookupMap[fieldKey] : null;
  if (!lookup) return null;

  const values = [...new Set(
    (state.data[lookup.viewKey] || [])
      .map(record => String(record[lookup.valueKey] || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
  const currentValue = String(recordValue || "").trim();

  if (currentValue && !values.includes(currentValue)) {
    values.unshift(currentValue);
  }

  return {
    placeholder: lookup.placeholder,
    values
  };
}

function showForm(record = null) {
  const view = directoryViews[state.activeView];
  state.editId = record?.id || "";
  elements.editId.value = state.editId;
  elements.formTitle.textContent = record ? `Edit ${view.label} Record` : `Create ${view.label} Record`;
  elements.saveBtn.textContent = record ? "Save Changes" : "Save Record";
  elements.formFields.innerHTML = "";

  view.fields.forEach(field => {
    const label = document.createElement("label");
    const span = document.createElement("span");
    const recordValue = record?.[field.key] || "";
    const lookupOptions = directoryLookupOptions(field.key, recordValue);
    let input;

    label.className = `form-field field-${field.key}`;

    span.textContent = field.label;
    if (lookupOptions) {
      input = document.createElement("select");

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = lookupOptions.values.length
        ? lookupOptions.placeholder
        : `No ${field.label.toLowerCase()} records yet`;
      placeholder.disabled = true;
      input.append(placeholder);

      lookupOptions.values.forEach(optionText => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        input.append(option);
      });
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
    } else if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach(optionText => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        input.append(option);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
    }

    input.name = field.key;
    if (field.type !== "file") input.value = recordValue;
    input.maxLength = field.type === "textarea" ? 1000 : 120;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.accept) input.accept = field.accept;
    input.required = Boolean(field.required);

    label.append(span, input);
    elements.formFields.append(label);
  });

  const dateNote = document.createElement("p");
  dateNote.className = "generated-date-note";
  dateNote.textContent = `${view.generatedDateLabel}: ${record?.[view.generatedDateKey] || enrollmentDate()} (system generated)`;
  elements.formFields.append(dateNote);

  if (record?.attachmentName) {
    const attachmentNote = document.createElement("div");
    attachmentNote.className = "current-attachment";
    if (record.attachmentData) {
      const link = document.createElement("a");
      link.href = record.attachmentData;
      link.target = "_blank";
      link.textContent = `View Current Attachment: ${record.attachmentName}`;
      attachmentNote.append(link);
    } else {
      attachmentNote.textContent = `Attachment: ${record.attachmentName}`;
    }
    elements.formFields.append(attachmentNote);
  }

  elements.recordFormPanel.classList.remove("hidden");
  if (!record) syncModificationProjectField();
  elements.formFields.querySelector("input")?.focus();
}

function hideForm() {
  state.editId = "";
  elements.recordForm.reset();
  elements.editId.value = "";
  elements.recordFormPanel.classList.add("hidden");
}

function switchView(viewKey) {
  state.activeView = viewKey;
  hideForm();
  render();
}

function deleteRecord(id) {
  showDeleteModal(id);
}

function confirmDeleteRecord() {
  if (!state.pendingDeleteId) return;

  state.data[state.activeView] = state.data[state.activeView]
    .filter(record => record.id !== state.pendingDeleteId);
  hideDeleteModal();
  saveData();
  render();
}

function editRecord(id) {
  const record = state.data[state.activeView].find(item => item.id === id);
  if (record) showForm(record);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function parseDateKey(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : dateKey(date);
}

function updateCalendarProjects() {
  const projects = projectOptions();
  const current = state.calendarProject;

  elements.calendarProjectFilter.innerHTML = '<option value="All">All Projects</option>';
  elements.calendarTaskProject.innerHTML = "";
  projects.forEach(projectName => {
    const option = document.createElement("option");
    option.value = projectName;
    option.textContent = projectName;
    elements.calendarProjectFilter.append(option);
    elements.calendarTaskProject.append(option.cloneNode(true));
  });

  if (!projects.length) {
    elements.calendarTaskProject.innerHTML = '<option value="" selected disabled>No project records yet</option>';
  }

  state.calendarProject = projects.includes(current) ? current : "All";
  elements.calendarProjectFilter.value = state.calendarProject;
  elements.calendarProjectText.textContent = "";
}

function showCalendarTaskForm(date = new Date()) {
  updateCalendarProjects();
  state.calendarEditId = "";
  elements.calendarTaskForm.reset();
  state.calendarSelectedDate = new Date(date);
  elements.calendarTaskDate.value = dateKey(date);
  elements.calendarTaskProject.value = state.calendarProject === "All"
    ? elements.calendarTaskProject.value
    : state.calendarProject;
  if (!elements.calendarTaskProject.value && elements.calendarTaskProject.options.length) {
    elements.calendarTaskProject.value = elements.calendarTaskProject.options[0].value;
  }
  elements.addCalendarTaskBtn.textContent = "Add task";
  elements.cancelCalendarTaskBtn.classList.add("hidden");
  elements.calendarTaskTitle.focus();
  renderSelectedDatePanel();
}

function hideCalendarTaskForm() {
  state.calendarEditId = "";
  elements.calendarTaskForm.reset();
  elements.calendarTaskDate.value = dateKey(state.calendarSelectedDate);
  if (!elements.calendarTaskProject.value && elements.calendarTaskProject.options.length) {
    elements.calendarTaskProject.value = elements.calendarTaskProject.options[0].value;
  }
  elements.addCalendarTaskBtn.textContent = "Add task";
  elements.cancelCalendarTaskBtn.classList.add("hidden");
}

function nextCalendarTaskId() {
  const maxNumber = state.data.calendarTasks.reduce((max, task) => {
    const number = Number(String(task.id).replace("CAL-", ""));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);
  return `CAL-${String(maxNumber + 1).padStart(3, "0")}`;
}

function saveCalendarTask(event) {
  event.preventDefault();
  const projectName = elements.calendarTaskProject.value;
  const title = elements.calendarTaskTitle.value.trim();
  const date = elements.calendarTaskDate.value;

  if (!projectName || !title || !date) return;

  if (state.calendarEditId) {
    state.data.calendarTasks = state.data.calendarTasks.map(task =>
      task.id === state.calendarEditId
        ? {
          ...task,
          projectName,
          title,
          date
        }
        : task
    );
  } else {
    state.data.calendarTasks.unshift({
      id: nextCalendarTaskId(),
      projectName,
      title,
      date
    });
  }

  state.calendarDate = new Date(`${date}T00:00:00`);
  state.calendarSelectedDate = new Date(`${date}T00:00:00`);
  saveData();
  hideCalendarTaskForm();
  renderCalendar();
}

function editCalendarTask(id) {
  const task = state.data.calendarTasks.find(record => record.id === id);
  if (!task) return;
  const taskDate = parseDateKey(task.date) || dateKey(new Date());

  updateCalendarProjects();
  state.calendarEditId = id;
  state.calendarSelectedDate = new Date(`${taskDate}T00:00:00`);
  state.calendarDate = new Date(state.calendarSelectedDate);
  elements.calendarTaskProject.value = task.projectName;
  elements.calendarTaskDate.value = taskDate;
  elements.calendarTaskTitle.value = task.title || "";
  elements.addCalendarTaskBtn.textContent = "Save task";
  elements.cancelCalendarTaskBtn.classList.remove("hidden");
  renderCalendar();
  elements.calendarTaskTitle.focus();
}

function editCalendarActivity(activity) {
  if (activity.source === "Calendar Task") {
    editCalendarTask(activity.id);
    return;
  }

  if (activity.source !== "Modification") return;

  const record = state.data.modification.find(item => item.id === activity.id);
  if (!record) return;

  state.activeView = "modification";
  state.modificationProject = "All";
  render({ keepFormOpen: true });
  showForm(record);
}

function deleteCalendarTask(id) {
  const task = state.data.calendarTasks.find(record => record.id === id);
  if (!task) return;

  const shouldDelete = window.confirm(`Delete "${task.title || "this task"}"?`);
  if (!shouldDelete) return;

  state.data.calendarTasks = state.data.calendarTasks.filter(record => record.id !== id);
  if (state.calendarEditId === id) hideCalendarTaskForm();
  saveData();
  renderCalendar();
}

function deleteCalendarActivity(activity) {
  if (activity.source === "Calendar Task") {
    deleteCalendarTask(activity.id);
    return;
  }

  if (activity.source !== "Modification") return;

  const record = state.data.modification.find(item => item.id === activity.id);
  if (!record) return;

  const shouldDelete = window.confirm(`Delete "${record.details || record.projectName || "this activity"}"?`);
  if (!shouldDelete) return;

  state.data.modification = state.data.modification.filter(item => item.id !== activity.id);
  if (state.editId === activity.id && state.activeView === "modification") hideForm();
  saveData();
  renderCalendar();
}

function setActionButtonContent(button, icon, label) {
  const iconEl = document.createElement("span");

  iconEl.className = "btn-symbol";
  iconEl.setAttribute("aria-hidden", "true");
  iconEl.textContent = icon;
  button.replaceChildren(iconEl);
  button.setAttribute("aria-label", label);
  button.title = label;
}

function calendarActivities(projectName = state.calendarProject) {
  const parseIdNumber = id => Number(String(id).replace(/^[A-Z]+-/, "")) || 0;
  const priority = source => (source === "Calendar Task" ? 0 : 1);

  const modificationActivities = state.data.modification
    .filter(record => projectName === "All" || record.projectName === projectName)
    .map(record => ({
      id: record.id,
      projectName: record.projectName,
      title: record.details || record.remarks || record.projectName,
      status: record.status,
      source: "Modification",
      editable: true,
      date: parseDateKey(record.dateModified)
    }))
    .filter(activity => activity.date);
  const calendarTasks = state.data.calendarTasks
    .filter(record => projectName === "All" || record.projectName === projectName)
    .map(record => ({
      id: record.id,
      projectName: record.projectName,
      title: record.title,
      source: "Calendar Task",
      editable: true,
      date: parseDateKey(record.date)
    }))
    .filter(activity => activity.date);

  return [...modificationActivities, ...calendarTasks].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const sourceDiff = priority(a.source) - priority(b.source);
    if (sourceDiff !== 0) return sourceDiff;
    return parseIdNumber(b.id) - parseIdNumber(a.id);
  });
}

function weekStart(date) {
  const start = new Date(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function calendarRange() {
  const base = new Date(state.calendarDate);
  if (state.calendarMode === "week") {
    return { start: weekStart(base), days: 7 };
  }

  const firstOfMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = weekStart(firstOfMonth);
  return { start, days: 42 };
}

function renderCalendar() {
  updateCalendarProjects();

  const monthLabel = state.calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
  const activities = calendarActivities();
  const activityMap = activities.reduce((map, activity) => {
    map[activity.date] = map[activity.date] || [];
    map[activity.date].push(activity);
    return map;
  }, {});
  const today = dateKey(new Date());
  const currentMonth = state.calendarDate.getMonth();
  const { start, days } = calendarRange();

  elements.calendarTitle.textContent = state.calendarMode === "week"
    ? `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : monthLabel;
  elements.weekViewBtn.classList.toggle("primary", state.calendarMode === "week");
  elements.weekViewBtn.classList.toggle("secondary", state.calendarMode !== "week");
  elements.monthViewBtn.classList.toggle("primary", state.calendarMode === "month");
  elements.monthViewBtn.classList.toggle("secondary", state.calendarMode !== "month");

  elements.calendarGrid.innerHTML = "";
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach(dayName => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-name";
    dayHeader.textContent = dayName;
    elements.calendarGrid.append(dayHeader);
  });

  for (let index = 0; index < days; index += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + index);
    const key = dateKey(cellDate);
    const dayActivities = activityMap[key] || [];
    const cell = document.createElement("div");
    const dateNumber = document.createElement("strong");

    cell.className = "calendar-day";
    cell.classList.toggle("outside-month", state.calendarMode === "month" && cellDate.getMonth() !== currentMonth);
    cell.classList.toggle("today", key === today);
    cell.classList.toggle("selected", key === dateKey(state.calendarSelectedDate));
    cell.addEventListener("click", () => {
      state.calendarSelectedDate = new Date(cellDate);
      elements.calendarTaskDate.value = key;
      renderCalendar();
    });
    dateNumber.textContent = cellDate.getDate();
    cell.append(dateNumber);

    dayActivities.slice(0, 3).forEach(activity => {
      const chip = document.createElement(activity.editable ? "button" : "span");
      chip.className = "calendar-activity";
      chip.title = `${activity.source}: ${activity.projectName}`;
      chip.textContent = activity.title || activity.projectName;

      if (activity.editable) {
        chip.type = "button";
        chip.classList.add("is-editable");
        chip.setAttribute("aria-label", `Edit ${activity.title}`);
        chip.addEventListener("click", event => {
          event.stopPropagation();
          editCalendarActivity(activity);
        });
      }

      cell.append(chip);
    });

    if (dayActivities.length > 3) {
      const extra = document.createElement("span");
      extra.className = "calendar-more";
      extra.textContent = `+${dayActivities.length - 3} more`;
      cell.append(extra);
    }

    elements.calendarGrid.append(cell);
  }

  renderSelectedDatePanel();
}

function renderSelectedDatePanel() {
  const selectedKey = dateKey(state.calendarSelectedDate);
  const activities = calendarActivities().filter(activity => activity.date === selectedKey);

  elements.selectedDateText.textContent = state.calendarSelectedDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
  elements.selectedActivityCount.textContent = `${activities.length} Activit${activities.length === 1 ? "y" : "ies"}`;
  elements.calendarTaskDate.value = selectedKey;
  if (state.calendarProject !== "All") {
    elements.calendarTaskProject.value = state.calendarProject;
  }
  if (!elements.calendarTaskProject.value && elements.calendarTaskProject.options.length) {
    elements.calendarTaskProject.value = elements.calendarTaskProject.options[0].value;
  }
  elements.selectedActivityList.innerHTML = "";

  if (!activities.length) {
    const empty = document.createElement("p");
    empty.textContent = "No activities yet.";
    elements.selectedActivityList.append(empty);
    return;
  }

  activities.forEach(activity => {
    const item = document.createElement("article");
    const content = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");

    item.className = "selected-activity-item";
    content.className = "selected-activity-content";
    title.textContent = activity.title;
    meta.textContent = activity.projectName;

    content.append(title, meta);
    item.append(content);

    if (activity.editable) {
      const actions = document.createElement("div");
      const editBtn = document.createElement("button");
      const deleteBtn = document.createElement("button");

      item.classList.add("is-editable");
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Edit ${activity.title}`);
      item.addEventListener("click", () => editCalendarActivity(activity));
      item.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          editCalendarActivity(activity);
        }
      });

      actions.className = "selected-activity-actions";
      editBtn.type = "button";
      editBtn.className = "secondary";
      setActionButtonContent(editBtn, "✎", "Edit");
      editBtn.addEventListener("click", event => {
        event.stopPropagation();
        editCalendarActivity(activity);
      });
      editBtn.querySelector(".btn-symbol").textContent = "E";

      deleteBtn.type = "button";
      deleteBtn.className = "danger";
      setActionButtonContent(deleteBtn, "×", "Delete");
      deleteBtn.addEventListener("click", event => {
        event.stopPropagation();
        deleteCalendarActivity(activity);
      });
      deleteBtn.querySelector(".btn-symbol").textContent = "X";

      actions.append(editBtn);
      actions.append(deleteBtn);
      item.append(actions);
    }

    elements.selectedActivityList.append(item);
  });
}

function fileToAttachment(file) {
  return new Promise((resolve, reject) => {
    if (!file?.name) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve({
      attachmentName: file.name,
      attachmentType: file.type,
      attachmentData: reader.result
    });
    reader.onerror = () => reject(new Error("Attachment could not be read."));
    reader.readAsDataURL(file);
  });
}

async function handleSave(event) {
  event.preventDefault();
  const view = directoryViews[state.activeView];
  const formData = new FormData(elements.recordForm);
  const payload = {};
  const attachmentFile = formData.get("attachmentName");

  view.fields.forEach(field => {
    if (field.type === "file") return;
    payload[field.key] = String(formData.get(field.key) || "").trim();
  });

  try {
    const attachment = await fileToAttachment(attachmentFile);
    if (attachment) Object.assign(payload, attachment);
  } catch (error) {
    window.alert(error.message);
    return;
  }

  if (view.fields.some(field => field.required && !payload[field.key])) return;

  if (state.editId) {
    state.data[state.activeView] = state.data[state.activeView].map(record => {
      if (record.id !== state.editId) return record;
      
      let newId = record.id;
      if (record.projectName !== payload.projectName) {
        if (state.activeView === "modification") newId = nextModificationId(payload.projectName);
        if (state.activeView === "testCases") newId = nextTestCaseId(payload.projectName);
      }

      return { ...record, ...payload, id: newId };
    });
  } else {
    let id;
    if (state.activeView === "modification") id = nextModificationId(payload.projectName);
    else if (state.activeView === "testCases") id = nextTestCaseId(payload.projectName);
    else id = nextId(state.activeView);

    state.data[state.activeView].unshift({
      id,
      ...payload,
      [view.generatedDateKey]: enrollmentDate()
    });
  }

  saveData();
  hideForm();
  render();
}

function renderTableHeader(view) {
  elements.tableHead.innerHTML = "";
  const row = document.createElement("tr");
  const tableFields = view.fields.filter(field => field.table !== false);
  const hasAttachments = view.fields.some(f => f.type === "file");
  const columns = [view.idLabel, ...tableFields.map(field => field.label), view.generatedDateLabel];
  if (hasAttachments) columns.push("Attachment");
  columns.push("Action");

  columns.forEach(column => {
    const th = document.createElement("th");
    th.textContent = column;
    row.append(th);
  });

  elements.tableHead.append(row);
}

function renderDashboardMiniCalendar(baseDate, activities) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstOfMonth.getDay();
  const activityCounts = activities.reduce((counts, activity) => {
    counts[activity.date] = (counts[activity.date] || 0) + 1;
    return counts;
  }, {});

  elements.dashboardMiniCalendar.innerHTML = "";

  const monthTitle = document.createElement("strong");
  const grid = document.createElement("div");
  monthTitle.className = "mini-calendar-title";
  monthTitle.textContent = baseDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  grid.className = "mini-calendar-grid";

  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
    const cell = document.createElement("span");
    cell.className = "mini-calendar-day-name";
    cell.textContent = day;
    grid.append(cell);
  });

  for (let index = 0; index < startOffset; index += 1) {
    const blank = document.createElement("span");
    blank.className = "mini-calendar-empty";
    grid.append(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(year, month, day);
    const key = dateKey(cellDate);
    const count = activityCounts[key] || 0;
    const cell = document.createElement("button");

    cell.type = "button";
    cell.className = "mini-calendar-day";
    cell.classList.toggle("today", key === dateKey(new Date()));
    cell.classList.toggle("has-activity", count > 0);
    cell.textContent = day;
    cell.title = count ? `${count} activit${count === 1 ? "y" : "ies"}` : "No activity";
    cell.addEventListener("click", () => {
      state.activeView = "calendar";
      state.calendarDate = cellDate;
      state.calendarSelectedDate = cellDate;
      render();
    });
    grid.append(cell);
  }

  elements.dashboardMiniCalendar.append(monthTitle, grid);
}

function renderDashboardDistribution(statusRows) {
  const total = statusRows.reduce((sum, row) => sum + row.count, 0);
  let filled = 0;
  const segments = statusRows.filter(row => row.count > 0).map(row => {
    const start = filled;
    const end = total ? filled + (row.count / total) * 100 : filled;
    filled = end;
    // Adding a small gap between segments for a more professional look
    const gap = total > 0 ? 0.8 : 0;
    return `var(--status-${statusClass(row.status)}, var(--primary)) ${start}% ${end - (row.count > 0 ? gap : 0)}%, transparent ${end - gap}% ${end}%`;
  });

  elements.dashboardDistributionTotal.textContent = total;
  elements.dashboardDonut.style.background = total
    ? `conic-gradient(${segments.join(", ")})`
    : "var(--surface-soft)";
  elements.dashboardDistributionLegend.innerHTML = "";

  statusRows.forEach(row => {
    const percent = total ? Math.round((row.count / total) * 100) : 0;
    const item = document.createElement("div");
    item.className = `dashboard-legend-item status-${statusClass(row.status)}`;
    item.innerHTML = `<span></span><strong>${row.status}</strong><em>${row.count} (${percent}%)</em>`;
    elements.dashboardDistributionLegend.append(item);
  });
}

function renderDashboardRecentActivity(modificationRecords, calendarTaskRecords) {
  const modificationItems = modificationRecords.map(record => ({
    title: record.status === "Complete" ? "Task completed" : "Project updated",
    detail: record.projectName,
    date: parseDateKey(record.dateModified || record.dateReported),
    className: `status-${statusClass(record.status)}`
  }));
  const taskItems = calendarTaskRecords.map(record => ({
    title: "New task created",
    detail: record.title || record.projectName,
    date: parseDateKey(record.date),
    className: "status-in-progress"
  }));

  elements.dashboardRecentActivity.innerHTML = "";
  [...modificationItems, ...taskItems]
    .filter(item => item.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .forEach(item => {
      const row = document.createElement("div");
      row.className = `recent-activity-item ${item.className}`;
      row.innerHTML = `
        <span class="recent-activity-icon" aria-hidden="true"></span>
        <div>
          <strong>${item.title}</strong>
          <small>${item.detail}</small>
        </div>
        <time>${detailDateLabel(item.date)}</time>
      `;
      elements.dashboardRecentActivity.append(row);
    });

  if (!elements.dashboardRecentActivity.children.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-note";
    empty.textContent = "No recent activity yet.";
    elements.dashboardRecentActivity.append(empty);
  }
}

function recordsInNextDays(records, key, baseDate = new Date(), days = 7) {
  const start = dateKey(baseDate);
  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + days);
  const end = dateKey(endDate);

  return records.filter(record => {
    const recordDate = parseDateKey(record[key]);
    return recordDate && recordDate >= start && recordDate <= end;
  });
}

function projectHealthRows(projectNames, modificationRecords, calendarTaskRecords) {
  const names = projectNames.length
    ? projectNames
    : [...new Set([
      ...modificationRecords.map(record => record.projectName),
      ...calendarTaskRecords.map(record => record.projectName)
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

  return names.map(projectName => {
    const modifications = modificationRecords.filter(record => record.projectName === projectName);
    const tasks = calendarTaskRecords.filter(record => record.projectName === projectName);
    const complete = modifications.filter(record => record.status === "Complete").length;
    const review = modifications.filter(record => record.status === "For Review").length;
    const open = modifications.filter(record => record.status !== "Complete").length;
    const completion = modifications.length ? Math.round((complete / modifications.length) * 100) : 0;
    const label = open > 3 ? "Needs Focus" : review > 0 ? "In Review" : completion === 100 && modifications.length ? "On Track" : "Active";

    return {
      projectName,
      completion,
      open,
      review,
      tasks: tasks.length,
      label
    };
  }).sort((a, b) => b.open - a.open || b.tasks - a.tasks || a.projectName.localeCompare(b.projectName));
}

function renderDashboardProjectHealth(rows) {
  elements.dashboardProjectHealth.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "dashboard-empty-note";
    empty.textContent = "No project health data yet.";
    elements.dashboardProjectHealth.append(empty);
    return;
  }

  rows.slice(0, 6).forEach(row => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "dashboard-health-item";
    item.addEventListener("click", () => {
      const records = state.data.modification.filter(record => record.projectName === row.projectName);
      showDashboardDetailModal(`${row.projectName} Modifications`, records, "modification");
    });
    item.innerHTML = `
      <span class="health-title">
        <strong>${escapeHtml(row.projectName)}</strong>
        <em>${escapeHtml(row.label)}</em>
      </span>
      <span class="health-meter" aria-hidden="true"><i style="width: ${row.completion}%"></i></span>
      <span class="health-meta">
        <small>${row.completion}% complete</small>
        <small>${row.open} open</small>
        <small>${row.tasks} tasks</small>
      </span>
    `;
    elements.dashboardProjectHealth.append(item);
  });
}

function renderDashboard() {
  updateDashboardProjectSelect();
  const today = new Date();
  const month = monthBounds(today);
  const selectedProject = state.dashboardProject;
  const projectMatches = record => selectedProject === "All" || record.projectName === selectedProject;
  const dashboardCalendarTasks = state.data.calendarTasks.filter(projectMatches);
  const dashboardModifications = state.data.modification.filter(projectMatches);
  const dashboardProjectNames = projectOptions().filter(projectName => selectedProject === "All" || projectName === selectedProject);
  const monthlyTasks = recordsInMonth(dashboardCalendarTasks, "date", today);
  const todayKey = dateKey(today);
  const dailyCounts = monthlyTasks.reduce((counts, task) => {
    const taskDate = parseDateKey(task.date);
    counts[taskDate] = (counts[taskDate] || 0) + 1;
    return counts;
  }, {});
  const todayMeetings = dailyCounts[todayKey] || 0;

  elements.pageTitle.textContent = "Dashboard";
  elements.dashboardSubtitle.textContent = selectedProject === "All"
    ? "Portfolio snapshot across all enrolled projects."
    : `Focused snapshot for ${selectedProject}.`;
  elements.dashboardTaskMonthLabel.textContent = month.label;
  elements.dashboardTaskMonthCount.textContent = monthlyTasks.length;
  elements.dashboardMeetingDayCount.textContent = todayMeetings;

  document.querySelector('[data-dashboard-detail="monthlyTasks"]').onclick = () => {
    showDashboardDetailModal(`Tasks for ${month.label}`, monthlyTasks, "task");
  };
  document.querySelector('[data-dashboard-detail="todayMeetings"]').onclick = () => {
    const todayTasks = monthlyTasks.filter(task => parseDateKey(task.date) === todayKey);
    showDashboardDetailModal(`Meetings for ${detailDateLabel(todayKey)}`, todayTasks, "task");
  };

  const renderStatusCards = (viewKey, container) => {
    const statusOptions = directoryViews[viewKey].fields.find(f => f.key === "status")?.options || [];
    const sourceRecords = viewKey === "modification" ? dashboardModifications : state.data[viewKey].filter(projectMatches);
    container.innerHTML = "";
    statusOptions.forEach(status => {
      const statusRecords = sourceRecords.filter(record => record.status === status);
      const card = document.createElement("button");
      const icon = document.createElement("span");
      const labelWrap = document.createElement("span");
      const label = document.createElement("span");
      const value = document.createElement("strong");

      card.type = "button";
      card.className = `dashboard-card status-${statusClass(status)}`;
      icon.className = "status-icon";
      icon.setAttribute("aria-hidden", "true");
      labelWrap.className = "dashboard-card-label";
      label.textContent = status;
      value.textContent = statusRecords.length;
      card.addEventListener("click", () => {
        showDashboardDetailModal(`${status} ${directoryViews[viewKey].label}`, statusRecords, viewKey);
      });

      labelWrap.append(icon, label);
      card.append(labelWrap, value);
      container.append(card);
    });
  };

  renderStatusCards("modification", elements.dashboardStatusCounts);

  const statusOptions = directoryViews.modification.fields.find(f => f.key === "status")?.options || [];

  const statusDistribution = statusOptions.map(status => ({
    status,
    count: dashboardModifications.filter(record => record.status === status).length
  }));

  renderDashboardMiniCalendar(today, calendarActivities(selectedProject));
  renderDashboardDistribution(statusDistribution);
  renderDashboardRecentActivity(dashboardModifications, dashboardCalendarTasks);
  renderDashboardProjectHealth(projectHealthRows(dashboardProjectNames, dashboardModifications, dashboardCalendarTasks));
}

function render(options = {}) {
  document.body.dataset.view = state.activeView;
  document.body.classList.toggle("calendar-view", isCalendarView());
  elements.navButtons.forEach(button => {
    const isActive = button.dataset.directory === state.activeView;
    button.classList.toggle("active", isActive);
    button.toggleAttribute("aria-current", isActive);
  });
  elements.dashboardPanel.classList.toggle("hidden", state.activeView !== "dashboard");
  elements.calendarPanel.classList.toggle("hidden", !isCalendarView());
  elements.modificationFilterPanel.classList.toggle("hidden", state.activeView !== "modification" && state.activeView !== "testCases");
  if (!options.keepFormOpen) {
    elements.recordFormPanel.classList.add("hidden");
  }
  document.querySelector(".records-panel").classList.toggle("hidden", isCalendarView() || state.activeView === "dashboard");
  elements.createBtn.classList.toggle("hidden", isCalendarView() || state.activeView === "dashboard");
  elements.exportBtn.classList.toggle("hidden", isCalendarView() || state.activeView === "dashboard");

  if (state.activeView === "dashboard") {
    renderDashboard();
    return;
  }

  if (isCalendarView()) {
    elements.pageTitle.textContent = "Task Calendar Activities";
    renderCalendar();
    return;
  }

  const view = directoryViews[state.activeView];
  const hasAttachments = view.fields.some(f => f.type === "file");
  if (state.activeView === "modification") {
    updateModificationProjectFilter();
  }
  const tableFields = view.fields.filter(field => field.table !== false);
  const records = visibleRecords(state.activeView);

  elements.pageTitle.textContent = view.title;
  renderTableHeader(view);
  elements.recordRows.innerHTML = "";

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    const staticCols = hasAttachments ? 4 : 3;
    cell.colSpan = tableFields.length + staticCols;
    cell.className = "empty-cell";
    cell.textContent = "No records found.";
    row.append(cell);
    elements.recordRows.append(row);
    return;
  }

  records.forEach(record => {
    const row = document.createElement("tr");
    const values = [record.id, ...tableFields.map(field => record[field.key]), record[view.generatedDateKey]];

    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value || "-";
      const field = tableFields[index - 1];
      if (field?.key === "status") {
        cell.textContent = "";
        const badge = document.createElement("span");
        badge.className = `status-badge status-${statusClass(value)}`;
        badge.textContent = value || "-";
        cell.append(badge);
      }
      row.append(cell);
    });

    if (hasAttachments) {
      // Dedicated Attachment Column
      const attachmentCell = document.createElement("td");
      const isImage = isImageAttachment(record);

      if (isImage) {
        const link = document.createElement("a");
        const image = document.createElement("img");

        link.className = "attachment-preview-link";
        link.href = "#";
        link.title = record.attachmentName;
        link.addEventListener("click", event => {
          event.preventDefault();
          showAttachmentPreview(record.attachmentData, record.attachmentName);
        });

        image.className = "attachment-preview";
        image.src = record.attachmentData;
        image.alt = record.attachmentName;

        link.append(image);
        attachmentCell.append(link);
      } else {
        const attachment = record.attachmentData
          ? document.createElement("a")
          : document.createElement("span");
        attachment.className = record.attachmentData ? "attachment-link" : "attachment-empty";
        attachment.textContent = record.attachmentName
          ? record.attachmentName
          : "No attachment";
        if (record.attachmentData) {
          attachment.href = record.attachmentData;
          attachment.target = "_blank";
        }
        attachmentCell.append(attachment);
      }
      row.append(attachmentCell);
    }

    const actionCell = document.createElement("td");
    actionCell.className = "action-cell";

    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.type = "button";
    setActionButtonContent(editBtn, "✎", "Edit");
    editBtn.addEventListener("click", () => editRecord(record.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "danger";
    deleteBtn.type = "button";
    setActionButtonContent(deleteBtn, "×", "Delete");
    deleteBtn.addEventListener("click", () => deleteRecord(record.id));

    actionCell.append(editBtn, deleteBtn);
    row.append(actionCell);
    elements.recordRows.append(row);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadFile(dataUrl, fileName) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

function exportRecords() {
  const view = directoryViews[state.activeView];
  const tableFields = view.fields.filter(field => field.table !== false);
  const hasAttachments = view.fields.some(f => f.type === "file");
  const headers = [view.idLabel, ...tableFields.map(field => field.label), view.generatedDateLabel];
  if (hasAttachments) headers.push("Attachment");
  const records = visibleRecords(state.activeView);
  const rows = records.map(record => {
    const isImage = isImageAttachment(record);
    const attachmentCell = isImage
      ? `<img src="${record.attachmentData}" alt="${escapeHtml(record.attachmentName)}" width="100" style="display:block; margin:auto;">`
      : escapeHtml(record.attachmentName || "");

    return `
      <tr>
        <td>${escapeHtml(record.id)}</td>
        ${tableFields.map(field => `<td>${escapeHtml(record[field.key])}</td>`).join("")}
        <td>${escapeHtml(record[view.generatedDateKey])}</td>
        ${hasAttachments ? `<td>${attachmentCell}</td>` : ""}
      </tr>`;
  }).join("");
  const worksheet = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #cfdbe7; padding: 8px; vertical-align: top; }
          th { background: #eef8f8; color: #526680; font-weight: 700; }
          img { display: block; max-width: 130px; max-height: 90px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
  const blob = new Blob([worksheet], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.activeView}-records.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  records
    .filter(isImageAttachment)
    .forEach(record => downloadFile(record.attachmentData, record.attachmentName));
}

// Login Enhancement Functions
function getLoginAttempts() {
  try {
    const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return stored ? JSON.parse(stored) : { count: 0, lastAttemptTime: 0 };
  } catch {
    return { count: 0, lastAttemptTime: 0 };
  }
}

function setLoginAttempts(count, lastAttemptTime) {
  try {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify({ count, lastAttemptTime }));
  } catch {
    console.warn("Could not save login attempts");
  }
}

function isAccountLocked() {
  const attempts = getLoginAttempts();
  if (attempts.count < MAX_LOGIN_ATTEMPTS) return false;
  
  const timeSinceLastAttempt = Date.now() - attempts.lastAttemptTime;
  return timeSinceLastAttempt < LOCKOUT_DURATION_MS;
}

function getRemainingLockoutTime() {
  const attempts = getLoginAttempts();
  const timeSinceLastAttempt = Date.now() - attempts.lastAttemptTime;
  const remainingMs = LOCKOUT_DURATION_MS - timeSinceLastAttempt;
  return Math.ceil(remainingMs / 1000);
}

function recordFailedLoginAttempt() {
  const attempts = getLoginAttempts();
  setLoginAttempts(attempts.count + 1, Date.now());
}

function clearLoginAttempts() {
  setLoginAttempts(0, 0);
}

function saveRememberMe(username) {
  try {
    const expiryTime = Date.now() + REMEMBER_ME_DURATION_MS;
    localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ username, expiryTime }));
  } catch {
    console.warn("Could not save remember me");
  }
}

function getRememberedUser() {
  try {
    const stored = localStorage.getItem(REMEMBER_ME_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    if (Date.now() > data.expiryTime) {
      localStorage.removeItem(REMEMBER_ME_KEY);
      return null;
    }
    return data.username;
  } catch {
    return null;
  }
}

function clearRememberedUser() {
  try {
    localStorage.removeItem(REMEMBER_ME_KEY);
  } catch {
    console.warn("Could not clear remember me");
  }
}

function saveAuthSession(username) {
  try {
    const expiryTime = Date.now() + AUTH_SESSION_DURATION_MS;
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ username, expiryTime }));
  } catch {
    console.warn("Could not save login session");
  }
}

function getAuthSession() {
  try {
    const stored = localStorage.getItem(AUTH_SESSION_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    if (Date.now() > data.expiryTime) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    console.warn("Could not clear login session");
  }
}

function togglePasswordVisibility() {
  const isPassword = elements.loginPassword.type === "password";
  elements.loginPassword.type = isPassword ? "text" : "password";
  elements.togglePassword.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
  elements.togglePassword.title = isPassword ? "Hide password" : "Show password";
  elements.togglePassword.classList.toggle("password-visible", !isPassword);
}

function checkRememberedLogin() {
  const rememberedUsername = getRememberedUser();
  if (rememberedUsername) {
    elements.loginUsername.value = rememberedUsername;
    elements.rememberMe.checked = true;
  }
}

function initializeLogin() {
  checkRememberedLogin();
  
  if (isAccountLocked()) {
    const remainingSeconds = getRemainingLockoutTime();
    const minutes = Math.ceil(remainingSeconds / 60);
    elements.loginLockMessage.textContent = `Account temporarily locked. Try again in ${minutes} minute(s).`;
    elements.loginForm.querySelector("button[type='submit']").disabled = true;
  } else {
    clearLoginAttempts();
    elements.loginLockMessage.textContent = "";
    elements.loginForm.querySelector("button[type='submit']").disabled = false;
  }
}

function authenticateUser(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();

  if (
    normalizedUsername === DEFAULT_ADMIN_USERNAME.toLowerCase() &&
    password === DEFAULT_ADMIN_PASSWORD
  ) {
    return { userName: DEFAULT_ADMIN_USERNAME, role: "Administrator", status: "Active" };
  }

  return state.data.userManagement.find(user => {
    const userNameMatches = String(user.userName || "").trim().toLowerCase() === normalizedUsername;
    const passwordMatches = String(user.password || "") === password;
    const isActive = String(user.status || "").trim().toLowerCase() === "active";
    return userNameMatches && passwordMatches && isActive;
  }) || null;
}

elements.navButtons.forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.directory));
});
elements.createBtn.addEventListener("click", () => showForm());
elements.cancelEditBtn.addEventListener("click", hideForm);
elements.recordForm.addEventListener("submit", handleSave);
elements.exportBtn.addEventListener("click", exportRecords);
elements.dashboardThemeSelect.addEventListener("change", event => applyTheme(event.target.value));
elements.dashboardProjectSelect.addEventListener("change", event => {
  state.dashboardProject = event.target.value;
  renderDashboard();
});
elements.modificationProjectFilter.addEventListener("change", event => {
  const keepFormOpen = !elements.recordFormPanel.classList.contains("hidden");
  state.modificationProject = event.target.value;
  render({ keepFormOpen });
  if (keepFormOpen) syncModificationProjectField();
});
elements.loginBtn.addEventListener("click", showLoginModal);
elements.cancelLoginBtn?.addEventListener("click", hideLoginModal);
elements.logoutBtn.addEventListener("click", () => {
  clearAuthSession();
  clearRememberedUser();
  elements.loginBtn.textContent = "Login";
  elements.loginBtn.classList.remove("primary");
  elements.loginBtn.classList.add("secondary");
  setAuthenticated(false);
  showLoginModal();
});
elements.togglePassword?.addEventListener("click", event => {
  event.preventDefault();
  togglePasswordVisibility();
});
elements.loginUsername.addEventListener("input", () => {
  elements.loginForm.classList.remove("has-error");
  elements.loginMessage.textContent = "";
});
elements.loginPassword.addEventListener("input", () => {
  elements.loginForm.classList.remove("has-error");
  elements.loginMessage.textContent = "";
});
elements.loginModal.addEventListener("click", event => {
  if (event.target === elements.loginModal) hideLoginModal();
});
elements.cancelDeleteBtn.addEventListener("click", hideDeleteModal);
elements.confirmDeleteBtn.addEventListener("click", confirmDeleteRecord);
elements.deleteModal.addEventListener("click", event => {
  if (event.target === elements.deleteModal) hideDeleteModal();
});
elements.closeDashboardDetailBtn.addEventListener("click", hideDashboardDetailModal);
elements.dashboardDetailModal.addEventListener("click", event => {
  if (event.target === elements.dashboardDetailModal) hideDashboardDetailModal();
});
elements.closeAttachmentPreviewBtn.addEventListener("click", hideAttachmentPreview);
elements.attachmentPreviewModal.addEventListener("click", event => {
  if (event.target === elements.attachmentPreviewModal) hideAttachmentPreview();
});
elements.loginForm.addEventListener("submit", event => {
  event.preventDefault();
  
  if (isAccountLocked()) {
    const remainingSeconds = getRemainingLockoutTime();
    const minutes = Math.ceil(remainingSeconds / 60);
    elements.loginLockMessage.textContent = `Account temporarily locked. Try again in ${minutes} minute(s).`;
    return;
  }

  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;

  if (!username || !password) {
    elements.loginForm.classList.add("has-error");
    elements.loginMessage.textContent = "Please enter both username and password.";
    return;
  }

  const authenticatedUser = authenticateUser(username, password);

  if (!authenticatedUser) {
    elements.loginForm.classList.add("has-error");
    recordFailedLoginAttempt();
    const attempts = getLoginAttempts();
    const attemptsLeft = MAX_LOGIN_ATTEMPTS - attempts.count;
    
    if (attemptsLeft > 0) {
      elements.loginMessage.textContent = `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`;
    } else {
      elements.loginLockMessage.textContent = "Too many failed attempts. Account locked for 5 minutes.";
      elements.loginForm.querySelector("button[type='submit']").disabled = true;
    }
    
    elements.loginPassword.value = "";
    elements.loginPassword.focus();
    return;
  }

  clearLoginAttempts();
  elements.loginForm.classList.remove("has-error");
  
  if (elements.rememberMe.checked) {
    saveRememberMe(username);
  } else {
    clearRememberedUser();
  }

  elements.loginBtn.textContent = "Logged In";
  elements.loginBtn.classList.remove("secondary");
  elements.loginBtn.classList.add("primary");
  elements.loginMessage.textContent = "";
  elements.loginLockMessage.textContent = "";
  saveAuthSession(authenticatedUser.userName || username);
  setAuthenticated(true);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && state.isAuthenticated && !elements.loginModal.classList.contains("hidden")) {
    hideLoginModal();
  }
  if (event.key === "Escape" && !elements.deleteModal.classList.contains("hidden")) {
    hideDeleteModal();
  }
  if (event.key === "Escape" && !elements.dashboardDetailModal.classList.contains("hidden")) {
    hideDashboardDetailModal();
  }
  if (event.key === "Escape" && !elements.attachmentPreviewModal.classList.contains("hidden")) {
    hideAttachmentPreview();
  }
});
elements.calendarTaskForm.addEventListener("submit", saveCalendarTask);
elements.cancelCalendarTaskBtn.addEventListener("click", hideCalendarTaskForm);
elements.calendarProjectFilter.addEventListener("change", event => {
  state.calendarProject = event.target.value;
  renderCalendar();
});
elements.weekViewBtn.addEventListener("click", () => {
  state.calendarMode = "week";
  renderCalendar();
});
elements.monthViewBtn.addEventListener("click", () => {
  state.calendarMode = "month";
  renderCalendar();
});
elements.prevCalendarBtn.addEventListener("click", () => {
  const date = new Date(state.calendarDate);
  if (state.calendarMode === "week") {
    date.setDate(date.getDate() - 7);
  } else {
    date.setMonth(date.getMonth() - 1);
  }
  state.calendarDate = date;
  renderCalendar();
});
elements.nextCalendarBtn.addEventListener("click", () => {
  const date = new Date(state.calendarDate);
  if (state.calendarMode === "week") {
    date.setDate(date.getDate() + 7);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  state.calendarDate = date;
  renderCalendar();
});
elements.todayCalendarBtn.addEventListener("click", () => {
  state.calendarDate = new Date();
  state.calendarSelectedDate = new Date();
  renderCalendar();
});
saveLocalData();
applyTheme(localStorage.getItem(THEME_KEY) || "maroonWhite");
updateClock();
setInterval(updateClock, 1000);
const normalizedIds = normalizeModificationIds();
const normalizedTcIds = normalizeTestCaseIds();
const normalizedStatuses = normalizeStatusValues();
if (normalizedIds || normalizedTcIds || normalizedStatuses) {
  saveLocalData();
}
render();
initializeLogin();
const authSession = getAuthSession();
setAuthenticated(Boolean(authSession));
hydrateCloudData();
