
// frontend/src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Register({ onSwitch } = {}) {
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({ name: false, email: false, password: false });

  const [showPassword, setShowPassword] = useState(false);
  const toggleShow = () => setShowPassword((s) => !s);


  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e?.preventDefault?.();
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
    if (!email) {
      setMsg("Enter an email");
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
      console.log("Register: calling API with", { full_name: name, email, password: pwd });
      const out = await api("/api/auth/register", {
        method: "POST",
        body: { full_name: name, email, password: pwd },
      });
      console.log("Register success (frontend):", out);

      if (out?.token) localStorage.setItem("token", out.token);

      setMsg(`Welcome, ${out.full_name}! Redirecting…`);
      setTimeout(() => nav("/profile"), 500);
    } catch (err) {
      console.error("Register error (frontend):", err);
      const firstDetail = Array.isArray(err?.data?.details) ? err.data.details[0]?.message : null;
      setMsg(firstDetail || err?.data?.error || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ padding: "40px 0", maxWidth: 520 }}>
      <h2>Create your account</h2>
      {msg && <p style={{ color: msg.includes("Welcome") ? "#065f46" : "#b91c1c" }}>{msg}</p>}

      <form className="glass" style={{ padding: 18 }} onSubmit={onSubmit}>
        <label>
          Full name
          <input name="full_name" value={form.full_name} onChange={onChange} required className={errors.name ? "invalid" : ""} />
        </label>

        <label style={{ marginTop: 10 }}>
          Email
          <input type="email" name="email" value={form.email} onChange={onChange} required className={errors.email ? "invalid" : ""} />
        </label>

        


        <label style={{ marginTop: 10, position: "relative" }}>
          Password
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={onChange}
              required
              className={errors.password ? "invalid" : ""}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={toggleShow}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "white",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              {showPassword ? "🔒" : "👁️"}
            </button>
          </div>
        </label>
        <small style={{ color: "#4b5563" }}>Password must be at least 6 characters.</small>

        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" type="submit" disabled={loading} style={{background:"#e87547ff"}}>
            {loading ? "Creating…" : "Create account"}
          </button>

          {typeof onSwitch === "function" ? (
            <button className="btn ghost" type="button" onClick={() => onSwitch("login")}
             style={{ background:"Darkgreen",marginLeft: 10 , color: "white"}}>
              Already have an account?
            </button>
          ) : (
            <Link className="btn ghost" to="/login" style={{ marginLeft: 10 }}>
              Already have an account?
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
