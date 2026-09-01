import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";

// GET /api/tenants — liste les locataires du landlord connecté (toutes propriétés confondues)
export async function GET(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const tenants = await prisma.tenant.findMany({
    where: { property: { landlordId: landlord.id } },
    include: { property: true, payments: { orderBy: { datePaiement: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(tenants);
}

// POST /api/tenants — ajoute un locataire à un bien
export async function POST(req: NextRequest) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const body = await req.json();
  const { nom, telephone, email, propertyId } = body;

  if (!nom || !telephone || !propertyId) {
    return Response.json({ error: "nom, telephone et propertyId sont requis" }, { status: 400 });
  }

  // Vérifie que le bien appartient bien à ce landlord (sécurité)
  const property = await prisma.property.findFirst({
    where: { id: propertyId, landlordId: landlord.id },
  });
  if (!property) {
    return Response.json({ error: "Bien introuvable" }, { status: 404 });
  }

  const tenant = await prisma.tenant.create({
    data: { nom, telephone, email, propertyId },
  });

  return Response.json(tenant, { status: 201 });
}
