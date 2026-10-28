/**
 * Noyau du brief lexical : tokenisation, agregation et notation.
 *
 * Ce module est **pur et isomorphe** : aucun acces reseau, aucune API Node. Il
 * tourne a l'identique dans le script CLI (`scripts/serp-terms.mjs`), dans la
 * route de generation (`app/api/seo/brief/route.ts`) et dans le navigateur, ou
 * le panneau de l'editeur le rappelle a chaque frappe.
 *
 * C'est cette propriete qui rend le panneau temps reel possible : la seule etape
 * couteuse (aspirer la SERP, voir `./serp.mjs`) se fait une fois par article ; la
 * notation, elle, ne coute qu'une tokenisation.
 *
 * Format `.mjs` et non `.ts` a dessein : le CLI tourne sous `node` nu, l'appli
 * sous Turbopack, et c'est le seul format que les deux consomment sans
 * outillage supplementaire. Les types vivent dans `terms.d.mts`.
 *
 * Methode complete : `docs/specs/seo-score.md`.
 */

/** En dessous, la page est une fiche produit ou un mur de cookies : inexploitable. */
export const MIN_DOC_WORDS = 250;
/** Part des documents qui doit employer un terme pour le juger incontournable. */
export const MANDATORY_DOC_RATIO = 0.7;
/** Au-dessus, le terme est attendu sans etre obligatoire. */
export const RECOMMENDED_DOC_RATIO = 0.35;
/**
 * Plancher de retention.
 *
 * En dessous, le terme vient d'une ou deux pages et ne dit rien de la SERP. Le
 * plancher est volontairement bas et distinct du seuil « recommande » : les mots
 * qui font la difference dans un texte (les especes citees, le vocabulaire de
 * metier) ne sont presque jamais dans 35% des pages, ils sont dans 25%, et les
 * couper les rendrait invisibles.
 */
export const MIN_DOC_RATIO = 0.2;
/** Un terme plus court est presque toujours un mot-outil echappe aux stop-words. */
export const MIN_TERM_LENGTH = 3;

/**
 * Longueur d'un brief : on ne garde que les termes les plus lourds.
 *
 * Sans plafond, la longueur du brief depend de la taille du corpus, et deux
 * articles cessent d'etre comparables : dix pages aspirees donnent sept cents
 * termes la ou quarante-cinq pages en donnent soixante, et la note s'effondre
 * mecaniquement sur le premier. Le coupable est un biais d'auto-inclusion :
 * l'etalon est calcule sur les pages qui ont produit le brief, donc chaque
 * concurrent est credite de la queue de vocabulaire qu'il a lui-meme apportee,
 * queue qu'un texte exterieur ne peut par construction pas couvrir. Plus le
 * corpus est petit, plus cette queue privee pese, et plus l'etalon est hors
 * d'atteinte. Tronquer au sommet ne garde que le noyau reellement partage par
 * la SERP : c'est la seule partie contre laquelle une comparaison a un sens.
 */
export const BRIEF_TERMS = 60;

/**
 * Mots-outils francais et anglais, retires avant comptage.
 *
 * Volontairement large sur les formes verbales courantes (etre, avoir, faire) :
 * elles saturent tous les corpus et ne discriminent rien. En revanche les
 * singuliers et pluriels d'un meme nom sont laisses distincts, parce que les
 * outils du marche les traitent aussi comme deux entrees ("rose" et "roses"
 * n'ont ni le meme volume ni la meme intention).
 *
 * Le versant anglais a longtemps ete reduit a une poignee de mots, alors que la
 * moitie des corpus techniques est anglophone : `you`, `can` et `using` pesaient
 * 21% du poids d'un brief anglais et 8 a 9% d'un brief francais sur un sujet
 * technique. Quelques entrees sont aussi des mots-cles SQL (`where`, `using`,
 * `into`, `between`) : la mesure tranche en faveur du retrait, elles
 * apparaissent sur presque toutes les pages du corpus, donc ne discriminent
 * rien, et le retrait vaut aussi bien pour le brief que pour le texte note.
 *
 * Les mots de moins de trois lettres sont deja coupes par `MIN_TERM_LENGTH` :
 * inutile de les lister ici, a l'exception des quelques-uns deja presents.
 */
