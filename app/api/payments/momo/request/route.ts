import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";
import { requestToPay } from "@/lib/momo";

// POST /api/payments/momo/request
// Envoie une notification de paiement MTN MoMo sur le téléphone du locataire.
// Le paiement est créé avec le statut EN_ATTENTE — il faudra ensuite soit
// recevoir le webhook MTN, soit appeler /api/payments/momo/status/:referenceId
// pour connaître le résultat final.
export async function POST(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const body = await req.json();
  const { tenantId, telephoneMomo, mois } = body;

  if (!tenantId || !telephoneMomo || !mois) {
    return Response.json({ error: "tenantId, telephoneMomo et mois sont requis" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, property: { landlordId: landlord.id } },
    include: { property: true },
  });
  if (!tenant) {
    return Response.json({ error: "Locataire introuvable" }, { status: 404 });
  }

  // On crée d'abord le paiement en base (statut EN_ATTENTE) pour avoir un
  // identifiant à passer en externalId à MTN, puis on déclenche la demande.
  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      montant: tenant.property.loyer,
      mois,
      methode: "MTN_MOMO",
      statut: "EN_ATTENTE",
    },
  });

  try {
    const { referenceId } = await requestToPay({
      amount: tenant.property.loyer,
      phone: telephoneMomo.replace(/\D/g, ""), // ne garder que les chiffres
      externalId: payment.id,
      payerMessage: `Loyer ${mois} — ${tenant.property.nom}`,
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { reference: referenceId },
    });

    return Response.json(updated, { status: 201 });
  } catch (err: any) {
    // Si l'appel à MTN échoue immédiatement (numéro invalide, service indisponible...),
    // on marque le paiement en échec plutôt que de le laisser bloqué en attente.
    await prisma.payment.update({ where: { id: payment.id }, data: { statut: "ECHOUE" } });
    return Response.json({ error: err.message || "Échec de la demande Mobile Money" }, { status: 502 });
  }
}
