import { createClient } from "@supabase/supabase-js";

const STATE_KEY = "directory-management";
const MAX_PAYLOAD_BYTES = 1_000_000;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function sendCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function payloadSize(payload) {
  return Buffer.byteLength(JSON.stringify(payload || {}), "utf8");
}

function requestBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return req.body || {};
}

export default async function handler(req, res) {
  sendCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("app_state")
        .select("payload, updated_at, updated_by")
        .eq("key", STATE_KEY)
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({
        data: data?.payload || null,
        updatedAt: data?.updated_at || null,
        updatedBy: data?.updated_by || null
      });
    }

    if (req.method === "PUT") {
      const body = requestBody(req);
      const payload = body.data;
      const updatedBy = typeof body.updatedBy === "string"
        ? body.updatedBy.slice(0, 120)
        : null;

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res.status(400).json({ error: "Request body must include a data object." });
      }

      if (payloadSize(payload) > MAX_PAYLOAD_BYTES) {
        return res.status(413).json({ error: "Data is too large to sync." });
      }

      const { data, error } = await supabase
        .from("app_state")
        .upsert({ key: STATE_KEY, payload, updated_by: updatedBy }, { onConflict: "key" })
        .select("updated_at, updated_by")
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, updatedAt: data.updated_at, updatedBy: data.updated_by });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("App data API error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