export const STOPWORDS = new Set(
    `le la les un une des du de d au aux a et ou ni mais donc or car que qui quoi dont ou
     ce cet cette ces celui celle ceux celles c s n l y en on il elle ils elles je tu nous vous
     me te se moi toi lui leur leurs mon ma mes ton ta tes son sa ses notre nos votre vos
     pas ne plus moins tres trop peu bien aussi encore deja toujours jamais souvent parfois
     est sont etait etaient sera seront etre suis es sommes etes soit
     a ont avait avaient aura auront avoir ai as avons avez
     fait font faire fais faisait feront
     peut peuvent pouvoir pourra pouvez pouvons doit doivent devoir faut
     permet permettent permettre veut veulent vient viennent
     dans sur sous entre vers chez par pour sans avec contre depuis pendant apres avant
     comme si quand alors ainsi meme tout tous toute toutes autre autres chaque
     plusieurs quelques certain certains certaine certaines aucun aucune
     etc via cela ca ceci pourquoi lorsque afin puis ensuite enfin
     surtout notamment cependant neanmoins toutefois donc voici voila
     the of and to in for on with a an is are be this that it its from by at as
     you your they them their there these those our who which what when how why
     can will just out not all have has had was were been being does did done
     then than each other into over under only same such nor own too very more
     less most some any many much where while about after before between both
     use used using make made get got need needs want like also here new way
     but one two three should must may might could would shall now even still
     again once well however therefore thus instead rather though although
     because during without within upon whether either neither another every
     few least yet else ever never always often usually already almost quite
     really actually simply basically maybe perhaps likely per say says said`
        .split(/\s+/)
        .filter(Boolean)
);

/**
 * Decoupe un texte en termes comptables.
 *
 * Minuscules, accents retires (NFKD), decoupe sur tout ce qui n'est pas
 * alphanumerique, puis filtrage des mots-outils et des tokens trop courts.
 *
 * Ce tokeniseur est LE point de verite des comptages : le brief, la notation et
 * le panneau de l'editeur passent tous par lui, sinon deux chiffres differents
 * circuleraient pour la meme page.
 *
 * Pas de lemmatisation, volontairement : `rose` et `roses` restent deux entrees,
 * comme chez les outils du marche. Les fusionner masquerait qu'un texte emploie
 * dix fois le singulier et jamais le pluriel.
 *
 * @param {string} text texte brut, deja debarrasse du HTML
 * @returns {string[]} termes, dans l'ordre d'apparition
 */
export function tokenize(text) {
    const flat = text
        .replace(/[’‘]/g, "'")
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    return (flat.match(/[a-z0-9]+/g) ?? []).filter(
        t =>
            t.length >= MIN_TERM_LENGTH && !STOPWORDS.has(t) && !/^\d+$/.test(t)
    );
}

/**
 * Comptage brut d'un tableau de termes.
 *
 * @param {string[]} tokens
 * @returns {Map<string, number>}
 */
export function countTerms(tokens) {
    const counts = new Map();
    for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    return counts;
}

/**
 * Quantile lineaire d'un tableau NON trie.
 *
 * @param {number[]} values
 * @param {number} p entre 0 et 1
 * @returns {number}
 */
export function quantile(values, p) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * p;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Similarite cosinus au-dela de laquelle deux pages sont jugees etre la meme.
 *
 * Choisi par balayage sur les corpus en cache : c'est a la fois le seuil le plus
 * prudent et le plus efficace. En dessous (0,90 puis 0,85) la fusion commence a
 * emporter des pages reellement distinctes, et la note redescend. A 0,95 chaque
 * fusion observee etait bien la meme page dans une autre version ou sur un
 * miroir, et les versions FR et EN d'un meme manuel restent separees.
 */
export const DUPLICATE_SIMILARITY = 0.95;

/**
 * Similarite cosinus entre deux documents deja prepares (vecteur + norme).
 *
 * Parcourt le plus petit des deux sacs de mots : les documents n'ont pas le meme
 * vocabulaire, et iterer sur le plus grand ne ferait que multiplier les termes
 * absents de l'autre.
 */
