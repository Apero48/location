import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Configuration NextAuth — authentification par email + mot de passe.
// Doc complète : https://next-auth.js.org/configuration/options
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt", // pas de table Session en base, le token JWT suffit ici
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const landlord = await prisma.landlord.findUnique({
          where: { email: credentials.email },
        });

        if (!landlord) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, landlord.passwordHash);
        if (!valid) {
          return null;
        }

        // Ce qui est renvoyé ici finit dans le token JWT puis dans la session
        return { id: landlord.id, email: landlord.email, name: landlord.nom, plan: landlord.plan };
      },
    }),
  ],
  callbacks: {
    // Ajoute landlordId et plan au token JWT à la connexion
    async jwt({ token, user }) {
      if (user) {
        token.landlordId = user.id;
        token.plan = (user as any).plan;
      }
      return token;
    },
    // Rend landlordId et plan disponibles côté client via useSession()
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.landlordId;
        (session.user as any).plan = token.plan;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "wPf88ImSawMLNfZMxEuOaklvePZ0V2U4lZ5wvsBqWkQ=",
};
