// Envoi de rappels de loyer par SMS et/ou WhatsApp.
//
// SMS — Africa's Talking (https://africastalking.com) couvre le Bénin
// et a un modèle self-service simple (pas de validation d'entreprise
// requise pour démarrer), contrairement à WhatsApp Business.
//
// WhatsApp — Meta Cloud API (https://developers.facebook.com/docs/whatsapp)
// demande un compte Meta Business vérifié et des "modèles de message"
// pré-approuvés pour tout message envoyé hors fenêtre de 24h suivant un
// message du locataire — à garder en tête pour un vrai rappel proactif.

const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || "";
const AT_API_KEY = process.env.AFRICASTALKING_API_KEY || "";
const AT_SENDER_ID = process.env.AFRICASTALKING_SENDER_ID || ""; // optionnel

export async function sendSMS(phone: string, message: string): Promise<{ success: boolean; detail?: string }> {
  if (!AT_USERNAME || !AT_API_KEY) {
    return { success: false, detail: "Africa's Talking non configuré (variables d'environnement manquantes)" };
  }

  const params = new URLSearchParams({
    username: AT_USERNAME,
    to: phone.startsWith("+") ? phone : `+${phone}`,
    message,
    ...(AT_SENDER_ID ? { from: AT_SENDER_ID } : {}),
  });

  const res = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey: AT_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, detail: `Erreur Africa's Talking (${res.status}): ${text}` };
  }

  const data = await res.json();
  const recipient = data?.SMSMessageData?.Recipients?.[0];
  if (recipient && recipient.status !== "Success") {
    return { success: false, detail: recipient.status };
  }

  return { success: true };
}

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
// Nom du modèle de message pré-approuvé par Meta pour les rappels de loyer.
// Un modèle est obligatoire pour initier une conversation (le locataire n'a
// pas écrit en premier) — configure-le dans Meta Business Manager.
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "rappel_loyer";

export async function sendWhatsApp(
  phone: string,
  params: { locataire: string; bien: string; montant: string; mois: string }
): Promise<{ success: boolean; detail?: string }> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, detail: "WhatsApp Business non configuré (variables d'environnement manquantes)" };
  }

  const res = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: WHATSAPP_TEMPLATE_NAME,
        language: { code: "fr" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: params.locataire },
              { type: "text", text: params.bien },
              { type: "text", text: params.montant },
              { type: "text", text: params.mois },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, detail: `Erreur WhatsApp (${res.status}): ${text}` };
  }

  return { success: true };
}
