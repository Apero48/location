import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";

async function assertOwnership(landlordId: string, tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, property: { landlordId } },
  });
}

// PATCH /api/tenants/:id — met à jour un locataire (ex: statut, coordonnées)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const { id } = await params;
  const existing = await assertOwnership(landlord.id, id);
  if (!existing) return Response.json({ error: "Locataire introuvable" }, { status: 404 });

  const body = await req.json();
  const { nom, telephone, email, statut } = body;

  const tenant = await prisma.tenant.update({
    where: { id },
    data: { nom, telephone, email, statut },
  });

  return Response.json(tenant);
}

// DELETE /api/tenants/:id — retire un locataire (ex: fin de bail)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const { id } = await params;
  const existing = await assertOwnership(landlord.id, id);
  if (!existing) return Response.json({ error: "Locataire introuvable" }, { status: 404 });

  await prisma.tenant.delete({ where: { id } });

  return Response.json({ success: true });
}

