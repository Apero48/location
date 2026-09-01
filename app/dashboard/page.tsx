"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, fcfa, cardStyle } from "./ui";

function StatCard({ label, value, sub, tone = "primary" }: { label: string; value: string | number; sub?: string; tone?: "primary" | "accent" | "danger" | "success" }) {
  const toneMap = {
    primary: { bg: COLORS.primarySoft, fg: COLORS.primary },
    accent: { bg: COLORS.accentSoft, fg: COLORS.accent },
    danger: { bg: COLORS.dangerSoft, fg: COLORS.danger },
    success: { bg: COLORS.successSoft, fg: COLORS.success },
  }[tone];
  return (
    <div style={{ ...cardStyle, padding: "18px 20px", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, color: COLORS.ink, fontWeight: 600 }}>{value}</div>
      {sub && (
        <div style={{ display: "inline-block", marginTop: 8, fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: toneMap.bg, color: toneMap.fg }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [resultatRelance, setResultatRelance] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const [p, t, pay] = await Promise.all([
        fetch("/api/properties").then((r) => r.json()),
        fetch("/api/tenants").then((r) => r.json()),
        fetch("/api/payments").then((r) => r.json()),
      ]);
      setProperties(p);
      setTenants(t);
      setPayments(pay);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ color: COLORS.inkSoft, fontSize: 14 }}>Chargement des données...</div>;
  }

  const moisCourant = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const totalMoisCourant = payments
    .filter((p) => new Date(p.datePaiement).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + p.montant, 0);
  const enRetard = tenants.filter((t) => t.statut === "RETARD");

  async function envoyerRelances() {
    setEnvoiEnCours(true);
    setResultatRelance(null);
    const res = await fetch("/api/notifications/relances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal: "sms" }),
    });
    const data = await res.json();
    setResultatRelance(data);
    setEnvoiEnCours(false);
  }

  return (
    <>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: COLORS.ink, margin: "0 0 4px" }}>Bonjour 👋</h1>
      <p style={{ color: COLORS.inkSoft, fontSize: 14, margin: "0 0 24px" }}>Voici l'état de vos biens ({moisCourant}).</p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Biens gérés" value={properties.length} tone="primary" />
        <StatCard label="Locataires actifs" value={tenants.length} tone="primary" />
        <StatCard label="Encaissé ce mois" value={fcfa(totalMoisCourant)} tone="success" />
        <StatCard label="En retard" value={enRetard.length} sub={enRetard.length > 0 ? "à relancer" : "tout est à jour"} tone={enRetard.length > 0 ? "danger" : "success"} />
      </div>

      <div style={{ ...cardStyle, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 }}>Locataires à relancer</div>
          {enRetard.length > 0 && (
            <button
              onClick={envoyerRelances}
              disabled={envoiEnCours}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: COLORS.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {envoiEnCours ? "Envoi..." : `Relancer les ${enRetard.length} en retard`}
            </button>
          )}
        </div>
        {enRetard.length === 0 && <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Aucun retard en cours. 🎉</div>}
        {enRetard.map((t, i) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}` }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.nom}</div>
              <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{t.property?.nom}</div>
            </div>
          </div>
        ))}
        {resultatRelance && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.line}`, fontSize: 12.5, color: COLORS.inkSoft }}>
            {resultatRelance.resultats?.map((r: any, i: number) => (
              <div key={i} style={{ color: r.envoye ? COLORS.success : COLORS.danger }}>
                {r.tenant} — {r.envoye ? "relancé ✓" : r.raison}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
