import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";

// GET /api/properties — liste les biens du landlord connecté
export async function GET(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const properties = await prisma.property.findMany({
    where: { landlordId: landlord.id },
    include: { tenants: true },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(properties);
}

// POST /api/properties — crée un nouveau bien
export async function POST(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const body = await req.json();
  const { nom, adresse, loyer } = body;

  if (!nom || !loyer) {
    return Response.json({ error: "nom et loyer sont requis" }, { status: 400 });
  }

  // Limite selon le plan d'abonnement
  const count = await prisma.property.count({ where: { landlordId: landlord.id } });
  const limites: Record<string, number> = { GRATUIT: 3, STANDARD: 15, AGENCE: Infinity };
  if (count >= limites[landlord.plan]) {
    return Response.json(
      { error: `Limite de biens atteinte pour le plan ${landlord.plan}. Passez à un plan supérieur.` },
      { status: 403 }
    );
  }

  const property = await prisma.property.create({
    data: { nom, adresse, loyer: Number(loyer), landlordId: landlord.id },
  });

  return Response.json(property, { status: 201 });
}
