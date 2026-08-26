# Score SEO des articles

Statut : spec de référence. Décrit la méthode telle qu'implémentée par
`lib/seo/terms.mjs`, `lib/seo/serp.mjs`, `scripts/serp-terms.mjs` et le panneau
`components/articles/seo-score-panel.tsx`.

Ce document est aussi la cible du lien « méthode complète » affiché dans le
back-office. Il est écrit pour être relu dans six mois, pas seulement pour
valider une étape.

---

## 1. Le problème

Un outil comme yourtext.guru rend une liste de mots et un score, sans dire d'où
les mots viennent. On ne peut ni les discuter, ni les reproduire, ni savoir si
l'outil a raison. Le besoin réel : pendant la rédaction, savoir quels mots la
concurrence emploie sur la requête visée, et à quelle dose.

## 2. Ce que le score n'est pas

À lire avant tout le reste, parce que c'est le seul point sur lequel se tromper
coûte cher.

**Le score n'est pas une estimation de trafic, ni de position.** Personne ne sait
les calculer depuis l'extérieur : ni le volume de recherche réel, ni le
classement futur, ni le taux de clic. Un outil qui prétend le contraire vend une
extrapolation.

Ce que la colonne **poids** mesure est le **poids discriminant d'un terme dans le
corpus** : sa couverture (combien de pages classées l'emploient) multipliée par
sa densité médiane. Un mot lourd est un mot que presque tous les concurrents
emploient, et densément. Rien de plus, mais rien de moins : c'est exactement le
signal sur lequel un rédacteur peut agir.

**Le choix de la requête décide de tout.** Mesure faite sur ce dépôt :

| Requête | Corpus obtenu | Rang de `livraison` |
|---|---|---|
| `fleurs toussaint` | marchand : `panier`, `bouquet`, `fleuristes`, `compositions` | 3e |
| `quelles fleurs planter pour la toussaint` | éditorial : `plantation`, `entretien`, `vivace`, `cyclamen` | 20e |

Même algorithme, même article, briefs incomparables. Un brief est indissociable
de sa requête, ce qui est la raison pour laquelle la requête est stockée à côté
de lui.

## 3. Architecture en deux temps

C'est ce découpage qui rend un panneau temps réel possible sans brûler le quota
d'API.

| Temps | Quand | Coût |
|---|---|---|
| **Brief** | une fois par article et par locale, à la demande | 1 requête Brave (sur 2000/mois) + ~40 pages téléchargées, ~20 s |
| **Score** | à chaque frappe | tokenisation locale, aucun réseau |

Le brief est un objet JSON autonome. Une fois généré et enregistré, la notation
fonctionne hors ligne.

## 4. Construction du brief

### 4.1 Le corpus

1. **SERP.** Brave Search API, marché `fr` (`country=fr`, `search_lang=fr`,
   `ui_lang=fr-FR`), paginée par tranches de 20 (`offset` 0 à 9) jusqu'à
   `DEFAULT_TOP = 60` résultats, dédupliqués par URL.

   Pourquoi demander 60 pour en garder ~35 : sur une requête même légèrement
   commerciale, la moitié des résultats sont des fiches produit rendues en
   JavaScript, sans prose côté serveur. Elles se font écarter à l'étape suivante.
   Demander large est le prix à payer pour que le vocabulaire éditorial ne soit
   pas noyé par le vocabulaire marchand.

2. **Téléchargement.** 5 pages en parallèle, 12 s de délai maximal, User-Agent
   identifiant (`ninhache-seo-brief/1.0 (+https://ninhache.fr)`).

   **Le corps est décodé selon le charset déclaré, pas en UTF-8 d'office.**
   `Response.text()` de la norme WHATWG décode toujours en UTF-8 et ignore
   l'en-tête `content-type` : sur une page servie en ISO-8859-1, chaque
   caractère accentué devient un octet invalide et coupe le mot en deux. On lit
   donc l'`arrayBuffer`, on prend le charset de l'en-tête, à défaut celui d'un
   `<meta charset>` reniflé sur les deux premiers kilooctets (ces balises sont en
   ASCII et en tête de document), et on décode avec `TextDecoder`, repli `utf-8`
   si l'étiquette lui est inconnue.

   Mesuré sur le corpus `postgresql cube gist plus proche voisin`, que
   `developpez.net` sert en ISO-8859-1 : les fantômes `donn` (10 pages), `tre`
   (12), `probl` (7) et `crit` figuraient au brief avec un poids réel. Après
   correction ils ont disparu, et `donnees` est passé de 45 à 47 pages.

3. **Extraction du texte.** Trois passes de nettoyage, puis on prend
   `<article>`, sinon `<main>`, sinon `<body>` :

   - les balises non textuelles (`script`, `style`) et le chrome **sémantique**
     (`nav`, `footer`, `header`, `aside`) ;
   - le chrome **non sémantique**, désigné par sous-chaîne de classe ou
     d'identifiant (`nav`, `menu`, `sidebar`, `breadcrumb`, `footer`, `header`,
     `signature`, `pagination`, `popup`, `toolbar`, `userinfo`, `postbit`).
     Indispensable sur les forums, qui n'ont ni `<article>` ni `<main>` et
     placent leur navigation dans des `<div>` nus : le périmètre retombe alors
     sur `<body>` et `inscription`, `membre`, `messages` sont comptés comme du
     contenu ;
   - les listes de liens (un bloc d'au moins 60 caractères dont 80 % du texte
     est du texte de lien) et les blocs répétés à l'identique au moins trois
     fois dans la page.

   > **Piège recensé, corrigé, à ne jamais réintroduire.** `cheerio.text()`
   > concatène les éléments adjacents **sans séparateur** :
   > `<td>jusqu'à</td><th>Entretien</th>` devient `jusqu'àEntretien`, un token
   > fantôme qui fait disparaître deux mots réels du comptage. Le correctif est
   > une frontière explicite avant l'aplatissement :
   >
   > ```js
   > scope.find('*').each((_, el) => $(el).after(' '));
   > ```
   >
   > Le coût est de couper parfois un mot enveloppé dans un `<em>`. Sans commune
   > mesure avec le fait de souder toutes les cellules d'un tableau. Ce bug avait
   > silencieusement faussé les densités des 31 pages d'un corpus entier.

   > **Second piège recensé, corrigé, à ne jamais réintroduire.** Une
   > correspondance en sous-chaîne de classe matche le `<body>` lui-même :
   > WordPress y pose ses descripteurs de gabarit
   > (`wp-singular post-template-default no-sidebar footer-…`) et beaucoup de
   > thèmes font de même (`html_boxed html_header_top av-preloader-disabled`).
   > Sans plafond, la suppression du chrome emporte donc le document entier.
   > Mesuré sur les 37 pages du corpus toussaint gelées sur disque : la seule
   > passe de classes faisait **tomber 12 pages à zéro mot utile** et coûtait
   > 34 % du texte ; les trois passes cumulées ramenaient le corpus à 59 % de son
   > volume.
   >
   > Le garde-fou est `CHROME_MAX_SHARE = 0,30` : un bloc qui porte plus du tiers
   > du texte de la page n'est pas une barre de navigation, quel que soit le nom
   > de sa classe. S'y ajoute la règle qu'un nœud contenant un `article` ou un
   > `main` n'est jamais retiré. Après garde-fou, le même corpus conserve **92 %**
   > de son texte et **aucune page n'est vidée**.

