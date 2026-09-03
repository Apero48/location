import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";

async function assertOwnership(landlordId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, landlordId },
  });
}

// PATCH /api/properties/:id — modifier un bien (nom, adresse, loyer)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const { id } = await params;
  const existing = await assertOwnership(landlord.id, id);
  if (!existing) return Response.json({ error: "Bien introuvable" }, { status: 404 });

  const body = await req.json();
  const { nom, adresse, loyer } = body;

  const property = await prisma.property.update({
    where: { id },
    data: {
      ...(nom !== undefined && { nom }),
      ...(adresse !== undefined && { adresse }),
      ...(loyer !== undefined && { loyer: Number(loyer) }),
    },
  });

  return Response.json(property);
}

// DELETE /api/properties/:id — supprimer un bien
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const { id } = await params;
  const existing = await assertOwnership(landlord.id, id);
  if (!existing) return Response.json({ error: "Bien introuvable" }, { status: 404 });

  await prisma.property.delete({ where: { id } });

  return Response.json({ success: true });
}
