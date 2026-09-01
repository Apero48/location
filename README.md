# LocaBénin — Backend (Next.js + PostgreSQL)

Backend de gestion locative : biens, locataires, paiements, quittances PDF.

## Installation

```bash
npm install
cp .env.example .env
# édite .env avec ton URL PostgreSQL

npx prisma migrate dev --name init
npx prisma generate

npm run dev
```

Crée ensuite ton premier compte via `POST /api/auth/register`, puis connecte-toi sur `/login`.

## Base de données

Le schéma (`prisma/schema.prisma`) contient 4 modèles :

- **Landlord** — le compte abonné (propriétaire ou agence). Chaque landlord a un `plan` (GRATUIT / STANDARD / AGENCE) qui limite le nombre de biens.
- **Property** — un bien immobilier, rattaché à un landlord.
- **Tenant** — un locataire, rattaché à un bien.
- **Payment** — un paiement de loyer, rattaché à un locataire.

Toute requête filtre systématiquement par `landlordId` — c'est ce qui isole les données de chaque client (multi-tenant).

## Routes API disponibles

| Méthode | Route | Rôle |
|---|---|---|
| GET/POST | `/api/properties` | Lister / créer un bien |
| GET/POST | `/api/tenants` | Lister / ajouter un locataire |
| PATCH/DELETE | `/api/tenants/:id` | Modifier / retirer un locataire |
| GET/POST | `/api/payments` | Historique / enregistrer un paiement |
| GET | `/api/payments/:id/quittance` | Télécharger la quittance PDF |

## Authentification (NextAuth.js)

L'authentification est maintenant réelle, par email + mot de passe :

1. **Inscription** — `POST /api/auth/register` avec `{ nom, email, password, telephone }`. Le mot de passe est haché avec bcrypt avant stockage (jamais en clair).
2. **Connexion** — page `/login`, qui appelle `signIn("credentials", ...)` de NextAuth. Une session JWT signée est alors créée.
3. **Protection des routes** — `middleware.ts` bloque automatiquement l'accès à `/api/properties`, `/api/tenants`, `/api/payments` et `/dashboard` sans session valide.
4. **Récupération du landlord courant** — `lib/auth.ts` lit la session NextAuth (plus un cookie en clair) pour identifier le compte connecté dans chaque route API.

N'oublie pas de générer un vrai secret pour la prod :
```bash
openssl rand -base64 32
# à coller dans NEXTAUTH_SECRET
```

## Front-end connecté (parcours complet testable)

Le dashboard est maintenant une vraie application Next.js, plus une démo isolée :

- `/register` — création de compte
- `/login` — connexion
- `/dashboard` — vue d'ensemble (statistiques réelles)
- `/dashboard/properties` — ajouter/lister les biens
- `/dashboard/tenants` — ajouter un locataire, encaisser un loyer
- `/dashboard/payments` — historique, avec lien direct vers chaque quittance PDF

Toutes les pages font de vrais appels `fetch()` vers les routes API — plus aucune donnée en mémoire fictive.

**Parcours de test complet** :
```
1. Aller sur /register → créer un compte
2. Se connecter sur /login
3. Dans /dashboard/properties → ajouter un bien (ex: "Studio X", loyer 40000)
4. Dans /dashboard/tenants → ajouter un locataire rattaché à ce bien
5. Cliquer "Encaisser" → choisir une méthode → confirmer
6. Télécharger la quittance PDF générée
7. Vérifier les chiffres mis à jour sur /dashboard
```

Note : `middleware.ts` protège les pages `/dashboard/*`, mais redirige par défaut vers `/api/auth/signin` (page NextAuth générique) plutôt que `/login`. Pour un rendu cohérent, configure `pages.signIn` directement dans le wrapper `withAuth` du middleware si besoin, ou laisse le garde côté client (déjà en place dans `app/dashboard/layout.tsx`) gérer la redirection visible.

## Intégration Mobile Money (MTN MoMo — Collections API)

L'encaissement automatique est maintenant réel pour MTN MoMo, en sandbox :

1. **Créer un compte développeur** sur https://momodeveloper.mtn.com, s'abonner au produit **Collections**, récupérer la clé d'abonnement (Subscription Key)
2. **Provisionner un API User + API Key sandbox** (endpoint de provisioning MTN, voir leur doc "Getting Started") — remplis `MTN_MOMO_API_USER` et `MTN_MOMO_API_KEY` dans `.env`
3. **Callback public** — MTN a besoin d'appeler ton `/api/webhooks/momo` depuis l'extérieur. En dev, utilise ngrok (`ngrok http 3000`) et mets l'URL générée dans `MTN_MOMO_CALLBACK_URL`

