import { COLORS, FONT_DISPLAY, FONT_BODY, buttonPrimary } from "./dashboard/ui";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.bg,
        fontFamily: FONT_BODY,
        gap: 20,
        textAlign: "center",
        padding: 20,
      }}
    >
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 700, color: COLORS.primary }}>
          Loca<span style={{ color: COLORS.accent }}>Bénin</span>
        </div>
        <div style={{ fontSize: 14, color: COLORS.inkSoft, marginTop: 6 }}>
          Gestion locative simple pour propriétaires et agences au Bénin.
        </div>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <a href="/login" style={{ ...buttonPrimary, textDecoration: "none", display: "inline-block", background: COLORS.surface, border: `1px solid ${COLORS.line}`, color: COLORS.primary }}>
          Se connecter
        </a>
        <a href="/register" style={{ ...buttonPrimary, textDecoration: "none", display: "inline-block" }}>
          Créer un compte
        </a>
      </div>
    </div>
  );
}
