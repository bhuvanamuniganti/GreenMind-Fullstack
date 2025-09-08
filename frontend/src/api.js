const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

export async function api(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error("Request failed");
    err.status = res.status;
    err.data = data || { error: "Request failed" };
    throw err; // ✅ now ESLint-safe
  }

  return data;
}

// ✅ default export so components can import API_BASE directly
export default API_BASE;
