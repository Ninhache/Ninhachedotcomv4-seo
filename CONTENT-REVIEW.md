# Revue de contenu — portfolio public (audit du 2026-06-11, passe éditoriale du 2026-06-12)

Audit des données live du back telles que **rendues par le site public**, à
travers `lib/mappers.ts`. Mise à jour 2026-06-12 : passe éditoriale complète
appliquée en base (règle : description entreprise = la boîte, contexte mission
= le projet, tâches = le travail réalisé). Snapshot `prisma/snapshot.json`
régénéré (`yarn db:dump`) — à committer côté back pour promouvoir en prod.

## ✅ Résolu le 2026-06-12

- [x] **Fiches client** (Playard, LP Solutions, Cocoricorando, Mouv'Aps) :
      fond + localisation + description FR (toi) et traductions EN (passe).
- [x] **Descriptions employeurs réécrites** : BetterCallDave, ILL et PIT
      décrivent maintenant l'entreprise (le « j'ai effectué deux stages... »
      est parti dans les missions). La BCD masquée (split timeline) a aussi
      ses traductions FR/EN.
- [x] **Mission BCD 2022** recentrée sur OpenProcess / Le Fresnoy ;
      **mission BCD 2023** (placeholder « Migration digster ») remplacée par
      un vrai contenu Digster / React Native, FR + EN.
- [x] **Teaser ILL** (« contrat bref, contactez-moi ») déplacé de la
      description entreprise vers le contexte de la mission.
- [x] **Contextes FR manquants** (Playard, Mouv'Aps) rédigés ; **EN courts**
      (LP Solutions, Cocoricorando) alignés sur le FR ; tâches Cocoricorando
      FR = travail réalisé (les features de l'app sont dans le contexte).
- [x] **Formations** : les 4 descriptions « à remplir » rédigées FR/EN,
      degrees EN traduits, coquille « Cyclé Ingénieur » corrigée.
- [x] **Profil** : âge géré par l'alias `@@age` (date de naissance corrigée
      au 2002-06-27 en base + `seed-aliases.ts`), « étudiant de 23 ans »
      harmonisé, « more informations » corrigé.

## ✅ Résolu le 2026-06-15

- [x] **Mission LP Solutions** recadrée en « participation » (conception de la
      connexion à Boond + maintenance évolutive/corrective), 3 tâches FR/EN.
- [x] **Bloc client des missions BCD** : Le Fresnoy et Universal Music créés
      comme entreprises CLIENT rattachées à BetterCallDave (parents : BCD
      visible pour OpenProcess, BCD masquée pour Digster), missions reliées,
      descriptions FR/EN rédigées. Le bloc à bordure grise (`.clientDesc`)
      s'affiche désormais sur les deux missions, comme pour LP Solutions.
      Contextes OpenProcess/Digster allégés (l'identité de la boîte vit
      maintenant dans le bloc client).
- [x] **Point A résolu** (cf. plus bas) : fallback illustration ET lieu du
      mapper corrigés. Une mission client sans fond/ville retombe sur ceux de
      l'employeur (les missions BCD gardent l'illustration et « Lille »).

## Reste à faire

### CV
- [ ] Dernier upload : **2026-03-05**. Vérifier qu'il reflète le poste
      « Ingénieur Alternant Full-Stack & DevOps » et les missions récentes
      (Playard nov-déc 2025…)

### Optionnel
- [ ] BetterCallDave et Institut Laue-Langevin n'ont aucune **position**
      (progression de titres) → la ligne « type · poste » de la carte
      n'affiche que le type de contrat (PIT en a 3 ✓)
- [ ] Projets sans image : HaskellHorrors, Star-Realms-HpCounter (à masquer
      ou compléter), Nin-tcha / NinAnimate / NeoSnake (vidéo seule)
- [ ] Galerie (Phase 3 du système d'assets) : prévoir plusieurs images par
      projet quand elle arrivera

## ⚙️ Observations code

### A. `lib/mappers.ts` → `toMissionView` : fallback illustration + lieu — RÉSOLU le 2026-06-15
Le `?? ''` est devenu `|| (owner.X ?? '')` pour l'illustration **et** le lieu :
une mission client sans fond/ville retombe maintenant sur ceux de l'employeur,
conformément à l'intention des commentaires. C'est ce qui permet aux missions
BCD (clients Le Fresnoy/Universal sans fond ni ville) de garder leur
illustration et d'afficher « Lille ». Aucun impact sur les clients existants
(tous ont déjà fond + ville).

### B. Timezone dans les formateurs de dates
`formatDate` (`getMonth()` local) et `formatTimelineRange`
(`toLocaleDateString('en-US')` sans `timeZone`) sur des dates stockées à
minuit Paris (`…T22:00:00Z`) : sur un serveur en **UTC**, les dates affichées
reculent d'un mois. À blinder (formatage explicite Europe/Paris).

---

*Corrections faites en SQL direct (hors admin) : la revalidation par tags n'a
pas été déclenchée — en dev le front re-fetch normalement ; en prod, passer
par `yarn db:restore` puis toucher les contenus ou attendre l'ISR. Ce fichier
peut être supprimé quand tout est coché.*
