"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, fcfa, cardStyle, inputStyle, buttonPrimary, Pill } from "../ui";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", telephone: "", propertyId: "" });
  const [error, setError] = useState("");
  const [recordFor, setRecordFor] = useState<any>(null);
  const [recordMethode, setRecordMethode] = useState("MTN_MOMO");
  const [recordPhone, setRecordPhone] = useState("");
  const [lastQuittance, setLastQuittance] = useState<string | null>(null);
  const [pendingMomo, setPendingMomo] = useState<{ paymentId: string; referenceId: string } | null>(null);
  const [momoStatus, setMomoStatus] = useState<string>("");

  async function load() {
    const [t, p] = await Promise.all([
      fetch("/api/tenants").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ]);
    setTenants(t);
    setProperties(p);
    if (!form.propertyId && p.length > 0) setForm((f) => ({ ...f, propertyId: p[0].id }));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.propertyId) {
      setError("Ajoute d'abord un bien avant d'enregistrer un locataire.");
      return;
    }
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la création");
      return;
    }
    setForm({ nom: "", telephone: "", propertyId: form.propertyId });
    setShowForm(false);
    load();
  }

  async function handleRecordPayment() {
    const mois = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    if (recordMethode === "MTN_MOMO") {
      // Vraie demande de paiement Mobile Money — le locataire doit confirmer sur son téléphone
      const res = await fetch("/api/payments/momo/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: recordFor.id, telephoneMomo: recordPhone, mois }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMomoStatus(data.error || "Échec de la demande");
        return;
      }
      setPendingMomo({ paymentId: data.id, referenceId: data.reference });
      setMomoStatus("PENDING");
      return;
    }

    // Espèces, virement ou déclaration manuelle : enregistrement immédiat
    const property = properties.find((p) => p.id === (recordFor.propertyId || recordFor.property?.id));
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: recordFor.id, montant: property?.loyer, mois, methode: recordMethode }),
    });
    if (res.ok) {
      const payment = await res.json();
      setLastQuittance(payment.id);
    }
    setRecordFor(null);
    load();
  }

  async function checkMomoStatus() {
    if (!pendingMomo) return;
    const res = await fetch(`/api/payments/momo/status/${pendingMomo.referenceId}`);
    const data = await res.json();
    setMomoStatus(data.statut || "PENDING");
    if (data.statut === "SUCCESSFUL") {
      setLastQuittance(pendingMomo.paymentId);
      setPendingMomo(null);
      setRecordFor(null);
      load();
    }
  }

  if (loading) return <div style={{ color: COLORS.inkSoft, fontSize: 14 }}>Chargement...</div>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, margin: 0 }}>Locataires</h1>
        <button onClick={() => setShowForm(!showForm)} style={buttonPrimary}>
          + Ajouter un locataire
        </button>
      </div>

      {properties.length === 0 && (
        <div style={{ ...cardStyle, padding: 16, marginBottom: 18, background: COLORS.accentSoft, border: "none" }}>
          <span style={{ fontSize: 13, color: COLORS.accent, fontWeight: 600 }}>
            Ajoute d'abord un bien dans l'onglet "Biens" avant de créer un locataire.
          </span>
        </div>
      )}

      {showForm && (
        <div style={{ ...cardStyle, padding: 18, marginBottom: 18 }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr auto", gap: 10, alignItems: "center" }}>
            <input placeholder="Nom complet" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inputStyle} />
            <input placeholder="Téléphone" required value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inputStyle} />
            <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })} style={inputStyle}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} — {fcfa(p.loyer)}
                </option>
              ))}
            </select>
            <button type="submit" style={{ ...buttonPrimary, background: COLORS.accent }}>
              Enregistrer
            </button>
          </form>
          {error && <div style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        </div>
      )}

      <div style={cardStyle}>
        {tenants.length === 0 && <div style={{ padding: 20, fontSize: 13, color: COLORS.inkSoft }}>Aucun locataire pour l'instant.</div>}
        {tenants.map((t, i) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{t.nom}</div>
              <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
                {t.property?.nom} · {t.telephone} · {fcfa(t.property?.loyer || 0)}/mois
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Pill tone={t.statut === "ACTIF" ? "success" : "danger"}>{t.statut === "ACTIF" ? "À jour" : "En retard"}</Pill>
              {t.statut === "ACTIF" && (
                <button
                  onClick={async () => {
                    await fetch(`/api/tenants/${t.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ statut: "RETARD" }),
                    });
                    load();
                  }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.inkSoft, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                >
                  Marquer en retard
                </button>
              )}
              <button
                onClick={() => setRecordFor(t)}
                style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.primary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                Encaisser
              </button>
            </div>
          </div>
        ))}
      </div>

      {lastQuittance && (
        <div style={{ ...cardStyle, padding: 16, marginTop: 18, background: COLORS.successSoft, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: COLORS.success, fontWeight: 600 }}>Paiement enregistré avec succès.</span>
          <a href={`/api/payments/${lastQuittance}/quittance`} target="_blank" style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.primary }}>
            Télécharger la quittance PDF →
          </a>
        </div>
      )}

      {recordFor && (
        <div onClick={() => { setRecordFor(null); setPendingMomo(null); setMomoStatus(""); }} style={{ position: "fixed", inset: 0, background: "rgba(15,61,62,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: 340 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Encaisser {recordFor.nom}</div>

            {!pendingMomo && (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Méthode de paiement</div>
                <select value={recordMethode} onChange={(e) => setRecordMethode(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: 12 }}>
                  <option value="MTN_MOMO">MTN MoMo (demande réelle)</option>
                  <option value="MOOV_MONEY">Moov Money</option>
                  <option value="ESPECES">Espèces</option>
                  <option value="VIREMENT">Virement</option>
                </select>

                {recordMethode === "MTN_MOMO" && (
                  <>
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Numéro Mobile Money du locataire</div>
                    <input
                      placeholder="ex: 22997123456"
                      value={recordPhone}
                      onChange={(e) => setRecordPhone(e.target.value)}
                      style={{ ...inputStyle, width: "100%", marginBottom: 12, boxSizing: "border-box" }}
                    />
                  </>
                )}

                {momoStatus && momoStatus !== "PENDING" && momoStatus !== "SUCCESSFUL" && (
                  <div style={{ color: COLORS.danger, fontSize: 12, marginBottom: 12 }}>{momoStatus}</div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setRecordFor(null)} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.inkSoft, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Annuler
                  </button>
                  <button onClick={handleRecordPayment} style={buttonPrimary}>
                    {recordMethode === "MTN_MOMO" ? "Envoyer la demande" : "Confirmer"}
                  </button>
                </div>
              </>
            )}

            {pendingMomo && (
              <>
                <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 16, lineHeight: 1.5 }}>
                  Demande envoyée au {recordPhone}. Le locataire doit confirmer sur son téléphone, puis clique sur "Vérifier" ci-dessous.
                </div>
                <Pill tone={momoStatus === "SUCCESSFUL" ? "success" : momoStatus === "FAILED" ? "danger" : "accent"}>
                  {momoStatus === "PENDING" ? "En attente de confirmation" : momoStatus}
                </Pill>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => { setRecordFor(null); setPendingMomo(null); setMomoStatus(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.inkSoft, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Fermer
                  </button>
                  <button onClick={checkMomoStatus} style={buttonPrimary}>
                    Vérifier le statut
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