### Flux complet

1. Sur `/dashboard/tenants`, clique "Encaisser" → choisis "MTN MoMo" → entre le numéro du locataire
2. `POST /api/payments/momo/request` crée un `Payment` en statut `EN_ATTENTE` et envoie la demande à MTN
3. Le locataire reçoit une notification sur son téléphone et confirme
4. MTN appelle `/api/webhooks/momo` **ou** tu cliques "Vérifier le statut" (qui interroge `/api/payments/momo/status/:referenceId`) — dans les deux cas, le paiement passe à `CONFIRME` et le locataire redevient `ACTIF`
5. La quittance PDF n'est téléchargeable qu'une fois le paiement `CONFIRME` (vérifié côté serveur)

### Sécurité du webhook

Le sandbox MTN ne signe pas ses webhooks, donc `/api/webhooks/momo` applique deux protections :

1. **Secret partagé dans l'URL** — génère-en un avec `openssl rand -hex 24`, mets-le dans `MTN_MOMO_WEBHOOK_SECRET`. Il est automatiquement ajouté à l'URL envoyée à MTN (`?token=...`) ; toute requête sans ce token exact est rejetée (401), avec une comparaison à temps constant pour éviter les attaques par mesure de timing.
2. **Re-vérification systématique auprès de MTN** — le webhook n'utilise jamais le statut qu'il reçoit dans le corps de la requête ; il l'utilise uniquement comme déclencheur pour rappeler `checkRequestToPayStatus()` avec tes propres identifiants API. C'est cette réponse authentifiée, et elle seule, qui décide si un paiement passe à `CONFIRME`. Un paiement déjà tranché (`CONFIRME`/`ECHOUE`) est aussi ignoré si le webhook est rappelé plusieurs fois (idempotence).

Résultat : même si l'URL du webhook fuit ou est devinée, personne ne peut ni l'appeler sans le secret, ni forcer un paiement à se confirmer en mentant dans le corps de sa requête.

### Important avant la production

- **Devise sandbox** — le sandbox MTN n'accepte que EUR pour les tests ; `lib/momo.ts` bascule automatiquement en XOF une fois `MTN_MOMO_TARGET_ENV=production`.
- **Compte marchand réel** — passer en production demande un compte MTN MoMo entreprise validé (KYC), à demander directement auprès de MTN Bénin.
- **Moov Money** reste à intégrer — même logique, API différente à demander auprès de Moov Africa Bénin.

## Notifications de relance (SMS / WhatsApp)

Deux mécanismes travaillent ensemble pour relancer automatiquement les locataires en retard :

### 1. Détection automatique du retard
`GET /api/cron/check-retards` (protégé par `CRON_SECRET`, même principe que le webhook MoMo) parcourt chaque jour les locataires actifs : si le `jourEcheance` du mois est dépassé sans paiement `CONFIRME` pour le mois en cours, le locataire passe en `RETARD`.

Configure-le dans `vercel.json` (déjà présent, planifié tous les jours à 6h) — remplace `REMPLACE_PAR_TON_CRON_SECRET` par la vraie valeur de `CRON_SECRET` avant de déployer. Sans Vercel, n'importe quel service de cron externe (cron-job.org...) peut appeler cette URL à la même fréquence.

Tu peux aussi marquer un locataire en retard manuellement depuis `/dashboard/tenants` (bouton "Marquer en retard"), pratique pour tester sans attendre le cron.

### 2. Envoi des relances
Sur `/dashboard`, un bouton "Relancer les X en retard" apparaît dès qu'il y a des locataires en retard. Il appelle `POST /api/notifications/relances`, qui :
- envoie un SMS (par défaut) via **Africa's Talking** — service self-service, pas de validation d'entreprise requise pour démarrer, couvre le Bénin
- peut aussi envoyer par **WhatsApp** (Meta Cloud API) en passant `{ canal: "whatsapp" }` ou `{ canal: "both" }` — mais ça demande un compte Meta Business vérifié et un modèle de message pré-approuvé, car WhatsApp interdit d'initier une conversation sans modèle si le locataire n'a pas écrit en premier
- ne relance jamais deux fois le même jour la même personne (`dernierRappel`)

