"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, FONT_MONO, fcfa, cardStyle } from "../ui";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function load() {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => {
        setPayments(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDownloadPDF(e: React.MouseEvent, paymentId: string, mois: string) {
    e.preventDefault();
    setDownloadingId(paymentId);

    try {
      const res = await fetch(`/api/payments/${paymentId}/quittance`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Impossible de télécharger la quittance");
        setDownloadingId(null);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quittance-${mois.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors du téléchargement");
    } finally {
      setDownloadingId(null);
    }
  }

  async function checkMoMoStatus(referenceId: string) {
    const res = await fetch(`/api/payments/momo/status/${referenceId}`);
    if (res.ok) {
      load();
    }
  }

  if (loading) return <div style={{ color: COLORS.inkSoft, fontSize: 14 }}>Chargement...</div>;

  return (
    <>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, margin: "0 0 20px" }}>Historique des paiements</h1>
      <div style={cardStyle}>
        {payments.length === 0 && <div style={{ padding: 20, fontSize: 13, color: COLORS.inkSoft }}>Aucun paiement enregistré pour l'instant.</div>}
        {payments.map((pay, i) => (
          <div
            key={pay.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}`,
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
              {pay.statut === "CONFIRME" ? (
                <button
                  onClick={(e) => handleDownloadPDF(e, pay.id, pay.mois)}
                  disabled={downloadingId === pay.id}
                  style={{
                    background: COLORS.primary,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {downloadingId === pay.id ? "Génération..." : "📄 Télécharger Quittance"}
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#d97706", fontWeight: 600 }}>En attente</span>
                  {pay.reference && (
                    <button
                      onClick={() => checkMoMoStatus(pay.reference)}
                      style={{
                        background: "none",
                        border: `1px solid ${COLORS.line}`,
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Vérifier
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
