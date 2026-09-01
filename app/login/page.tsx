"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { COLORS, FONT_DISPLAY, FONT_BODY, inputStyle, buttonPrimary } from "../dashboard/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou mot de passe incorrect");
      return;
    }

    router.push("/dashboard");
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
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 32, width: 360 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: COLORS.primary, marginBottom: 20 }}>
          Connexion
        </div>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          {error && <div style={{ color: COLORS.danger, fontSize: 12.5 }}>{error}</div>}
          <button type="submit" disabled={loading} style={buttonPrimary}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 12.5, color: COLORS.inkSoft, textAlign: "center" }}>
          Pas encore de compte ?{" "}
          <a href="/register" style={{ color: COLORS.primary, fontWeight: 600 }}>
            Créer un compte
          </a>
        </div>
      </div>
    </div>
  );
}
