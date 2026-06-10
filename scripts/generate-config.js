const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const outputFile = path.join(publicDir, "config.js");
const localEnvFile = path.join(__dirname, "..", ".env.local");

if (fs.existsSync(localEnvFile)) {
  const lines = fs.readFileSync(localEnvFile, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

const config = {
  url: process.env.VITE_SUPABASE_URL || "",
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || ""
};

const contents = `window.SUPABASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(outputFile, contents, "utf8");
console.log("Generated public/config.js from environment variables.");