function cosine(a, b) {
    const [small, large] =
        Object.keys(a.doc.counts).length <= Object.keys(b.doc.counts).length
            ? [a.doc.counts, b.doc.counts]
            : [b.doc.counts, a.doc.counts];
    let dot = 0;
    for (const [term, count] of Object.entries(small)) {
        const other = large[term];
        if (other) dot += count * other;
    }
    return dot / (a.norm * b.norm);
}

/**
 * Ecarte du corpus les pages qui sont la meme page.
 *
 * Une SERP technique ne renvoie pas trente pages differentes : elle renvoie un
 * manuel de reference, ses dix versions successives, sa traduction et deux
 * miroirs. Sur « postgresql cube gist plus proche voisin », `cube.html` figurait
 * dix-huit fois dans un corpus de soixante-dix-neuf documents, soit 23% a elle
 * seule. Deux consequences, toutes deux fausses :
 *
 * - la retention. `coverage` vaut `nDocs / docs.length` et le plancher est a
 *   0,2 : une page comptee dix-huit fois franchit le plancher a elle seule, donc
 *   **tout** mot qui n'apparait que sur elle devient un terme du brief. C'est
 *   ainsi que `latitude` et `longitude`, tires d'une page voisine sur la distance
 *   terrestre, pesaient dans un brief sur la recherche de couleur ;
 * - l'etalon. `rivals` produit une note par document : le quart superieur du
 *   corpus, c'etait le meme manuel recopie. On ne se comparait plus a des
 *   concurrents mais a une reference, dix-huit fois.
 *
 * Le phenomene suit la technicite de la requete (42% de doublons sur la requete
 * ci-dessus, 0 a 7% sur les corpus grand public), c'est-a-dire qu'il frappe
 * exactement les sujets ou l'on croit la concurrence faible.
 *
 * Le representant conserve est le **document le plus long** du groupe, donc la
 * version la plus complete de la page. L'ordre de la SERP est restitue ensuite :
 * il porte le classement, on ne le perd pas au passage.
 *
 * @param {import('./terms.d.mts').SeoDocument[]} docs
 * @param {number} [threshold]
 * @returns {{ docs: import('./terms.d.mts').SeoDocument[], duplicates: { url: string, sameAs: string }[] }}
 */
export function dedupeDocs(docs, threshold = DUPLICATE_SIMILARITY) {
    const prepared = docs.map((doc, index) => {
        let norm = 0;
        for (const count of Object.values(doc.counts)) norm += count * count;
        return { doc, index, norm: Math.sqrt(norm) || Number.EPSILON };
    });
    prepared.sort((a, b) => b.doc.total - a.doc.total || a.index - b.index);

    /** @type {typeof prepared} */
    const kept = [];
    const duplicates = [];
    for (const candidate of prepared) {
        const twin = kept.find(k => cosine(k, candidate) >= threshold);
        if (twin)
            duplicates.push({ url: candidate.doc.url, sameAs: twin.doc.url });
        else kept.push(candidate);
    }

    return {
        docs: kept.sort((a, b) => a.index - b.index).map(k => k.doc),
        duplicates,
    };
}

/**
 * Le coeur de la notation, alimente par des comptages deja faits.
 *
 * Isole de `scoreText` parce que `buildBrief` doit noter les concurrents avec
 * exactement la meme arithmetique, alors qu'il n'a pas leur texte sous la main :
 * il a deja compte leurs mots. Deux implementations donneraient un etalon
 * incomparable avec la note qu'on affiche, ce qui viderait l'etalon de son sens.
 *
 * @param {import('./terms.d.mts').SeoTerm[]} terms
 * @param {(term: string) => number} get occurrences du terme dans le texte note
 * @param {number} total mots utiles du texte note
 */
