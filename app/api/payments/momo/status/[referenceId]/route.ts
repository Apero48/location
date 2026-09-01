import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";
import { checkRequestToPayStatus } from "@/lib/momo";

// GET /api/payments/momo/status/:referenceId
// Interroge MTN pour connaître le résultat d'une demande envoyée précédemment,
// et met à jour le paiement en base en conséquence.
export async function GET(req: NextRequest, { params }: { params: Promise<{ referenceId: string }> }) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const { referenceId } = await params;

  const payment = await prisma.payment.findFirst({
    where: { reference: referenceId, tenant: { property: { landlordId: landlord.id } } },
  });
  if (!payment) {
    return Response.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  const result = await checkRequestToPayStatus(referenceId);

  if (result.status === "SUCCESSFUL" && payment.statut !== "CONFIRME") {
    await prisma.payment.update({ where: { id: payment.id }, data: { statut: "CONFIRME" } });
    await prisma.tenant.update({ where: { id: payment.tenantId }, data: { statut: "ACTIF" } });
  } else if (result.status === "FAILED" && payment.statut !== "ECHOUE") {
    await prisma.payment.update({ where: { id: payment.id }, data: { statut: "ECHOUE" } });
  }

  return Response.json({ statut: result.status });
}
