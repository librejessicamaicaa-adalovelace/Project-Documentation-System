const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tasks.json");
const APP_DATA_FILE = path.join(DATA_DIR, "app-state.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

let writeQueue = Promise.resolve();

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const seed = { tasks: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

async function ensureAppStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(APP_DATA_FILE);
  } catch {
    await fs.writeFile(APP_DATA_FILE, JSON.stringify({ data: null, updatedAt: null }, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const file = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(file);
  return { tasks: Array.isArray(data.tasks) ? data.tasks : [] };
}

async function readAppStore() {
  await ensureAppStore();
  const file = await fs.readFile(APP_DATA_FILE, "utf8");
  const data = JSON.parse(file);
  return {
    data: data && typeof data.data === "object" ? data.data : null,
    updatedAt: data.updatedAt || null,
    updatedBy: data.updatedBy || null
  };
}

function writeStore(data) {
  writeQueue = writeQueue.then(async () => {
    await ensureStore();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  });
  return writeQueue;
}

function writeAppStore(data) {
  writeQueue = writeQueue.then(async () => {
    await ensureAppStore();
    await fs.writeFile(APP_DATA_FILE, JSON.stringify(data, null, 2));
  });
  return writeQueue;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function cleanTask(input, existing = {}) {
  const now = new Date().toISOString();
  const status = ["To Do", "In Progress", "Blocked", "Done"].includes(input.status)
    ? input.status
    : "To Do";
  const priority = ["Low", "Medium", "High", "Urgent"].includes(input.priority)
    ? input.priority
    : "Medium";

  return {
    id: existing.id || crypto.randomUUID(),
    title: String(input.title || "").trim().slice(0, 160),
    project: String(input.project || "").trim().slice(0, 80),
    owner: String(input.owner || "").trim().slice(0, 80),
    status,
    priority,
    dueDate: String(input.dueDate || "").slice(0, 10),
    notes: String(input.notes || "").trim().slice(0, 1000),
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[1];

  if (req.method === "GET" && url.pathname === "/api/data") {
    return sendJson(res, 200, await readAppStore());
  }

  if (req.method === "PUT" && url.pathname === "/api/data") {
    const body = await readBody(req);
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      return sendJson(res, 400, { error: "Request body must include a data object." });
    }
    const next = {
      data: body.data,
      updatedAt: new Date().toISOString(),
      updatedBy: typeof body.updatedBy === "string" ? body.updatedBy.slice(0, 120) : null
    };
    await writeAppStore(next);
    return sendJson(res, 200, { ok: true, updatedAt: next.updatedAt, updatedBy: next.updatedBy });
  }

  if (req.method === "GET" && url.pathname === "/api/tasks") {
    return sendJson(res, 200, await readStore());
  }

  if (req.method === "POST" && url.pathname === "/api/tasks") {
    const body = await readBody(req);
    const task = cleanTask(body);
    if (!task.title) return sendJson(res, 400, { error: "Task title is required." });
    const data = await readStore();
    data.tasks.unshift(task);
    await writeStore(data);
    return sendJson(res, 201, { task });
  }

  if (req.method === "PUT" && parts[0] === "api" && parts[1] === "tasks" && parts[2]) {
    const taskId = parts[2];
    const body = await readBody(req);
    const data = await readStore();
    const index = data.tasks.findIndex(task => task.id === taskId);
    if (index === -1) return sendJson(res, 404, { error: "Task not found." });
    const task = cleanTask(body, data.tasks[index]);
    if (!task.title) return sendJson(res, 400, { error: "Task title is required." });
    data.tasks[index] = task;
    await writeStore(data);
    return sendJson(res, 200, { task });
  }

  if (req.method === "DELETE" && parts[0] === "api" && parts[1] === "tasks" && parts[2]) {
    const taskId = parts[2];
    const data = await readStore();
    const nextTasks = data.tasks.filter(task => task.id !== taskId);
    if (nextTasks.length === data.tasks.length) return sendJson(res, 404, { error: "Task not found." });
    data.tasks = nextTasks;
    await writeStore(data);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "API route not found." });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

ensureStore().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Project task tracker running at http://localhost:${PORT}`);
    console.log(`For other computers, open http://<this-computer-ip>:${PORT}`);
  });
});
