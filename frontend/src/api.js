const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

export async function api(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    throw { status: res.status, data: data || { error: "Request failed" } };
  }
  return data;
}
