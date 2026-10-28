# Couche ludique : casse-briques 404, secrets, terminal, classement

Statut : spec de référence, avant implémentation. Inspirée de samuelrizzon.dev
(casse-briques de codes HTTP, liste « Secrets n/N »), sans le copier : palette,
secrets et mécanismes sont les nôtres, pas de mascotte en v1.

---

## 1. Périmètre

| Phase | Contenu | Dépôt |
|-------|---------|-------|
| 1 | Casse-briques sur la page 404, meilleur temps local | `portfolio/` |
| 2 | Système de secrets, bannière, liste, petits eggs, faux admin | `portfolio/` |
| 3 | Terminal en surimpression | `portfolio/` |
| 4 | Classement global par niveau | `back/` + `portfolio/` |

Hors v1 : mascotte, page d'admin des scores, anti-triche par rejeu, compteurs
de visites.

## 2. Le casse-briques

### 2.1 Niveaux

Une police de chiffres 3x5. Chaque pixel allumé donne une colonne de deux
briques, donc un code à trois chiffres (11 colonnes de police, espaces compris)
fait une grille de 11x10 briques.

| Ordre | Code | Particularité |
|-------|------|---------------|
| 1 | 404 | Briques simples |
| 2 | 500 | Les briques clignotent (opacité), elles restent solides |
| 3 | 403 | Une rangée d'acier incassable sous les chiffres, percée de deux trous |
| 4 | 429 | Chaque brique encaisse deux coups (bleu foncé puis cyan) |
| 5 | 418 | Les chiffres oscillent horizontalement (sinus, ±16 px, période 4 s) |

- Un niveau est gagné quand toutes les briques cassables ont disparu.
- Gagner un niveau débloque le suivant.
- La page 404 ouvre sur le plus haut niveau débloqué, et un sélecteur permet de
  rejouer les précédents.

### 2.2 Règles

Monde logique de 480x640, mis à l'échelle du conteneur (DPR compris).

**Raquette**
- 80 px de large, 120 px avec le bonus W.
- L'angle de rebond dépend du point d'impact : ±60° aux bords.

**Balle**
- Carré de 8 px.
- 300 px/s au départ, +2 % à chaque touche de raquette, plafond à 540 px/s.

**Moteur et partie**
- Pas fixe de 1/120 s, avec un accumulateur côté rendu et au plus 8 pas par
  frame, pour qu'un onglet en arrière-plan ne téléporte rien.
- 3 vies : on perd une vie quand la dernière balle sort par le bas.
- Le chrono démarre au premier lancement et s'arrête quand la dernière brique
  cassable tombe.

**Bonus** : 12 % de chance par brique cassée. Ils tombent à 120 px/s.

| Bonus | Effet |
|-------|-------|
| W | raquette large pendant 12 s |
| S | balle à 70 % de sa vitesse pendant 10 s |
| + | une vie de plus, 5 au maximum |
| M | deux balles de plus |

**Commandes**
- Clavier : flèches ou A/D, Espace pour lancer, P ou Échap pour la pause.
- Souris : la raquette suit le pointeur.
- Tactile : glisser pour bouger, toucher pour lancer.

**Pause automatique** quand l'onglet est masqué (`visibilitychange`).

**`prefers-reduced-motion`** : ni secousse ni particules. Les oscillations du
418 et le clignotement du 500 sont remplacés par un état fixe distinct
(contour), pour que le niveau reste lisible sans mouvement.

### 2.3 Architecture

- `lib/breakout/levels.ts` : la police et `levelFor(code)` (une grille de
  briques typée `normal | tough | steel`). Fonctions pures.
- `lib/breakout/engine.ts` : `createGame(level, seed)` et
  `step(state, input, dt)`.
  - Pur, sans DOM.
  - Le hasard (les bonus) passe par un PRNG seedé, pour qu'une partie soit
    rejouable plus tard (anti-triche par rejeu, hors v1).
- `lib/breakout/render.ts` : le dessin Canvas 2D.
- `components/breakout/Breakout.tsx` : composant client avec la boucle rAF, les
  entrées et le HUD (vies, chrono, meilleur temps).