export function scoreCounts(terms, get, total) {
    const rows = terms.map(t => {
        const count = get(t.term);
        const density = total ? (count / total) * 100 : 0;
        const band =
            count === 0
                ? 'manquant'
                : density < t.q1
                  ? 'sous-utilise'
                  : density > t.q3
                    ? 'sur-optimise'
                    : 'ok';
        return { ...t, count, density, band };
    });

    const weightOf = band =>
        rows.filter(r => r.band === band).reduce((s, r) => s + r.weight, 0);
    const totalWeight = rows.reduce((s, r) => s + r.weight, 0) || 1;

    // Un terme sur-optimise compte a moitie : il est couvert, mais mal dose. Le
    // mettre a zero reviendrait a traiter « trop » comme « absent », ce qui ferait
    // preferer le silence a l'exces et n'a aucun sens editorial.
    return {
        rows,
        score: Math.round(
            ((weightOf('ok') + 0.5 * weightOf('sur-optimise')) / totalWeight) *
                100
        ),
        coverage: Math.round(
            ((totalWeight - weightOf('manquant')) / totalWeight) * 100
        ),
        onTarget: Math.round(
            ((weightOf('ok') + weightOf('sous-utilise')) / totalWeight) * 100
        ),
        overWeight: Math.round((weightOf('sur-optimise') / totalWeight) * 100),
        counts: {
            manquant: rows.filter(r => r.band === 'manquant').length,
            'sous-utilise': rows.filter(r => r.band === 'sous-utilise').length,
            ok: rows.filter(r => r.band === 'ok').length,
            'sur-optimise': rows.filter(r => r.band === 'sur-optimise').length,
        },
    };
}

/**
 * Construit le brief a partir des documents exploitables.
 *
 * Pour chaque terme : dans combien de documents il apparait, et la distribution
 * de sa densite *parmi ceux qui l'emploient*. Inclure les zeros ecraserait Q1 a
 * zero des qu'un terme manque a un quart du corpus, ce qui rendrait la borne
 * basse inutilisable.
 *
 * Le poids croise les deux signaux : un terme n'est fort que s'il est a la fois
 * repandu (beaucoup de documents) et employe densement. Il est normalise sur
 * 100 par rapport au terme le plus fort du corpus, pour rester lisible.
 *
 * @param {string} query la requete cible, indissociable du brief
 * @param {import('./terms.d.mts').SeoDocument[]} docs documents retenus
 * @param {string} [generatedAt] horodatage ISO, injectable pour les tests
 * @returns {import('./terms.d.mts').SeoBrief}
 */
export function buildBrief(query, allDocs, generatedAt) {
    // Le dedoublonnage vit ici, et pas dans `fetchCorpus`, parce que le CLI en
    // mode `--corpus <cache>` court-circuite l'aspiration et appelle `buildBrief`
    // directement. C'est le seul point que tous les chemins traversent (CLI en
    // ligne, CLI sur cache, route de generation, panneau) ; ailleurs, deux
    // corpus differents circuleraient pour la meme requete. C'est aussi ce qui
    // permet de rejouer les briefs deja en cache sans redepenser un appel SERP.
    const { docs, duplicates } = dedupeDocs(allDocs);
    const n = docs.length;
    const byTerm = new Map();

    for (const doc of docs) {
        for (const [term, count] of Object.entries(doc.counts)) {
            if (!byTerm.has(term)) byTerm.set(term, []);
            byTerm.get(term).push((count / doc.total) * 100);
        }
    }

    const terms = [];
    for (const [term, densities] of byTerm) {
        const nDocs = densities.length;
        const coverage = nDocs / n;
        if (coverage < MIN_DOC_RATIO) continue;
        const median = quantile(densities, 0.5);
        terms.push({
            term,
            nDocs,
            coverage,
            q1: quantile(densities, 0.25),
            median,
            q3: quantile(densities, 0.75),
            rawWeight: coverage * median,
            weight: 0,
            tier:
                coverage >= MANDATORY_DOC_RATIO
                    ? 'obligatoire'
                    : coverage >= RECOMMENDED_DOC_RATIO
                      ? 'recommande'
                      : 'complementaire',
        });
    }

    const max = Math.max(...terms.map(t => t.rawWeight), Number.EPSILON);
    for (const t of terms) t.weight = Math.round((t.rawWeight / max) * 100);
    terms.sort((a, b) => b.weight - a.weight);
    terms.length = Math.min(terms.length, BRIEF_TERMS);

    // L'etalon : ce que valent, contre ce brief, les pages qui l'ont produit.
    // Sans lui la note flotte dans le vide. Une page ne peut pas tenir dans la
    // fenetre interquartile de *tous* les termes a la fois, puisque par
    // construction la moitie du corpus est dehors sur chacun : meme la meilleure
    // page qui ranke plafonne loin de 100. Le seul point de comparaison qui a un
    // sens est donc la distribution des concurrents eux-memes.
    const rivals = docs
        .map(d => scoreCounts(terms, t => d.counts[t] ?? 0, d.total).score)
        .sort((a, b) => a - b);

    return {
        query,
        generatedAt: generatedAt ?? new Date().toISOString(),
        // `requested` reste le nombre de pages aspirees et `kept` le nombre de
        // pages distinctes : les confondre ferait annoncer quatre-vingts
        // concurrents la ou l'on en a mesure quarante-six.
        corpus: {
            requested: allDocs.length,
            kept: n,
            duplicates,
            urls: docs.map(d => d.url),
        },
        benchmark: {
            best: rivals[rivals.length - 1] ?? 0,
            q3: Math.round(quantile(rivals, 0.75)),
            median: Math.round(quantile(rivals, 0.5)),
            q1: Math.round(quantile(rivals, 0.25)),
            worst: rivals[0] ?? 0,
        },
        thresholds: {
            MANDATORY_DOC_RATIO,
            RECOMMENDED_DOC_RATIO,
            MIN_DOC_RATIO,
            MIN_DOC_WORDS,
        },
        terms,
    };
}

