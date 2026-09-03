"use client";

import { useEffect, useState } from "react";
import { COLORS, FONT_DISPLAY, fcfa, cardStyle, inputStyle, buttonPrimary } from "../ui";

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  function startEdit(p: any) {
    setEditingId(p.id);
    setForm({ nom: p.nom, adresse: p.adresse || "", loyer: String(p.loyer) });
    setShowForm(true);
  }

  function resetForm() {
    setForm({ nom: "", adresse: "", loyer: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editingId ? `/api/properties/${editingId}` : "/api/properties";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, loyer: Number(form.loyer) }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la sauvegarde");
      return;
    }

    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce bien ?")) return;
    const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) return <div style={{ color: COLORS.inkSoft, fontSize: 14 }}>Chargement...</div>;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: COLORS.ink, margin: 0 }}>Biens</h1>
        <button
          onClick={() => {
            if (showForm) resetForm();
            else {
              setEditingId(null);
              setForm({ nom: "", adresse: "", loyer: "" });
              setShowForm(true);
            }
          }}
          style={buttonPrimary}
        >
          {showForm ? "Fermer" : "+ Ajouter un bien"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...cardStyle, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink, marginBottom: 12 }}>
            {editingId ? "Modifier le bien" : "Nouveau bien"}
          </div>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr auto", gap: 10, alignItems: "center" }}>
            <input placeholder="Nom du bien" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inputStyle} />
            <input placeholder="Adresse (optionnel)" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} style={inputStyle} />
            <input placeholder="Loyer (FCFA)" type="number" required value={form.loyer} onChange={(e) => setForm({ ...form, loyer: e.target.value })} style={inputStyle} />
            <div style={{ display: "flex", gap: 6 }}>
              <button type="submit" style={{ ...buttonPrimary, background: COLORS.accent }}>
                {editingId ? "Enregistrer" : "Créer"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} style={{ ...buttonPrimary, background: "#6b7280" }}>
                  Annuler
                </button>
              )}
            </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{fcfa(p.loyer)}/mois</div>
              <button
                onClick={() => startEdit(p)}
                style={{ background: "none", border: `1px solid ${COLORS.line}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: COLORS.ink }}
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                style={{ background: "none", border: "none", color: COLORS.danger, fontSize: 12, cursor: "pointer" }}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