- Palette :
  - fond `#0b1422`, cadre `#101d30`
  - briques `#56dcfc`, briques à deux coups `#197dff`
  - acier `#4a5d78`
  - texte `#e8eef7`

### 2.4 Routage

- `app/[locale]/not-found.tsx` : la page localisée, avec le jeu, un lien
  d'accueil et le sélecteur. Les textes viennent de `getTranslations('fun')` et
  sont passés en props.
- `app/[locale]/[...rest]/page.tsx` : appelle seulement `notFound()`. Sans lui,
  une URL inconnue sous `/fr/` ne passe pas par le not-found du segment.
- `app/not-found.tsx` (racine) : sert les chemins à point (`/.env`,
  `/wp-login.php`) que le proxy ne localise pas. Il a son propre
  `<html>`/`<body>`, le même jeu, un texte en français et un lien vers `/en`.

### 2.5 Stockage local

Toutes les lectures et écritures sont dans un try/catch (navigation privée,
stockage bloqué). Sans stockage, le jeu marche quand même, il ne retient
simplement rien.

| Clé | Valeur |
|-----|--------|
| `ninhache:breakout:best:<code>` | meilleur temps en ms |
| `ninhache:breakout:unlocked` | plus haut rang débloqué (1 à 5) |
| `ninhache:secrets` | tableau JSON des ids trouvés |
| `ninhache:fun:progress` | `{ locales, days }` : langues vues (2 max) et jours de visite (3 derniers), pour `polyglot` et `regular` |

Un fichier statique complète le stockage : `public/humans.txt`, qui porte le
quatrième chiffre du coffre (§ 3.2) et doit être changé à la main avec
`SAFE_CODE`.

## 3. Les secrets

### 3.1 Mécanique

- `lib/secrets/registry.ts` : la liste ordonnée des ids, chacun rangé dans un
  palier, et les constantes de réglage (speedrun, coffre, clics, jours, heure).
  Les textes sont dans `fun.secrets.items.<id>` : `name`, `description`,
  `hint` (vague) et `clue` (clair).
- `lib/secrets/progress.ts` : la progression partielle des secrets en
  plusieurs étapes (`polyglot`, `regular`, `teapot`), affichée « 2/3 » sur leur
  carte verrouillée.
- `lib/secrets/store.ts` :
  - `unlock(id)` est idempotent. Il écrit dans le stockage, puis émet
    `CustomEvent('ninhache:secret', { detail: { id, count } })` sur `window`.
  - `getFound()` lit la liste.
  - `onSecret(cb)` renvoie de quoi se désabonner.
  - Quand les 19 autres sont trouvés, `unlock` débloque aussi `completionist`.
  - Le détail porte aussi `tierDone` quand ce secret termine son palier.
- `components/fun/FunLayer.tsx` est monté une seule fois dans
  `app/[locale]/layout.tsx`, après `{children}`. Il porte son propre
  `NextIntlClientProvider`, limité à l'espace `fun`.
  - Une bannière « Trouvé : <nom> » reste 3,5 s, dans une région
    `aria-live="polite"`. Elle devient « <Palier> : terminé » quand un palier
    se ferme, et `completionist` lance la pluie de pixels.
  - Une boîte « Secrets n/20 » : barre de progression, puis un bloc par palier
    avec son décompte. Trouvé : nom et description. Manquant : « ??? » et
    l'indice, ou l'indice clair dès que tous les paliers précédents sont
    finis.
  - Les écouteurs globaux : Konami, mot tapé, raccourci du terminal, heure de
    visite.
  - Le style est en CSS module : la home n'a pas Tailwind. Les surimpressions
    passent par `createPortal(document.body)`.
- Ouverture de la boîte : un bouton « Secrets n/20 » dans les deux footers
  (`app/_components/footer.tsx` et `BlogFooter`). C'est un îlot client qui émet
  `ninhache:secrets-open`.
- Les frappes globales sont ignorées quand le focus est dans un `input`, un
  `textarea` ou un `contenteditable`.

### 3.2 Liste (20) et courbe

La liste est une courbe de difficulté, pas un catalogue. Trois paliers :