/**
 * Bornes de la note lettree.
 *
 * Reprises telles quelles de `scripts/geo-audit.mjs` : deux echelles differentes
 * dans le meme back-office se liraient l'une pour l'autre.
 */
const GRADE_BANDS = /** @type {const} */ ([
    [90, 'A'],
    [78, 'B'],
    [65, 'C'],
    [50, 'D'],
]);

/**
 * La lettre qui accompagne la note.
 *
 * Sans etalon, l'echelle absolue de `geo-audit.mjs`. Avec, on note **contre les
 * pages qui rankent** : depasser la meilleure vaut A, tenir dans le quart
 * superieur vaut B, atteindre la mediane vaut C. C'est un ecart assume a la
 * spec initiale, qui reprenait l'echelle absolue de `geo-audit`. La verification
 * l'a invalidee : sur « quelles fleurs planter pour la toussaint », la meilleure
 * des 37 pages du corpus obtient 50/100 et la mediane 35. L'echelle absolue
 * rendait donc F a toutes les pages du web sur cette requete, y compris a celles
 * qui occupent la premiere position. Une note qui ne varie jamais n'informe pas.
 *
 * Les briefs generes avant l'etalon n'en ont pas et retombent sur l'echelle
 * absolue, faute de mieux : il faut les regenerer pour obtenir une lettre juste.
 *
 * @param {number} score sur 100
 * @param {import('./terms.d.mts').SeoBenchmark} [benchmark] scores du corpus
 * @returns {import('./terms.d.mts').SeoGrade}
 */
export function grade(score, benchmark) {
    if (!benchmark) {
        for (const [floor, letter] of GRADE_BANDS)
            if (score >= floor) return letter;
        return 'F';
    }
    if (score >= benchmark.best) return 'A';
    if (score >= benchmark.q3) return 'B';
    if (score >= benchmark.median) return 'C';
    if (score >= benchmark.q1) return 'D';
    return 'F';
}

/**
 * Compare un texte au brief.
 *
 * Chaque terme du brief tombe dans une bande : absent, sous la borne Q1, dans la
 * fenetre, ou au-dessus de Q3. C'est cette derniere bande qui correspond a la
 * sur-optimisation, celle qui fait grimper un SOSEO.
 *
 * Tout est pondere par le poids : rater un terme employe par les 20 concurrents
 * coute plus cher que d'en rater un employe par 8.
 *
 * Le texte attendu est le **rendu**, jamais la source MDX : les URLs et les noms
 * de composants contiennent des mots-cles et gonfleraient les densites.
 *
 * @param {import('./terms.d.mts').SeoBrief} brief
 * @param {string} text
 * @returns {import('./terms.d.mts').SeoScore}
 */
export function scoreText(brief, text) {
    const tokens = tokenize(text);
    const counts = countTerms(tokens);
    const scored = scoreCounts(
        brief.terms,
        term => counts.get(term) ?? 0,
        tokens.length
    );

    return {
        words: tokens.length,
        ...scored,
        grade: grade(scored.score, brief.benchmark),
        benchmark: brief.benchmark,
    };
}