4. **Rejet.** Une page de moins de `MIN_DOC_WORDS = 250` mots utiles est une
   fiche produit ou un mur de cookies. Elle sort du corpus.

   **Aucun rejet n'est silencieux** : le nombre de pages écartées et le motif
   (403, 404, page trop maigre, échec réseau) sont toujours rapportés. Un corpus
   tronqué sans le dire se lit comme un corpus complet, et c'est ainsi qu'on
   conclut faux.

5. **Dédoublonnage.** Similarité cosinus entre les vecteurs d'occurrences, seuil
   `DUPLICATE_SIMILARITY = 0,95`. On parcourt les pages **de la plus longue à la
   plus courte** et on garde le premier représentant de chaque groupe, ce qui
   retient la version la plus complète d'une page miroitée. `corpus.kept` est le
   nombre de pages distinctes, `corpus.duplicates` dit lesquelles ont été
   écartées et au profit de qui.

   **Pourquoi c'est indispensable, et pas un raffinement.** Sur
   `postgresql cube gist plus proche voisin`, le corpus comptait 79 documents
   pour 36 pages réelles : `cube.html` du manuel PostgreSQL y figurait **18
   fois**, miroité sur trois domaines en une dizaine de versions, et
   `earthdistance.html` douze fois. Or `coverage` vaut `nDocs / pages` et le
   plancher de rétention est à 0,20 : une page comptée 18 fois sur 79 vaut 22,8 %
   à elle seule, donc **tout mot figurant sur cette seule page devenait un terme
   pondéré du brief**. C'est ainsi que `latitude` et `longitude` se sont
   retrouvés au brief d'un article sur la recherche de couleur. L'étalon (§6.1.1)
   était faussé de la même manière : son `best` n'était pas un concurrent, c'était
   le manuel de référence compté dix-huit fois.

   Le phénomène est **concentré sur les sujets techniques**, c'est-à-dire
   exactement ceux où l'on croit la concurrence faible : 42 % de doublons sur la
   requête ci-dessus, 18 % sur `reverse DSL tooltips`, 0 à 7 % sur les corpus
   grand public.

   **L'appel se fait dans `buildBrief`, pas dans `fetchCorpus`** : le CLI en mode
   `--corpus <cache>` court-circuite la collecte et appelle `buildBrief`
   directement. C'est le seul point que tous les chemins traversent, la même
   règle que pour le tokeniseur (§5). C'est aussi ce qui rend la régénération
   gratuite : les corpus déjà en cache gardent leurs doublons sur le disque et
   sont assainis au moment du brief, sans un appel Brave.

   Le seuil 0,95 a été choisi par balayage : 0,90 et 0,85 fusionnent des pages
   réellement distinctes. À 0,95, chaque fusion vérifiée à la main est bien la
   même page dans une autre version ou sur un miroir, et les versions FR et EN
   d'une même page de manuel restent **séparées**, ce qui est le choix prudent.

