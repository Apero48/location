import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// POST /api/auth/register — création d'un compte propriétaire/agence
// NextAuth ne gère pas l'inscription lui-même : cette route est l'endroit
// où un nouveau client crée son compte avant de se connecter via /api/auth/signin.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, email, password, telephone } = body;

    if (!nom || !email || !password) {
      return Response.json({ error: "nom, email et password sont requis" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "Le mot de passe doit faire au moins 8 caractères" }, { status: 400 });
    }

    const existing = await prisma.landlord.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const landlord = await prisma.landlord.create({
      data: { nom, email, passwordHash, telephone, plan: "GRATUIT" },
    });

    // On ne renvoie jamais le passwordHash au client
    return Response.json(
      { id: landlord.id, nom: landlord.nom, email: landlord.email, plan: landlord.plan },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Erreur register:", err);
    return Response.json(
      { error: err?.message || "Erreur de connexion à la base de données" },
      { status: 500 }
    );
  }
}
