import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";
import { sendSMS, sendWhatsApp } from "@/lib/notifications";
import { fcfa } from "@/lib/format";

// POST /api/notifications/relances
// Envoie un rappel (SMS et/ou WhatsApp selon ce qui est configuré) à tous
// les locataires actuellement marqués "en retard". Ne relance pas deux fois
// le même jour, pour éviter de harceler quelqu'un qui vient d'être relancé.
export async function POST(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const body = await req.json().catch(() => ({}));
  const canal: "sms" | "whatsapp" | "both" = body.canal || "sms";

  const enRetard = await prisma.tenant.findMany({
    where: { statut: "RETARD", property: { landlordId: landlord.id } },
    include: { property: true },
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const resultats = [];

  for (const tenant of enRetard) {
    if (tenant.dernierRappel && tenant.dernierRappel >= startOfToday) {
      resultats.push({ tenant: tenant.nom, envoye: false, raison: "Déjà relancé aujourd'hui" });
      continue;
    }

    const mois = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const message = `Bonjour ${tenant.nom}, votre loyer de ${fcfa(tenant.property.loyer)} pour ${tenant.property.nom} (${mois}) reste impayé. Merci de régulariser rapidement. — LocaBénin`;

    let envoye = false;
    let raison = "";

    if (canal === "sms" || canal === "both") {
      const res = await sendSMS(tenant.telephone, message);
      envoye = envoye || res.success;
      if (!res.success) raison = res.detail || "Échec SMS";
    }

    if (canal === "whatsapp" || canal === "both") {
      const res = await sendWhatsApp(tenant.telephone, {
        locataire: tenant.nom,
        bien: tenant.property.nom,
        montant: fcfa(tenant.property.loyer),
        mois,
      });
      envoye = envoye || res.success;
      if (!res.success && !raison) raison = res.detail || "Échec WhatsApp";
    }

    if (envoye) {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { dernierRappel: new Date() } });
    }

    resultats.push({ tenant: tenant.nom, envoye, raison: envoye ? undefined : raison });
  }

  return Response.json({ total: enRetard.length, resultats });
}