### 4.2 Les densités

Pour chaque page retenue, on tokenise (voir §5) et on compte. La densité d'un
terme dans une page est `occurrences / mots utiles × 100`.

Pour chaque terme du corpus on retient :

- `nDocs` : dans combien de pages il apparaît ;
- `coverage` : `nDocs / pages **distinctes**` (`corpus.kept`, voir §4.1.5) ;
- `q1`, `median`, `q3` : les quartiles de sa densité **parmi les seules pages qui
  l'emploient**.

> **Pourquoi exclure les zéros.** Inclure les pages où le terme est absent
> écraserait Q1 à zéro dès qu'un terme manque à un quart du corpus. La borne
> basse deviendrait « au moins rien », donc inutilisable. La fenêtre répond à la
> question « quand on emploie ce mot, à quelle dose », pas « quelle est la dose
> moyenne du web ».

### 4.3 Rétention et paliers

| Seuil | Valeur | Effet |
|---|---|---|
| `MIN_DOC_RATIO` | 0,20 | plancher de rétention : en dessous, le terme vient d'une ou deux pages et ne dit rien de la SERP |
| `RECOMMENDED_DOC_RATIO` | 0,35 | palier `recommandé` |
| `MANDATORY_DOC_RATIO` | 0,70 | palier `obligatoire` |

Le plancher de rétention est **volontairement distinct** du seuil `recommandé`,
et bas. Les mots qui font la différence dans un texte, les espèces citées, le
vocabulaire de métier, ne sont presque jamais dans 35 % des pages : ils sont dans
25 %. Les couper les rendrait invisibles, ce qui est exactement le défaut
reproché à l'outil qu'on remplace.

Le plancher porte sur les pages **distinctes** : c'est tout l'objet du
dédoublonnage (§4.1.5), sans quoi une seule page miroitée peut franchir le
plancher à elle seule et imposer son vocabulaire au brief.

