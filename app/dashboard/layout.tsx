"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "./ui";

function NavItem({ label, href }: { label: string; href: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === href;
  return (
    <button
      onClick={() => router.push(href)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        borderRadius: 10,
        border: "none",
        background: active ? COLORS.primary : "transparent",
        color: active ? "#fff" : COLORS.inkSoft,
        fontFamily: FONT_BODY,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        marginBottom: 4,
      }}
    >
      {label}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.inkSoft, fontFamily: FONT_BODY }}>
        Chargement...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // redirection en cours
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", fontFamily: FONT_BODY }}>
      <div style={{ width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.line}`, padding: "24px 14px", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 8px 26px" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 700, color: COLORS.primary }}>
            Loca<span style={{ color: COLORS.accent }}>Bénin</span>
          </div>
          <div style={{ fontSize: 11, color: COLORS.inkSoft, marginTop: 2 }}>{session?.user?.name}</div>
        </div>
        <NavItem label="Tableau de bord" href="/dashboard" />
        <NavItem label="Biens" href="/dashboard/properties" />
        <NavItem label="Locataires" href="/dashboard/tenants" />
        <NavItem label="Paiements" href="/dashboard/payments" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            marginTop: "auto",
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${COLORS.line}`,
            background: "transparent",
            color: COLORS.inkSoft,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Déconnexion
        </button>
      </div>
      <div style={{ flex: 1, padding: "32px 40px", maxWidth: 980 }}>{children}</div>
    </div>
  );
}
