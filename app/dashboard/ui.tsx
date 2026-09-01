"use client";

export const COLORS = {
  bg: "#FBFAF7",
  surface: "#FFFFFF",
  ink: "#182420",
  inkSoft: "#4B5A55",
  primary: "#0F3D3E",
  primarySoft: "#E4EEEC",
  accent: "#C77D2E",
  accentSoft: "#F6E8D8",
  success: "#2F7A4F",
  successSoft: "#E4F0E7",
  danger: "#B84C3E",
  dangerSoft: "#F7E6E3",
  line: "#E4E0D6",
};

export const FONT_DISPLAY = "'Fraunces', Georgia, serif";
export const FONT_BODY = "'Public Sans', system-ui, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

export function fcfa(n: number) {
  return new Intl.NumberFormat("fr-BJ", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

export const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.line}`,
  fontFamily: FONT_BODY,
  fontSize: 13,
  outline: "none",
  color: COLORS.ink,
  background: "#fff",
};

export const cardStyle: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.line}`,
  borderRadius: 16,
};

export const buttonPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 10,
  border: "none",
  background: COLORS.primary,
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT_BODY,
};

export function Pill({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "danger" | "accent" }) {
  const toneMap = {
    success: { bg: COLORS.successSoft, fg: COLORS.success },
    danger: { bg: COLORS.dangerSoft, fg: COLORS.danger },
    accent: { bg: COLORS.accentSoft, fg: COLORS.accent },
  }[tone];
  return (
    <span
      style={{
        fontFamily: FONT_BODY,
        fontSize: 11.5,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
        background: toneMap.bg,
        color: toneMap.fg,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}