Contrôle empirique du réglage, sur `quelles fleurs planter pour la toussaint`
(58 résultats SERP, 37 pages retenues, 21 écartées : 403 ×5, trop maigres ×12,
404 ×3, échec réseau ×1, puis 1 doublon écarté, soit **36 pages distinctes**) :

- **28 des 35 mots** de yourtext.guru ressortent du brief ;
- les 7 absents (`pour` qui est un mot vide ici, `personne` 5/36, `aster` 3/36,
  `incontournables` 3/36, `dahlias` 3/36, `guide` 6/36, `graminées` 2/36) sont
  **tous présents dans le corpus**, simplement sous le plancher ;
- deux termes forts que yourtext n'avait pas donnés apparaissent : `cyclamen`
  (24 pages sur 36, 79 occurrences) et `pensées` (17 sur 36, 49).

Autrement dit la liste concurrente est reconstructible, et l'écart résiduel est
un choix de seuil, pas une différence de méthode.

### 4.4 Le poids

```
rawWeight = coverage × median
weight    = round(rawWeight / max(rawWeight) × 100)
```

Le croisement est délibéré : un terme n'est fort que s'il est **à la fois**
répandu et employé densément. Un mot présent partout mais une seule fois par page
est du bruit ; un mot très dense dans une page isolée est une lubie d'auteur. La
normalisation sur 100 sert la lisibilité, elle ne change aucun classement.

## 5. Le tokeniseur, point de vérité unique

`tokenize()` dans `lib/seo/terms.mjs` est **la seule** fonction qui décide de ce
qui compte comme mot. Les densités du brief et celles de l'article en sortent
toutes les deux ; c'est ce qui garantit qu'on ne compare pas deux échelles.

```
apostrophes typographiques -> '
NFKD, suppression des diacritiques, minuscules
match /[a-z0-9]+/g
rejet : longueur < 3, mot vide, purement numérique
```

Deux propriétés à ne pas casser :

- **Pas de lemmatisation.** `rose`/`roses`, `fleur`/`fleurs`, `plante`/`plantes`
  restent des entrées distinctes. yourtext fait de même, et la fusion masquerait
  qu'un texte emploie dix fois le singulier et jamais le pluriel.
- **La liste couvre les deux langues.** Elle est d'abord francophone, mais les
  mots-outils anglais y figurent aussi (`you can but will what when how why use
  used using not your have from there their them than these those only such very
  where which was were been being while about after before between both`…).
  Sans eux, un corpus technique majoritairement anglophone consacre une part
  notable de son poids à des mots vides : 10 % du poids du brief sur l'article
  rasterizer. Conséquence assumée : les briefs **anglais** perdent aussi ces
  mots, ce qui est le comportement correct.
- **Les mots vides sont retirés du dénominateur.** Le `words` de ce module compte
  donc les **mots utiles**, pas les mots. C'est un dénominateur différent de
  celui de `scripts/geo-audit.mjs` (`words()`, qui compte tout et sert à la
  parité FR/EN et au ratio rendu/Markdown). Les deux cohabitent parce qu'ils
  mesurent deux choses ; ce qui compte est que brief et score partagent le même.

## 6. Notation d'un texte

Chaque terme du brief tombe dans une bande :

| Bande | Condition | Lecture |
|---|---|---|
| `manquant` | 0 occurrence | le mot n'est pas dans le texte |
| `sous-utilisé` | densité < `q1` | employé, mais sous la dose du quartile bas |
| `ok` | `q1` ≤ densité ≤ `q3` | dans la fenêtre de la moitié centrale des concurrents |
| `sur-optimisé` | densité > `q3` | au-dessus du quartile haut : c'est ce qui fait grimper un SOSEO |

### 6.1 Le score affiché

```
score = 100 × ( Σ poids(ok) + 0,5 × Σ poids(sur-optimisé) ) / Σ poids(tous)
```

Un terme sur-optimisé compte à moitié : il est couvert, mais mal dosé, et le
signaler à zéro reviendrait à traiter « trop » comme « absent ». Un terme
manquant ou sous-utilisé compte zéro.

### 6.1.1 La lettre est relative au corpus, pas absolue

