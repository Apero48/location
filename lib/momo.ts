import { randomUUID } from "crypto";

// Client pour l'API MTN MoMo Collections.
// Documentation officielle : https://momodeveloper.mtn.com
//
// Environnement sandbox par défaut. Pour la production, MTN fournit une
// URL de base différente et exige un compte marchand validé (KYC entreprise).
const BASE_URL = process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
const TARGET_ENV = process.env.MTN_MOMO_TARGET_ENV || "sandbox";
const SUBSCRIPTION_KEY = process.env.MTN_MOMO_SUBSCRIPTION_KEY!;
const API_USER = process.env.MTN_MOMO_API_USER!;
const API_KEY = process.env.MTN_MOMO_API_KEY!;

/**
 * Récupère un token d'accès OAuth (valable ~1h côté MTN).
 * En production, mets ce token en cache (Redis, ou variable mémoire avec
 * expiration) plutôt que d'en redemander un à chaque requête.
 */
async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${API_USER}:${API_KEY}`).toString("base64");

  const res = await fetch(`${BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible d'obtenir un token MTN MoMo (${res.status})`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Envoie une demande de paiement ("Request to Pay") au numéro du locataire.
 * Le locataire reçoit une notification MoMo sur son téléphone pour confirmer.
 * Retourne le referenceId à utiliser ensuite pour vérifier le statut.
 */
export async function requestToPay(params: {
  amount: number;
  phone: string; // format international sans le "+", ex: 22997123456
  externalId: string; // ton propre identifiant interne (ex: paymentId)
  payerMessage: string;
}): Promise<{ referenceId: string }> {
  const token = await getAccessToken();
  const referenceId = randomUUID();

  // On ajoute automatiquement le secret webhook à l'URL de callback, pour
  // que /api/webhooks/momo puisse vérifier que l'appel vient bien de MTN
  // (voir la protection mise en place dans cette route).
  const rawCallback = process.env.MTN_MOMO_CALLBACK_URL || "";
  const secret = process.env.MTN_MOMO_WEBHOOK_SECRET || "";
  const callbackUrl = rawCallback && secret ? `${rawCallback}?token=${secret}` : rawCallback;

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": TARGET_ENV,
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      // MTN appelle cette URL quand le locataire confirme ou refuse le paiement
      "X-Callback-Url": callbackUrl,
    },
    body: JSON.stringify({
      amount: String(params.amount),
      currency: TARGET_ENV === "sandbox" ? "EUR" : "XOF", // le sandbox MTN n'accepte que EUR pour les tests
      externalId: params.externalId,
      payer: { partyIdType: "MSISDN", partyId: params.phone },
      payerMessage: params.payerMessage,
      payeeNote: "Paiement de loyer — LocaBénin",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échec de la demande de paiement MoMo (${res.status}): ${text}`);
  }

  return { referenceId };
}

/**
 * Vérifie le statut d'une demande de paiement envoyée précédemment.
 * Statuts possibles : PENDING, SUCCESSFUL, FAILED
 */
export async function checkRequestToPayStatus(referenceId: string): Promise<{
  status: "PENDING" | "SUCCESSFUL" | "FAILED";
  financialTransactionId?: string;
}> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": TARGET_ENV,
      "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de vérifier le statut du paiement (${res.status})`);
  }

  return res.json();
}
