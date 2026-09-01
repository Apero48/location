import { NextRequest } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getCurrentLandlord, unauthorizedResponse } from "@/lib/auth";

// GET /api/payments/:id/quittance — génère et renvoie le PDF de la quittance
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const landlord = await getCurrentLandlord(req);
  if (!landlord) return unauthorizedResponse();

  const { id } = await params;

  const payment = await prisma.payment.findFirst({
    where: { id, tenant: { property: { landlordId: landlord.id } } },
    include: { tenant: { include: { property: true } } },
  });

  if (!payment) {
    return Response.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (payment.statut !== "CONFIRME") {
    return Response.json(
      { error: "Ce paiement n'est pas encore confirmé — la quittance sera disponible une fois le paiement validé." },
      { status: 409 }
    );
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 560]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { tenant } = payment;
  const { property } = tenant;

  let y = 500;
  const draw = (text: string, opts: { bold?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    page.drawText(text, {
      x: 40,
      y,
      size: opts.size ?? 12,
      font: opts.bold ? fontBold : font,
      color: rgb(...(opts.color ?? [0.09, 0.14, 0.13])),
    });
    y -= (opts.size ?? 12) + 10;
  };

  draw("QUITTANCE DE LOYER", { bold: true, size: 18 });
  draw(payment.mois, { size: 12, color: [0.3, 0.35, 0.33] });
  y -= 10;
  draw(`Locataire : ${tenant.nom}`);
  draw(`Bien : ${property.nom}`);
  draw(`Date de paiement : ${payment.datePaiement.toLocaleDateString("fr-FR")}`);
  draw(`Méthode : ${payment.methode.replace("_", " ")}`);
  y -= 10;
  draw(`Montant réglé : ${payment.montant.toLocaleString("fr-FR")} FCFA`, { bold: true, size: 16 });
  y -= 20;
  draw("Document généré automatiquement — LocaBénin", { size: 9, color: [0.5, 0.5, 0.5] });

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quittance-${payment.mois.replace(" ", "-")}.pdf"`,
    },
  });
}