> **Écart assumé à la première version de cette spec**, qui reprenait le barème
> absolu de `scripts/geo-audit.mjs` (A ≥ 90). La vérification l'a invalidé.

**100 est hors d'atteinte par construction.** La fenêtre visée d'un terme est
l'intervalle interquartile de ses densités : la moitié du corpus en est dehors
sur chaque terme. Aucune page ne peut donc tenir dans la fenêtre de tous les
termes à la fois. Mesuré sur « quelles fleurs planter pour la toussaint », les
36 pages distinctes qui rankent obtiennent :

| pire | Q1 | médiane | Q3 | meilleure |
|---|---|---|---|---|
| 15 | 29 | 35 | 41 | **50** |

La page la mieux classée du web sur cette requête vaut 50/100. Un barème absolu
rendait donc `F` à toutes les pages existantes, y compris aux meilleures : une
note qui ne varie jamais n'informe pas.

`buildBrief` calcule donc cette distribution **au moment du brief**, avec les
comptages qu'il vient de faire et sans un octet de réseau supplémentaire, sur les
seules pages **distinctes** (§4.1.5), et la range dans `brief.benchmark`. La lettre se lit contre elle :

| A | B | C | D | F |
|---|---|---|---|---|
| ≥ meilleure | ≥ Q3 | ≥ médiane | ≥ Q1 | < Q1 |

Autrement dit : `A` = tu fais mieux que toutes les pages qui rankent, `C` = tu
es dans la moitié haute. Le nombre sur 100 reste affiché, mais **jamais seul** :
la médiane et la meilleure des concurrentes l'accompagnent partout, en tête du
panneau comme en sortie de CLI.

Un brief généré avant l'introduction de l'étalon n'en a pas et retombe sur le
barème absolu, faute de mieux. Le regénérer suffit à corriger sa lettre.

C'est aussi ce qui impose que `buildBrief` et `scoreText` partagent une seule
arithmétique (`scoreCounts`) : un étalon calculé autrement que la note qu'il
étalonne ne voudrait rien dire.

Deux compteurs secondaires accompagnent le score : **couverture** (part du poids
total qui n'est pas `manquant`) et **sur-optimisation** (part du poids en
`sur-optimisé`).

### 6.2 Ce qui est mesuré, exactement

Deux règles issues de mesures ratées, à respecter dans toute nouvelle surface de
notation.

1. **Le rendu, pas la source.** Compter dans le MDX gonfle les chiffres : les
   URLs contiennent des mots-clés, et les noms de composants aussi. Le texte
   noté est le rendu compilé, dont on lit le `textContent`.
2. **Pas de sommaire.** Sur la page publique, le sommaire est un `<aside>` frère
   de `<article id="blog-article">`. Le mesurer doublerait le poids de chaque
   titre. La notation porte sur l'article seul. Le `h1` de l'article, lui, compte :
   il est dans `<article>`.

## 7. Où vit le brief

Sur `ArticleTranslation`, pas sur `Article` : une requête cible FR et une EN
n'ont ni le même corpus ni les mêmes densités.

```prisma
seoQuery  String?   // « quelles fleurs planter pour la toussaint »
seoBrief  Json?     // l'objet décrit en §4
```

Ces deux champs sont **retirés des lectures publiques**, au même titre que
`previewToken`. Un brief pèse plusieurs kilooctets et n'a aucun usage sur le site
public ; le laisser sortir alourdirait chaque page ISR pour rien.

Forme du JSON :

```jsonc
{
  "query": "quelles fleurs planter pour la toussaint",
  "generatedAt": "2026-08-25T09:12:00.000Z",
  "corpus": {
    "requested": 37,          // pages aspirées et exploitables, doublons compris
    "kept": 36,               // pages distinctes : le vrai nombre de concurrents
    "duplicates": [{ "url": "https://…/toussaint-fleurs-dautomne-et-chrysantheme/",
                     "sameAs": "https://…/toussaint-fleurs-et-chrysantheme/" }],
    "urls": ["https://…"]
  },
  "thresholds": { "MANDATORY_DOC_RATIO": 0.7, "…": 0 },
  "terms": [
    { "term": "chrysantheme", "nDocs": 30, "coverage": 0.83,
      "q1": 0.44, "median": 0.64, "q3": 1.17,
      "rawWeight": 0.53, "weight": 20, "tier": "obligatoire" }
  ]
}
```

