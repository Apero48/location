import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { prisma } from "./prisma";

/**
 * Récupère le landlord actuellement connecté à partir de la session NextAuth
 * (basée sur un JWT signé côté serveur — impossible à falsifier depuis le client,
 * contrairement à l'ancien cookie landlordId en clair).
 */
export async function getCurrentLandlord(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const landlordId = (session.user as any).id;

  const landlord = await prisma.landlord.findUnique({
    where: { id: landlordId },
  });

  return landlord;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Non authentifié" }, { status: 401 });
}
