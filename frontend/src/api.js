// frontend/src/api.js
// Use env var in production (Netlify). Falls back to localhost for local dev.
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

export async function api(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");
  const mergedHeaders = { "Content-Type": "application/json", ...(headers || {}) };
  if (token) mergedHeaders["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}${path}`;
  console.log("[api] request ->", { url, method, body, headers: mergedHeaders });

  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: mergedHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  console.log("[api] response ->", { status: res.status, data });
  if (!res.ok) {
    const err = new Error("Request failed");
    err.status = res.status;
    err.data = data || { error: "Request failed" };
    throw err;
  }

  return data;
}

export default API_BASE;