`kept` et `duplicates` sont **optionnels à la lecture** : les briefs enregistrés
avant le dédoublonnage ne les portent pas, et tout lecteur doit retomber sur
`requested`. Ce n'est pas une facilité, c'est ce qui évite qu'un vieux brief
affiche « 0 page ».

## 8. Surfaces

| Surface | Fichier | Rôle |
|---|---|---|
| Noyau | `lib/seo/terms.mjs` (+ `terms.d.mts`) | `tokenize`, `scoreCounts`, `scoreText`, `dedupeDocs`, `buildBrief`, `STOPWORDS`. Pur, sans réseau, isomorphe. |
| Collecte | `lib/seo/serp.mjs` | SERP, téléchargement, décodage, extraction du texte. Serveur uniquement. |
| CLI | `scripts/serp-terms.mjs` | `npm run seo:terms`, mise au point et audit hors interface. |
| Génération | `app/api/seo/brief/route.ts` | POST authentifié par session. La clé Brave reste côté serveur. |
| Panneau | `components/articles/seo-score-panel.tsx` | Replié : le score. Déplié : la requête, les termes, l'explication. |

Le format `.mjs` du noyau n'est pas un caprice : le CLI tourne sous `node` nu et
l'application sous Turbopack. C'est le seul format que les deux consomment sans
outillage supplémentaire. Le `.d.mts` voisin donne les types à TypeScript.

`cheerio` est une **dépendance de production** et non de développement : le
`dockerfile` du runner fait `npm install --production`, donc une route qui
importe une devDependency marche en local et échoue en ligne.

## 9. Critères d'acceptation

- [ ] `npm run seo:terms -- --corpus corpus-toussaint.json` retrouve les chiffres
      de référence, hors ligne et à l'identique : **37 pages exploitables, 36
      distinctes** (1 doublon, les deux articles `plusdefleurs.com` sur le
      chrysanthème), 323 termes retenus, `toussaint` sur 35 pages pour une
      fenêtre 1,55-3,21 %, `chrysanthème` sur 30 pages pour 0,44-1,17 %, étalon
      `15 / 29 / 35 / 41 / 50`.
- [ ] Sur ce même corpus rechargé depuis le web, le nombre de mots utiles par
      page ne s'effondre **pas** : c'est le contrôle inverse du nettoyage de
      chrome (§4.1.3). Repère mesuré sur les pages gelées : 92 % du texte
      conservé, aucune page vidée.
- [ ] Le même corps d'article noté par le CLI et par le panneau donne le **même**
      nombre de mots utiles et les mêmes densités. Si ces deux chiffres divergent,
      l'outil ne vaut rien.
- [ ] `seoQuery` et `seoBrief` sont absents des réponses publiques.
- [ ] Le panneau replié affiche le score sans action de l'utilisateur.
- [ ] Taper dans le corps fait bouger la densité affichée d'un terme.
- [ ] Le brief survit à un enregistrement et à un rechargement de page.
- [ ] Le panneau énonce qu'il ne mesure ni trafic ni position.

## 10. Limites assumées

- **Une requête par locale et par article.** Un article qui vise sérieusement
  deux requêtes distinctes n'est pas modélisable ici. C'est un choix : le cas est
  rare, et le supporter ferait entrer une liste là où un champ suffit.
- **Le corpus est daté.** Un brief de six mois décrit la SERP d'il y a six mois.
  La date de génération est affichée pour cette raison ; il n'y a pas de
  péremption automatique.
- **Le seuil de rétention est un réglage, pas une vérité.** Il a été calibré sur
  un seul jeu de comparaison (35 mots, une requête). Le déplacer change la liste.
- **Aucune analyse sémantique.** Les quelques mots que yourtext ajoute sans les
  compter (`aster`, `graminées`, `incontournables`) viennent vraisemblablement
  d'un modèle, pas d'un décompte. Cet outil ne les inventera pas.
