import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";

// GET /api/payments — historique des paiements du landlord
export async function GET(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const payments = await prisma.payment.findMany({
    where: { tenant: { property: { landlordId: landlord.id } } },
    include: { tenant: { include: { property: true } } },
    orderBy: { datePaiement: "desc" },
  });

  return Response.json(payments);
}

// POST /api/payments — enregistre un paiement de loyer
// C'est ici que s'intègre le webhook Mobile Money (voir README section "Mobile Money")
export async function POST(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const body = await req.json();
  const { tenantId, montant, mois, methode, reference } = body;

  if (!tenantId || !montant || !mois || !methode) {
    return Response.json(
      { error: "tenantId, montant, mois et methode sont requis" },
      { status: 400 }
    );
  }

  // Sécurité : vérifier que ce locataire appartient bien au landlord connecté
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, property: { landlordId: landlord.id } },
  });
  if (!tenant) {
    return Response.json({ error: "Locataire introuvable" }, { status: 404 });
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      montant: Number(montant),
      mois,
      methode,
      reference,
    },
  });

  // Le locataire redevient "actif" une fois le paiement enregistré
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { statut: "ACTIF" },
  });

  return Response.json(payment, { status: 201 });
}
