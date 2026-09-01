"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, FONT_MONO, fcfa, cardStyle } from "../ui";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => {
        setPayments(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ color: COLORS.inkSoft, fontSize: 14 }}>Chargement...</div>;

  return (
    <>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, margin: "0 0 20px" }}>Historique des paiements</h1>
      <div style={cardStyle}>
        {payments.length === 0 && <div style={{ padding: 20, fontSize: 13, color: COLORS.inkSoft }}>Aucun paiement enregistré pour l'instant.</div>}
        {payments.map((pay, i) => (
          <a
            key={pay.id}
            href={`/api/payments/${pay.id}/quittance`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}`,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{pay.tenant?.nom}</div>
              <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
                {pay.tenant?.property?.nom} · {pay.mois} · {pay.methode.replace("_", " ")}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{fcfa(pay.montant)}</div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primary }}>Quittance →</span>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
