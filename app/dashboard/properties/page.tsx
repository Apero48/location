"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, fcfa, cardStyle, inputStyle, buttonPrimary } from "../ui";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", adresse: "", loyer: "" });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/properties");
    setProperties(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, loyer: Number(form.loyer) }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la création");
      return;
    }
    setForm({ nom: "", adresse: "", loyer: "" });
    setShowForm(false);
    load();
  }

  if (loading) return <div style={{ color: COLORS.inkSoft, fontSize: 14 }}>Chargement...</div>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, margin: 0 }}>Biens</h1>
        <button onClick={() => setShowForm(!showForm)} style={buttonPrimary}>
          + Ajouter un bien
        </button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, padding: 18, marginBottom: 18 }}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr auto", gap: 10, alignItems: "center" }}>
            <input placeholder="Nom du bien" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inputStyle} />
            <input placeholder="Adresse (optionnel)" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} style={inputStyle} />
            <input placeholder="Loyer (FCFA)" type="number" required value={form.loyer} onChange={(e) => setForm({ ...form, loyer: e.target.value })} style={inputStyle} />
            <button type="submit" style={{ ...buttonPrimary, background: COLORS.accent }}>
              Enregistrer
            </button>
          </form>
          {error && <div style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 10 }}>{error}</div>}
        </div>
      )}

      <div style={cardStyle}>
        {properties.length === 0 && <div style={{ padding: 20, fontSize: 13, color: COLORS.inkSoft }}>Aucun bien pour l'instant.</div>}
        {properties.map((p, i) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderTop: i === 0 ? "none" : `1px solid ${COLORS.line}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{p.nom}</div>
              <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
                {p.adresse || "Adresse non renseignée"} · {p.tenants?.length || 0} locataire(s)
              </div>
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{fcfa(p.loyer)}/mois</div>
          </div>
        ))}
      </div>
    </>
  );
}
