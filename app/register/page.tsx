"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS, FONT_DISPLAY, FONT_BODY, inputStyle, buttonPrimary } from "../dashboard/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: "", email: "", password: "", telephone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Une erreur est survenue");
      return;
    }

    router.push("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.bg,
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 32, width: 380 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>
          Créer un compte
        </div>
        <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 22 }}>
          Gérez vos biens et locataires en quelques minutes.
        </div>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            placeholder="Nom complet"
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
          />
          <input
            placeholder="Téléphone (optionnel)"
            value={form.telephone}
            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Mot de passe (8 caractères min.)"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={inputStyle}
          />
          {error && <div style={{ color: COLORS.danger, fontSize: 12.5 }}>{error}</div>}
          <button type="submit" disabled={loading} style={buttonPrimary}>
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12.5, color: COLORS.inkSoft, textAlign: "center" }}>
          Déjà un compte ?{" "}
          <a href="/login" style={{ color: COLORS.primary, fontWeight: 600 }}>
            Se connecter
          </a>
        </div>
      </div>
    </div>
  );
}