- **Échauffement** : gratuit ou presque. `curious` se débloque à l'ouverture
  de la liste, pour que le compteur ne lise jamais 0 (progression offerte).
- **Fouille** : il faut chercher, mais un seul geste suffit.
- **Obsession** : du temps, de l'adresse, plusieurs jours ou quatre cachettes.

Les leviers de complétion :

- le compteur n/20 toujours visible dans le footer, une barre de progression ;
- un décompte par palier, et une bannière quand un palier se ferme ;
- les indices d'un palier deviennent clairs quand les paliers d'avant sont
  finis : finir appelle à continuer ;
- la progression partielle (« 2/3 ») sur les cartes en plusieurs étapes ;
- le quasi-raté : un 404 fini entre 45 et 75 s affiche l'écart (« 3,12 s de
  trop. Il se passe quelque chose sous les 45. ») ;
- le coffre façon Mastermind : un mauvais code répond « n/4 à la bonne place » ;
- la récompense à 100 % : invite `root@ninhache:~#` dans le terminal, bouton
  du footer en cyan plein, pluie de pixels.

| Palier | id | Déclencheur |
|--------|----|-------------|
| Échauffement | `curious` | Ouvrir la liste des secrets |
| | `shell` | Ouvrir le terminal |
| | `lost` | Arriver sur une 404 |
| | `polyglot` | Voir le site dans les deux langues |
| Fouille | `breaker` | Finir le niveau 404 |
| | `poke` | Faire sauter la photo de l'accueil : 20 clics en moins de 5 s (voir 3.3) |
| | `konami` | Le code Konami |
| | `xyzzy` | Taper `xyzzy` hors d'un champ (indice : commentaire HTML du layout) |
| | `hired` | `ninhache.hire()` dans la console |
| | `honeypot` | Envoyer le faux formulaire de `/wp-admin` ou `/{locale}/admin` |
| | `root` | `sudo …` ou `rm -rf /` dans le terminal |
| | `red-pill` | `matrix`, `red pill` ou `follow the white rabbit` dans le terminal |
| Obsession | `teapot` | Finir le niveau 418, le cinquième |
| | `flawless` | Finir un niveau sans perdre de vie |
| | `speedrun` | Finir le niveau 404 en moins de 45 s |
| | `bookworm` | Lire un article jusqu'en bas, après un temps de lecture plausible (mots / 350 par minute, entre 20 s et 6 min) |
| | `regular` | Visiter le site trois jours différents |
| | `night-owl` | Être sur le site entre 0 h et 4 h 59, heure locale, pendant 4 s |
| | `safe` | Taper le code du coffre dans le terminal (`7319`, `unlock 7319` ou `code 7319`) |
| | `completionist` | Tous les autres |

**Le coffre.** `SAFE_CODE` a quatre chiffres, numérotés 1/4 à 4/4 là où ils se
cachent :

1. la console, dans la sortie de `ninhache.help()` ;
2. le terminal, dans `cat .env` (le fichier n'apparaît qu'avec `ls -a`) ;
3. l'écran « Raté. » du faux WordPress ;
4. `/humans.txt`.

### 3.3 La photo qui saute

La photo de l'accueil est un bouton : un clic passe au visage suivant
(`[photo principale, ...altImageUrls]`, en boucle ; sans photo alternative, le
front sert `/images/Photo-alt.webp`). Le spammer la fait court-circuiter.

- **Un débit, pas un total** (`lib/fun/overload.ts`) : seuls comptent les clics
  des 5 dernières secondes. 20 dans la fenêtre font sauter la photo ; un clic
  par seconde plafonne à 5 et peut durer indéfiniment.
- **Les paliers d'alerte** à 7, 12 et 16 clics dans la fenêtre : le badge passe
  orange puis rouge, l'image grésille, puis tout tremble. Les étincelles et les
  secousses grossissent avec le palier, et retombent quand on arrête.
