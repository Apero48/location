import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

// GET /api/cron/check-retards
// Parcourt tous les locataires actifs et les passe en "RETARD" si le jour
// d'échéance du mois est dépassé sans paiement confirmé pour le mois en
// cours. Conçu pour être appelé une fois par jour par un planificateur
// externe (Vercel Cron, cron-job.org...), pas par un utilisateur.
//
// Protégé par un secret dans l'URL, comme le webhook MoMo — voir
// app/api/webhooks/momo/route.ts pour le même principe.
function isValidSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || "";
  const provided = req.nextUrl.searchParams.get("token") || "";
  if (!expected || !provided || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function GET(req: NextRequest) {
  if (!isValidSecret(req)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const aujourdHui = new Date();
  const jourDuMois = aujourdHui.getDate();
  const moisCourant = aujourdHui.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const candidats = await prisma.tenant.findMany({
    where: { statut: "ACTIF", jourEcheance: { lte: jourDuMois } },
    include: { payments: { where: { mois: moisCourant, statut: "CONFIRME" } } },
  });

  const passesEnRetard = candidats.filter((t) => t.payments.length === 0);

  if (passesEnRetard.length > 0) {
    await prisma.tenant.updateMany({
      where: { id: { in: passesEnRetard.map((t) => t.id) } },
      data: { statut: "RETARD" },
    });
  }

  return Response.json({
    verifies: candidats.length,
    passesEnRetard: passesEnRetard.map((t) => t.nom),
  });
}
