import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRequestToPayStatus } from "@/lib/momo";

// POST /api/webhooks/momo
// MTN appelle cette URL (configurée via X-Callback-Url) quand le locataire
// confirme ou refuse la demande de paiement sur son téléphone.
//
// Le sandbox MTN MoMo ne signe pas ses webhooks (pas de header de signature
// vérifiable), donc cette route applique deux protections indépendantes :
//
//   1. Un secret partagé embarqué dans l'URL elle-même (MTN_MOMO_CALLBACK_URL),
//      que seul toi connais — sans lui, la requête est rejetée avant même
//      d'être lue.
//   2. On ne fait JAMAIS confiance au statut envoyé dans le corps de la
//      requête. On l'utilise seulement comme déclencheur pour aller
//      revérifier le statut réel directement auprès de MTN, via un appel
//      authentifié avec nos propres identifiants (lib/momo.ts). C'est ce
//      second appel, et lui seul, qui décide si le paiement est confirmé.
//
// Avec ces deux protections, même si quelqu'un devine ou intercepte l'URL,
// il ne peut ni l'appeler sans le secret, ni forcer un paiement à passer à
// CONFIRME simplement en mentant dans le corps de sa requête.

function isValidSecret(req: NextRequest): boolean {
  const expected = process.env.MTN_MOMO_WEBHOOK_SECRET || "";
  const provided = req.nextUrl.searchParams.get("token") || "";

  if (!expected || !provided || expected.length !== provided.length) {
    return false;
  }

  // Comparaison à temps constant pour éviter qu'un attaquant ne devine le
  // secret caractère par caractère en mesurant le temps de réponse.
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function POST(req: NextRequest) {
  if (!isValidSecret(req)) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Payload invalide" }, { status: 400 });
  }

  const { referenceId } = body;
  if (!referenceId) {
    return Response.json({ error: "referenceId manquant" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { reference: referenceId } });
  if (!payment) {
    // On répond 200 quand même pour éviter que MTN ne réessaie indéfiniment
    // un webhook qui ne correspond à rien chez nous.
    return Response.json({ received: true });
  }

  // Idempotence : un paiement déjà tranché (confirmé ou échoué) ne doit
  // plus bouger, même si MTN renvoie le webhook plusieurs fois.
  if (payment.statut !== "EN_ATTENTE") {
    return Response.json({ received: true, statut: payment.statut });
  }

  // Étape clé : on ignore body.status et on redemande la vérité à MTN.
  let real;
  try {
    real = await checkRequestToPayStatus(referenceId);
  } catch (err) {
    // Si MTN est injoignable, on ne change rien — /api/payments/momo/status
    // reste disponible pour une vérification manuelle plus tard.
    return Response.json({ error: "Vérification impossible pour le moment" }, { status: 502 });
  }

  if (real.status === "SUCCESSFUL") {
    await prisma.payment.update({ where: { id: payment.id }, data: { statut: "CONFIRME" } });
    await prisma.tenant.update({ where: { id: payment.tenantId }, data: { statut: "ACTIF" } });
  } else if (real.status === "FAILED") {
    await prisma.payment.update({ where: { id: payment.id }, data: { statut: "ECHOUE" } });
  }
  // Si real.status === "PENDING", on ne fait rien — MTN rappellera plus tard.

  return Response.json({ received: true, statut: real.status });
}