- **Le court-circuit** : une demi-seconde de tremblement blanc, puis flash,
  débris et fumée sur un canvas trois fois plus grand que la photo
  (`lib/fun/blast.ts`, boucle active seulement tant qu'une particule vit). La
  photo cachée (`hiddenImageUrl`, à défaut la photo principale) sort de la
  fumée, nette, et `poke` se débloque une fois la fumée retombée.
- **Cassé jusqu'au rechargement** : plus de changement de visage, le badge pend,
  gris, et fume en continu ; toutes les 3,5 à 8 s la photo a encore 2 ou 3
  spasmes (secousse, image qui grésille, étincelles, bouffée de fumée sur le
  bord) ; un clic ne donne plus qu'un grésillement.
  Rien n'est stocké : recharger répare.
- **Mouvement réduit** : ni particules ni secousses, la photo cachée apparaît
  directement, le secret se débloque quand même.

Le back-office règle les visages dans **Profil** : photo principale, photos
alternatives ordonnées, photo cachée (`Profile.altImageUrls`,
`Profile.hiddenImageUrl` côté API).

### 3.4 Faux admin

- `app/[locale]/wp-admin/page.tsx` et `app/[locale]/admin/page.tsx`.
  - Le proxy redirige `/wp-admin` vers `/fr/wp-admin`.
  - `/admin` à la racine reste exclu du matcher et garde le vrai back-office,
    **qui n'est pas touché**.
- Formulaire de connexion façon WordPress, entièrement côté client. Rien n'est
  envoyé ni lu en dehors des deux champs.
- L'envoi affiche un écran « Raté. », le troisième chiffre du coffre, et
  débloque `honeypot`.
- `robots: { index: false }`.

## 4. Le terminal

- `components/fun/Terminal.tsx` : une surimpression ouverte par la touche `` ` ``
  ou par un bouton `>_` dans le footer.
  - Le focus est piégé, Échap ferme et rend le focus à l'élément d'origine.
  - Historique avec ↑ et ↓, complétion avec Tab.
- `lib/fun/commands.ts` : une fonction pure qui prend une ligne, la locale et le
  contexte, et rend des lignes de sortie et un effet éventuel (`open-secrets`,
  `navigate`, `matrix`, `clear`, `close`).

| Commande | Sortie |
|----------|--------|
| `help` | liste des commandes |
| `whoami` | visiteur, avec le nombre de secrets trouvés ; autre réponse une fois root |
| `ls`, `ls -a` | les fichiers visibles, puis `.env` et `.secrets` avec `-a` |
| `cat .env` | le deuxième chiffre du coffre et deux fausses variables |
| `1234`, `unlock 1234`, `code 1234` | tente le coffre : « n/4 à la bonne place », ou débloque `safe` |
| `cat about.txt` | présentation courte |
| `cat .secrets` | le décompte et le nom des secrets trouvés |
| `projects`, `socials` | liens vers les sections et les réseaux |
| `secrets` | ouvre la boîte |
| `play` | navigue vers `/{locale}/404` (le jeu) |
| `sudo …` | refusé, débloque `root` ; une fois root, une réponse dédiée |
| `rm -rf /` | fausse suppression animée, « je plaisante », débloque `root` |
| `matrix`, `red pill`, `follow the white rabbit` | ferme le terminal, pluie, débloque `red-pill` |
| `echo`, `date`, `clear`, `exit` | évident |
| autre | `commande introuvable : x` |

L'invite est `visiteur@ninhache:~$` (`guest@` en anglais), et
`root@ninhache:~#` une fois `completionist` trouvé. Les secrets débloqués
pendant que le terminal est ouvert s'impriment dans sa sortie (la bannière
passe sous la boîte modale).

Le terminal ne fait aucun appel réseau.

## 5. Le classement global

### 5.1 Identité

On réutilise le lecteur des commentaires (connexion Google, GitHub ou Discord,
nom public choisi, `isBanned`, `ReaderGuard`). Tout le monde peut jouer, mais
publier un temps demande d'être connecté comme pour commenter. Les noms, la
modération et le bannissement existent déjà.

### 5.2 Modèle

```prisma
model BreakoutScore {
  id        String   @id @default(cuid())
  code      Int
  timeMs    Int
  reader    Reader   @relation(fields: [readerId], references: [id], onDelete: Cascade)
  readerId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([readerId, code])
  @@index([code, timeMs])
}
```

