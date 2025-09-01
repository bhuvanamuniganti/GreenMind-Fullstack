import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({ name: false, email: false, password: false });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");
    setErrors({ name: false, email: false, password: false });

    const name = (form.full_name || "").trim();
    const email = (form.email || "").trim().toLowerCase();
    const pwd = form.password || "";

    if (name.length < 2) {
      setMsg("Name must be at least 2 characters");
      setErrors((p) => ({ ...p, name: true }));
      setLoading(false);
      return;
    }
    if (!/.+@gmail\.com$/i.test(email)) {
      setMsg("Use a Gmail address (e.g., yourname@gmail.com)");
      setErrors((p) => ({ ...p, email: true }));
      setLoading(false);
      return;
    }
    if (pwd.length < 6) {
      setMsg("Password must be at least 6 chars");
      setErrors((p) => ({ ...p, password: true }));
      setLoading(false);
      return;
    }

    try {
      const out = await api("/api/auth/register", {
        method: "POST",
        body: { full_name: name, email, password: pwd },
      });

      // ✅ Show short success msg then redirect
      setMsg(`Welcome, ${out.full_name}! Redirecting…`);
      setTimeout(() => nav("/profile"), 500);

    } catch (err) {
      const firstDetail = Array.isArray(err?.data?.details)
        ? err.data.details[0]?.message
        : null;
      setMsg(firstDetail || err?.data?.error || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ padding: "40px 0", maxWidth: 520 }}>
      <h2>Create your account</h2>

      {msg && (
        <p style={{ color: msg.includes("Welcome") ? "#065f46" : "#b91c1c" }}>
          {msg}
        </p>
      )}

      <form className="glass" style={{ padding: 18 }} onSubmit={onSubmit}>
        <label>
          Full name
          <input
            name="full_name"
            value={form.full_name}
            onChange={onChange}
            required
            className={errors.name ? "invalid" : ""}
          />
        </label>

        <label style={{ marginTop: 10 }}>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
            pattern=".+@gmail\.com"
            title="Use a Gmail address (e.g., yourname@gmail.com)"
            className={errors.email ? "invalid" : ""}
          />
        </label>

        <label style={{ marginTop: 10 }}>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            required
            className={errors.password ? "invalid" : ""}
          />
        </label>
        <small style={{ color: "#4b5563" }}>
          Password must be at least 6 characters.
        </small>

        <div className="form-actions">
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
          <Link className="btn ghost" to="/login">
            Already have an account?
          </Link>
        </div>
      </form>
    </div>
  );
}
