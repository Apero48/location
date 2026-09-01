export { default } from "next-auth/middleware";

// Toute route listée ici exige une session valide.
// Les routes /api/auth/* (login/register) restent volontairement exclues,
// sinon personne ne pourrait jamais se connecter.
export const config = {
  matcher: [
    "/api/properties/:path*",
    "/api/tenants/:path*",
    "/api/payments/:path*",
    "/dashboard/:path*",
  ],
};
