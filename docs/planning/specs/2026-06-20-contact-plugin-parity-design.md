# Design — Parité d'outillage pour `@navanem/payload-contact`

- **Date** : 2026-06-20
- **Statut** : approuvé (design)
- **Auteur** : navanem

## Contexte

Le dépôt `navanem_payload_contact` contient déjà un plugin Payload 3.x fonctionnel
(`src/` complet, build `tsc` + `copy-assets`, README, CHANGELOG, LICENSE). Il lui
manque l'outillage de développement et de qualité présent dans le dépôt frère
[`navanem_payload_comments`](https://github.com/navanem/navanem_payload_comments) :
environnement de dev, tests, documentation détaillée, et fichiers d'outillage pnpm.

## Objectif

Amener `contact` au même niveau de structure que `comments`, **sans modifier la
logique métier** existante dans `src/`. Si un test révèle un bug réel dans `src/`, le
signaler au mainteneur plutôt que de le corriger silencieusement.

## Non-objectifs

- Aucune refonte ou refactor de `src/`.
- Pas de workflow CI GitHub Actions (comments n'en a pas — parité stricte).
- Pas d'envoi d'email (le plugin reste sans dépendance SMTP).

## Référence : ce que `comments` a en plus

| Élément | comments | contact (avant) |
| --- | --- | --- |
| `dev/` (env Payload sqlite) | ✅ | ❌ |
| `tests/` + `vitest.config.ts` | ✅ | ❌ |
| `docs/` (3 guides) | ✅ | ❌ |
| `.npmrc` | ✅ | ❌ |
| `pnpm-workspace.yaml` | ✅ | ❌ |
| `tsconfig.dev.json` | ✅ | ❌ |
| scripts `dev`/`test`/`test:watch` | ✅ | ❌ |

## Conception détaillée

### 1. Alignement de l'outillage

**`package.json`** — ajouter aux `scripts` existants :

```json
"dev": "payload dev",
"test": "vitest run",
"test:watch": "vitest"
```

Ajouter aux `devDependencies` :

```json
"@payloadcms/db-sqlite": "^3.0.0",
"vitest": "^2.1.0"
```

(`@payloadcms/next`, `payload`, `react`, `react-dom`, `typescript`, `rimraf`,
`@types/*` sont déjà présents.)

**`vitest.config.ts`** (copie conforme de comments) :
- environnement `node`
- `include: ['tests/**/*.test.ts']`
- `testTimeout` et `hookTimeout` à 60000
- exécution séquentielle (pas de parallélisme)

**`.npmrc`** : `approve-builds=false`

**`pnpm-workspace.yaml`** :
```yaml
onlyBuiltDependencies:
  - esbuild
  - sharp
```

**`tsconfig.dev.json`** : étend `tsconfig.json`, inclut `dev/` (et `tests/`) pour le
typecheck de l'environnement de dev sans polluer le build de distribution.

### 2. Environnement `dev/`

**`dev/payload.config.ts`** : config Payload minimale, sur le modèle de comments —
- adaptateur `@payloadcms/db-sqlite` pointant sur un fichier local (`dev/contact.db`,
  URI surchargeable par variable d'env), `push: true` (pas de migration en dev).
- collections : `Users` (auth admin).
- `plugins: [contactPlugin({ ... })]` avec quelques options de démo (ex.
  `requireSubject`, un `blockedKeyword`).
- `admin.user` = slug de `Users` ; génération de `payload-types.ts`.

**`dev/collections/Users.ts`** : collection auth minimale pour se connecter à l'admin
et consulter l'inbox + la vue *Contact Inbox*.

> Note : les composants admin du plugin référencent le chemin vendored
> `@/plugins/payload-contact/components/...`. L'env de dev sert surtout à exercer
> l'endpoint et la logique côté serveur ; si les vues admin nécessitent un import map,
> le documenter dans `docs/` plutôt que de complexifier `dev/`.

### 3. Documentation `docs/` (miroir de comments)

**`docs/configuration.md`** : toutes les options de `contactPlugin()` (tableau
options → type → défaut → effet), le global *Contact Settings* runtime (toggle,
min/max, requireSubject, blockedKeywords, successMessage), la sémantique fail-open,
et les variables d'env (`CONTACT_IP_SALT`, fallback `COMMENTS_IP_SALT`).

**`docs/frontend-integration.md`** : usage de `<ContactForm/>` (props
`successMessage`, `disabled`, `endpoint`, `className`), contrat de l'endpoint
`POST /api/contact-api/submit` (corps JSON, champ honeypot `company`, réponses),
thématisation via les variables CSS `--pc-*`, et lecture des settings publics via
`readPublicContactSettings`.

**`docs/inbox-and-triage.md`** (équivalent de `moderation.md`) : la collection inbox
`contact-messages`, les statuts `new` / `read` / `replied`, la vue admin
*Contact Inbox* (`/admin/contact-inbox`) et ses KPIs, le garde d'auth SSR
(`if (!req.user) return null`), et un exemple de notification email branchée via un
hook `afterChange` + un adaptateur email Payload.

### 4. Tests vitest — unitaires avec faux `payload`

Stratégie : tests rapides sans base de données. Un objet `payload` simulé fournit
`findGlobal` (résultat configurable) et `create` (espion). Pas de boot Payload, pas
de sqlite requis pour `vitest run`.

**`tests/helpers/fakePayload.ts`** : fabrique retournant `{ payload, createdDocs }`
où `findGlobal` renvoie une valeur paramétrable (ou lève une exception pour tester le
fail-open) et `create` enregistre les documents reçus.

**`tests/defaults.test.ts`** — `resolveOptions` :
- défauts appliqués (minLength 10, maxLength 5000, rateLimit `{60000,3}`, etc.)
- overrides respectés
- `ipSalt` : option > `CONTACT_IP_SALT` > `COMMENTS_IP_SALT` > défaut

**`tests/utils.rateLimit.test.ts`** :
- `createRateLimiter` : autorise jusqu'à `max`, bloque au-delà, ré-autorise après la
  fenêtre (fenêtre glissante).
- `hashIp` : déterministe, change avec le sel, priorité
  `x-forwarded-for` (1ère IP) → `x-real-ip` → `unknown`.

**`tests/services.submitContact.test.ts`** :
- honeypot rempli → `{ ok: true, dropped: true }`, aucun `create`
- settings `enabled: false` → `{ ok: false, status: 403 }`
- champs manquants → 400 ; email invalide → 400 ; message trop court → 400 ;
  `requireSubject` sans sujet → 400
- mot-clé bloqué présent → `{ ok: true, dropped: true }`, aucun `create`
- cas nominal → `create` appelé sur `messagesSlug` avec `status: 'new'` et données
  nettoyées, retourne `{ ok: true }`

**`tests/utils.getSettings.test.ts`** :
- `getContactSettings` : lit le global, applique les type-guards, parse les keywords
  (split sur `\n`/`,`, lowercase, filtrage), fail-open vers les options si `findGlobal`
  lève.
- `readPublicContactSettings` : renvoie les valeurs du global, défauts si absent/erreur.

### 5. Touches finales

- **README** : ajouter une section *Development* (`pnpm install`, `pnpm dev`) et
  *Testing* (`pnpm test`), et des liens vers les guides `docs/`.
- **CHANGELOG** : entrée décrivant l'ajout de l'env dev, des tests et de la doc.

## Critères de succès

1. `pnpm test` (ou `npm test`) passe avec une suite couvrant rate limit, defaults,
   submitContact (tous les chemins), et getSettings.
2. `pnpm dev` démarre un Payload sqlite avec le plugin enregistré.
3. `tsc -p tsconfig.json` (build de dist) reste vert et inchangé.
4. Les trois guides `docs/` existent et reflètent l'API réelle du plugin.
5. `src/` n'est pas modifié (hors signalement explicite d'un bug avéré).

## Risques / points ouverts

- La commande `payload dev` peut nécessiter un app Next selon la version ; si c'est le
  cas, aligner exactement sur la configuration de `dev/` de comments.
- Les vues admin vendored peuvent ne pas se résoudre dans `dev/` sans import map ;
  acceptable car l'objectif de `dev/` est d'exercer la logique serveur/endpoint.
