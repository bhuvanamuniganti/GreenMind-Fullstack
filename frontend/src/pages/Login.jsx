// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export default function Login({ onSwitch } = {}) {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({ email: false, password: false });

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e?.preventDefault?.();
    if (loading) return;
    setLoading(true);
    setMsg("");
    setErrors({ email: false, password: false });

    if (!form.email) {
      setMsg("Enter an email");
      setErrors((p) => ({ ...p, email: true }));
      setLoading(false);
      return;
    }
    if (!form.password) {
      setMsg("Enter your password");
      setErrors((p) => ({ ...p, password: true }));
      setLoading(false);
      return;
    }

    try {
      console.log("Login: calling API with", form);
      const out = await api("/api/auth/login", { method: "POST", body: form });
      console.log("Login success (frontend):", out);

      if (out?.token) localStorage.setItem("token", out.token);

      nav("/profile");
    } catch (err) {
      console.error("Login error (frontend):", err);
      setMsg(err?.data?.error || "Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ padding: "40px 0", maxWidth: 520 }}>
      <h2>Login</h2>
      {msg && <p style={{ color: "#b91c1c" }}>{msg}</p>}

      <form className="glass" style={{ padding: 18 }} onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            required
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

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn primary" type="submit" disabled={loading} style={{ backgroundColor: "darkgreen" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {typeof onSwitch === "function" ? (
            <button
              className="btn primary"
              type="button"
              style={{ marginLeft: 10, backgroundColor: "#e66a31ff" }}
              onClick={() => onSwitch("register")}
            >
              Create account
            </button>
          ) : (
            <Link className="btn primary" to="/register" style={{ marginLeft: 10, backgroundColor: "#e66a31ff" }}>
              Create account
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