On garde un seul temps par lecteur et par niveau : son meilleur. L'export RGPD
(`/reader/me/export`) inclut ses scores.

### 5.3 API (`back/src/breakout/`)

| Route | Garde | Entrée | Sortie |
|-------|-------|--------|--------|
| `POST /breakout/runs` | `@Public`, throttle | `{ code }` | `{ runToken }` (JWT `typ: 'breakout'`, `code`, `iat`, 1 h) |
| `POST /breakout/scores` | `@Public` + `ReaderGuard` + throttle | `{ runToken, timeMs }` | `{ best, rank }` |
| `GET /breakout/leaderboard?code=` | `@Public` | aucun | `{ entries: [{ displayName, avatarUrl, timeMs }], total }` (top 10) |

**Codes acceptés** : 404, 500, 403, 429, 418. Tout autre code est refusé avec
une 400.

**Contrôles de `POST /breakout/scores`** :
- Le jeton est valide, de type `breakout`, et son code correspond.
- La durée mesurée par le serveur est au moins `timeMs - 2 s` (un client ne peut
  pas déclarer un temps plus long que le temps réel écoulé, au jeu de latence
  près).
- `timeMs` est au moins `BREAKOUT_MIN_MS[code]`, réglé au playtest (8 s en
  provisoire), et au plus 1 h.
- Le lecteur a choisi son nom (`needsName` faux) et n'est pas banni.
- L'enregistrement est un upsert qui garde le minimum.

**Classement** : les lecteurs bannis ou sans nom en sont exclus. La réponse
n'est pas mise en cache, et rien ne passe par la revalidation ISR : le front lit
en client.

**Limite assumée** : ces contrôles arrêtent la triche paresseuse, pas une
triche déterminée. Il faudrait rejouer les entrées côté serveur avec le même
moteur, ce qui revient à partager `engine.ts` entre deux dépôts. On le reporte.

### 5.4 Front

- `lib/breakout/api.ts`, avec `credentials: 'include'` comme
  `lib/reader/reader.api.ts`. Les types copient les DTO du back.
- Au premier lancement, le jeu demande un `runToken`. En cas d'échec il joue
  quand même, sans pouvoir publier.
- Après une victoire :
  - lecteur connecté avec un nom : bouton « Publier mon temps » ;
  - sinon : « Se connecter pour publier » via `loginUrl`, qui ramène à la 404.
- À côté du jeu, le top 10 du niveau en cours et le meilleur temps du lecteur.

## 6. Confidentialité

`content/legal/confidentialite.{fr,en}.mdx` est mis à jour dans les mêmes
commits que ce qui stocke :

- les clés locales (secrets, progression, meilleurs temps) : elles restent sur l'appareil,
  ne sont jamais envoyées, et s'effacent avec les données du site ;
- les scores publiés : liés au compte lecteur, affichés sous le nom choisi,
  supprimés avec le compte et présents dans l'export.

Aucun nouveau cookie, donc toujours pas de bandeau de consentement.

## 7. Vérification

- Front :
  - `npm run lint` et `npx tsc --noEmit`.
  - Captures avec chromium headless (CDP par pipe) sur `/fr/nope`, `/en/nope`,
    `/.env`, `/wp-admin` et `/fr/admin`, à 360 et 1440 px, avec et sans
    reduced-motion.
  - Le vrai `/admin/login` doit rester inchangé.
- Jeu, piloté par des événements clavier CDP : on vérifie la victoire, le
  meilleur temps enregistré, et `lost` et `breaker` débloqués.
- Eggs :
  - Konami et `xyzzy` par des frappes CDP ;
  - `ninhache.hire()` par `Runtime.evaluate` ;
  - `night-owl` avec une horloge simulée ;
  - toutes les commandes du terminal.
- Back :
  - `yarn test` (nouveau `breakout.service.spec.ts`) et `yarn lint`.
  - Migration en local.
  - Parcours curl : jeton, refus (trop rapide, mauvais jeton, mauvais code),
    acceptation, classement.
- La publication d'un temps en étant connecté demande une vraie session
  lecteur dans un navigateur : c'est l'utilisateur qui la teste.