### Configuration

**SMS (Africa's Talking)** — le plus rapide à activer :
1. Crée un compte sur https://africastalking.com
2. Utilise l'environnement sandbox pour tester gratuitement, puis passe en production avec un compte payant (SMS peu coûteux, facturés à l'envoi)
3. Renseigne `AFRICASTALKING_USERNAME` et `AFRICASTALKING_API_KEY` dans `.env`

**WhatsApp (optionnel, plus lourd à mettre en place)** :
1. Compte Meta Business vérifié + numéro WhatsApp Business
2. Créer et faire approuver un modèle de message nommé `rappel_loyer` (ou autre nom, à mettre dans `WHATSAPP_TEMPLATE_NAME`) avec 4 variables : nom du locataire, bien, montant, mois
3. Renseigne `WHATSAPP_ACCESS_TOKEN` et `WHATSAPP_PHONE_NUMBER_ID`

## Déploiement (Vercel + base de données hébergée)

### 1. Base de données PostgreSQL hébergée

**Neon** (recommandé, plan gratuit généreux) :
1. Crée un compte sur https://neon.tech
2. Crée un projet → copie la "Connection string" (commence par `postgresql://...`)

**Alternative : Supabase** (https://supabase.com) — même principe, l'URL de connexion PostgreSQL se trouve dans Project Settings → Database.

### 2. Pousser le projet sur GitHub

```bash
cd gestion-locative-backend
git init
git add .
git commit -m "Premier commit — LocaBénin"
# crée un repo vide sur github.com, puis :
git remote add origin https://github.com/TON_USER/locabenin.git
git push -u origin main
```

### 3. Déployer sur Vercel

1. Sur https://vercel.com, "Add New Project" → importe le repo GitHub
2. Dans **Environment Variables**, ajoute toutes les variables de `.env.example` avec de vraies valeurs :
   - `DATABASE_URL` → la connection string Neon/Supabase (étape 1)
   - `NEXTAUTH_SECRET` → génère avec `openssl rand -base64 32`
   - `NEXTAUTH_URL` → l'URL Vercel une fois connue (ex: `https://locabenin.vercel.app`) ; tu peux redéployer après l'avoir renseignée
   - `MTN_MOMO_*`, `AFRICASTALKING_*`, `CRON_SECRET` → selon ce que tu as déjà configuré (peuvent rester vides pour un premier lien de démo sans encaissement réel)
3. Clique "Deploy"

### 4. Appliquer le schéma à la base de données

Une fois déployé, exécute la migration Prisma **une seule fois** contre la base de production (depuis ta machine, avec `DATABASE_URL` de prod dans `.env`) :

```bash
npx prisma migrate deploy
```

### 5. Vérifier

Va sur ton URL Vercel → `/register` → crée un compte test → vérifie tout le parcours (bien, locataire, encaissement, quittance).

### Limites d'un premier lien de démo

- Sans clés MTN MoMo/Africa's Talking configurées, l'encaissement Mobile Money et les relances SMS ne fonctionneront pas — mais tout le reste (comptes, biens, locataires, paiements manuels, quittances PDF) fonctionne normalement.
- Le cron de détection des retards (`vercel.json`) s'active automatiquement sur Vercel si `CRON_SECRET` est configuré et si le token dans `vercel.json` correspond.
- Pour un vrai lien à montrer à des propriétaires, pense à changer le plan `GRATUIT` par défaut si tu veux limiter/adapter le nombre de biens testables.

## Ce qui manque encore avant de vendre

1. **Intégration Moov Money** — même principe que MTN, API à demander auprès de Moov Africa Bénin

2. **Facturation de l'abonnement SaaS lui-même** — pour facturer tes clients (les propriétaires), même logique Mobile Money mais côté abonnement plutôt que loyer.

3. **Déploiement** — Vercel pour le Next.js (tu connais déjà, vu ton portfolio), et une base PostgreSQL hébergée (Neon ou Supabase ont un plan gratuit suffisant pour démarrer).

## Prochaine étape suggérée

Le projet est prêt à être déployé (voir section Déploiement ci-dessus). Une fois le premier lien testable en ligne, la suite naturelle est de le montrer à 5-10 propriétaires/agences réels à Cotonou pour valider l'intérêt avant d'investir plus de temps dans les fonctionnalités restantes (Moov Money, facturation d'abonnement).
