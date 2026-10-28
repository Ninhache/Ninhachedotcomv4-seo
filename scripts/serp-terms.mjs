#!/usr/bin/env node
/**
 * Brief lexical construit depuis la SERP, et notation d'un texte contre ce brief.
 *
 * Reproduit localement ce que vend un outil comme yourtext.guru : les mots a
 * employer ne sont pas devines, ils sont *observes* dans les pages qui rankent
 * deja sur la requete visee. Deux temps, volontairement separes :
 *
 *   1. `--query`  interroge la SERP, aspire les concurrents, et sort pour chaque
 *      terme le nombre de documents qui l'emploient et la distribution de sa
 *      densite. C'est le seul moment qui sort sur le reseau, et il se fait une
 *      fois par article.
 *   2. `--score`  compare un texte au brief sauvegarde. Aucun reseau, instantane.
 *      C'est ce mode qui tourne en direct dans l'editeur du back-office.
 *
 * Un mot present dans 19 documents sur 20 pese lourd ; un mot present dans 6
 * pese peu. C'est tout ce que recouvre la notion d'« impact » de ces outils :
 * un pouvoir discriminant dans le corpus, pas une prevision de trafic. Aucune
 * estimation de trafic ni de position n'est produite ici, parce qu'aucune n'est
 * calculable a partir du seul texte.
 *
 * Ce fichier n'est plus que la ligne de commande. Le calcul vit dans
 * `lib/seo/terms.mjs` (pur) et `lib/seo/serp.mjs` (reseau), partages avec la
 * route `/api/seo/brief` et le panneau de l'editeur : c'est ce qui garantit
 * qu'un meme texte donne le meme chiffre ici et dans le back-office.
 *
 * Usage :
 *   node scripts/serp-terms.mjs --query "fleurs toussaint" [--top 60] [--out brief.json]
 *   node scripts/serp-terms.mjs --query "..." --corpus c.json --refresh   (sans SERP)
 *   node scripts/serp-terms.mjs --suggest "fleurs toussaint"        (sans cle)
 *   node scripts/serp-terms.mjs --score <fichier|url> --brief brief.json
 *   ... --json    sortie machine sur stdout
 *
 * La cle Brave se met dans `.env` sous `BRAVE_SEARCH_API_KEY` (jamais prefixee
 * NEXT_PUBLIC_ : elle ne doit pas atteindre le bundle client).
 *
 * Methode complete : `docs/specs/seo-score.md`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    DEFAULT_TOP,
    ENV_KEY,
    extractText,
    fetchWithTimeout,
    loadDocument,
    mapLimit,
    searchSerp,
    suggestSoup,
} from '../lib/seo/serp.mjs';
import {
    buildBrief,
    countTerms,
    MANDATORY_DOC_RATIO,
    MIN_DOC_RATIO,
    RECOMMENDED_DOC_RATIO,
    scoreText,
    tokenize,
} from '../lib/seo/terms.mjs';

const ENV_FILE = '.env';
/** Au-dela, la sortie terminal cesse d'etre lisible ; `--out` garde tout. */
const MAX_TERMS_SHOWN = 60;
/** Pages telechargees en parallele. Assez bas pour rester poli avec les hotes. */
const FETCH_CONCURRENCY = 5;
const USER_AGENT = 'ninhache-seo-brief/1.0 (+https://ninhache.fr)';

// --- Utilitaires ---------------------------------------------------------

/** Lecture minimale du .env : le script tourne hors Next, sans dotenv. */
function loadEnv(file = ENV_FILE) {
    try {
        return Object.fromEntries(
            readFileSync(resolve(process.cwd(), file), 'utf8')
                .split('\n')
                .filter(line => /^\s*[A-Z0-9_]+\s*=/.test(line))
                .map(line => {
                    const i = line.indexOf('=');
                    return [
                        line.slice(0, i).trim(),
                        line
                            .slice(i + 1)
                            .trim()
                            .replace(/^["']|["']$/g, ''),
                    ];
                })
        );
    } catch {
        return {};
    }
}

// --- Rendu ---------------------------------------------------------------

const TIER_MARK = { obligatoire: '  *', recommande: '  +', complementaire: '' };

const BANDS = {
    manquant: 'x',
    'sous-utilise': '<',
    ok: '+',
    'sur-optimise': '!',
};

function printBrief(brief) {
    console.log(`\nBrief lexical  «${brief.query}»`);
    const { requested, kept, duplicates } = brief.corpus;
    console.log(
        `corpus : ${kept} pages distinctes` +
            (duplicates.length
                ? ` (${duplicates.length} ${
                      duplicates.length === 1
                          ? 'copie ecartee'
                          : 'copies ecartees'
                  } sur ${requested} aspirees)`
                : '')
    );
    if (brief.benchmark)
        console.log(
            `etalon : ces memes pages notees contre ce brief vont de ` +
                `${brief.benchmark.worst} a ${brief.benchmark.best}, mediane ${brief.benchmark.median}`
        );
    console.log('-'.repeat(76));
    console.log(
        `${'terme'.padEnd(20)}${'docs'.padStart(7)}${'poids'.padStart(7)}` +
            `${'mediane'.padStart(10)}${'fenetre visee'.padStart(20)}`
    );
    for (const t of brief.terms.slice(0, MAX_TERMS_SHOWN)) {
        console.log(
            `${t.term.padEnd(20)}` +
                `${`${t.nDocs}/${kept}`.padStart(7)}` +
                `${String(t.weight).padStart(7)}` +
                `${`${t.median.toFixed(2)}%`.padStart(10)}` +
                `${`${t.q1.toFixed(2)} - ${t.q3.toFixed(2)}%`.padStart(20)}` +
                `${TIER_MARK[t.tier]}`
        );
    }
    if (brief.terms.length > MAX_TERMS_SHOWN)
        console.log(
            `... ${brief.terms.length - MAX_TERMS_SHOWN} termes de plus (voir --out)`
        );
    console.log(
        `\n*  obligatoire (>= ${MANDATORY_DOC_RATIO * 100}% du corpus)   ` +
            `+  recommande (>= ${RECOMMENDED_DOC_RATIO * 100}%)   ` +
            `   complementaire (>= ${MIN_DOC_RATIO * 100}%)`
    );
}

function printScore(brief, score) {
    console.log(
        `\nNotation contre «${brief.query}»  (${score.words} mots utiles)`
    );
    console.log('-'.repeat(76));
    for (const r of score.rows.slice(0, MAX_TERMS_SHOWN)) {
        console.log(
            ` ${BANDS[r.band]} ${r.term.padEnd(20)}` +
                `${String(r.count).padStart(4)}` +
                `${`${r.density.toFixed(2)}%`.padStart(9)}` +
                `${`cible ${r.q1.toFixed(2)}-${r.q3.toFixed(2)}%`.padStart(24)}` +
                `${`poids ${r.weight}`.padStart(12)}`
        );
    }
    console.log('-'.repeat(76));
    console.log(`score ${score.score}/100  ${score.grade}`);
    if (score.benchmark)
        console.log(
            `les pages qui rankent : mediane ${score.benchmark.median}, ` +
                `meilleure ${score.benchmark.best}  ` +
                `(A des ${score.benchmark.best}, B ${score.benchmark.q3}, ` +
                `C ${score.benchmark.median}, D ${score.benchmark.q1})`
        );
    console.log(
        `couverture ponderee ${score.coverage}%   dans la cible ${score.onTarget}%   ` +
            `sur-optimise ${score.overWeight}%`
    );
    console.log(
        `manquants ${score.counts.manquant}  sous-utilises ${score.counts['sous-utilise']}  ` +
            `ok ${score.counts.ok}  sur-optimises ${score.counts['sur-optimise']}`
    );
}

// --- CLI -----------------------------------------------------------------

function parseArgs(argv) {
    const args = { top: DEFAULT_TOP };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--json') args.json = true;
        else if (a === '--refresh') args.refresh = true;
        else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
    }
    return args;
}

/** Le texte a noter : fichier local, ou page servie (dont le corps est extrait). */
async function readTarget(target) {
    if (/^https?:\/\//.test(target)) {
        const res = await fetchWithTimeout(target, {
            headers: { 'User-Agent': USER_AGENT },
        });
        if (!res.ok) throw new Error(`${target} a repondu ${res.status}`);
        return extractText(await res.text());
    }
    return readFileSync(resolve(process.cwd(), target), 'utf8');
}

/**
 * Relit un corpus mis en cache, s'il correspond bien a la requete demandee.
 *
 * @returns les documents, ou `null` si le fichier manque ou porte sur une autre
 *   requete (auquel cas l'appelant reaspire plutot que de melanger deux SERP).
 */
function readCorpus(file, query) {
    try {
        const cache = JSON.parse(
            readFileSync(resolve(process.cwd(), file), 'utf8')
        );
        return cache.query === query ? cache.docs : null;
    } catch {
        return null;
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.suggest) {
        const queries = await suggestSoup(args.suggest);
        const counts = countTerms(queries.flatMap(q => tokenize(q)));
        const top = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_TERMS_SHOWN);
        if (args.json) {
            console.log(
                JSON.stringify(
                    { query: args.suggest, queries, terms: top },
                    null,
                    2
                )
            );
            return;
        }
        console.log(
            `\n${queries.length} requetes reelles pour «${args.suggest}»\n`
        );
        for (const q of queries.slice(0, 40)) console.log('  ', q);
        if (queries.length > 40)
            console.log(`   ... ${queries.length - 40} de plus`);
        console.log('\nTermes les plus frequents :');
        for (const [term, n] of top) console.log(`  ${term.padEnd(22)}${n}`);
        return;
    }

    if (args.score) {
        if (!args.brief)
            throw new Error('--score exige --brief <fichier.json>');
        const brief = JSON.parse(
            readFileSync(resolve(process.cwd(), args.brief), 'utf8')
        );
        const score = scoreText(brief, await readTarget(args.score));
        if (args.json) console.log(JSON.stringify(score, null, 2));
        else printScore(brief, score);
        return;
    }

    if (!args.query) {
        console.log(
            'Usage :\n' +
                '  --query "<requete>" [--top 60] [--out brief.json]   brief depuis la SERP\n' +
                '     [--corpus corpus.json]                           aspire une fois, relit ensuite\n' +
                '     [--refresh]                                      retelecharge le cache, sans SERP\n' +
                '     [--lang fr|en]                                   marche interroge (defaut fr)\n' +
                '  --suggest "<requete>"                               champ lexical, sans cle\n' +
                '  --score <fichier|url> --brief brief.json            note un texte\n' +
                '  --json                                              sortie machine'
        );
        process.exit(1);
    }

    // Le corpus est mis en cache a part du brief : reajuster un seuil ne doit pas
    // couter une nouvelle aspiration de 60 pages, ni entamer le quota mensuel.
    const cached = args.corpus ? readCorpus(args.corpus, args.query) : null;
    let usable;

    if (cached && args.refresh) {
        // Le cache ne garde que les comptages : quand l'extraction change (un
        // encodage enfin respecte, du chrome enfin coupe), les rejouer ne sert a
        // rien, il faut retelecharger. Les URL sont deja connues, donc cette
        // relecture ne coute pas un seul appel a la SERP, ni au quota mensuel.
        console.error(
            `corpus rafraichi depuis ${args.corpus} (${cached.length} pages, sans appel SERP)`
        );
        const reloaded = await mapLimit(
            cached,
            FETCH_CONCURRENCY,
            loadDocument
        );
        const lost = reloaded.filter(d => d.skipped);
        usable = reloaded.filter(d => d.counts);
        // Une page devenue inaccessible depuis la mise en cache ne doit pas
        // disparaitre en silence : le corpus maigrirait d'un article a l'autre
        // sans que rien ne l'explique.
        if (lost.length)
            console.error(
                `  ${lost.length} pages perdues depuis la mise en cache : ` +
                    lost.map(d => `${d.url} (${d.skipped})`).join(', ')
            );
        writeFileSync(
            resolve(process.cwd(), args.corpus),
            JSON.stringify({ query: args.query, docs: usable })
        );
    } else if (cached) {
        console.error(
            `corpus relu depuis ${args.corpus} (${cached.length} pages)`
        );
        usable = cached;
    } else {
        const apiKey = loadEnv()[ENV_KEY] ?? process.env[ENV_KEY];
        if (!apiKey)
            throw new Error(
                `${ENV_KEY} absent de ${ENV_FILE} et de l'environnement.`
            );

        const top = Number(args.top) || DEFAULT_TOP;
        // Deroule a la main plutot que par `fetchCorpus` pour annoncer la taille
        // de la SERP avant les vingt secondes de telechargement.
        const results = await searchSerp(args.query, top, apiKey, args.lang);
        console.error(`SERP : ${results.length} resultats, telechargement...`);

        const loaded = await mapLimit(results, FETCH_CONCURRENCY, loadDocument);
        usable = loaded.filter(d => d.counts);
        const dropped = loaded.filter(d => d.skipped);
        if (dropped.length) {
            const byReason = new Map();
            for (const d of dropped) {
                // Les « N mots utiles » sont un seul motif : page rendue en JS.
                const reason = /mots utiles$/.test(d.skipped)
                    ? 'trop peu de texte'
                    : d.skipped;
                byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
            }
            console.error(
                `  ${dropped.length} pages ecartees : ` +
                    [...byReason].map(([r, n]) => `${r} (${n})`).join(', ')
            );
        }
        if (args.corpus) {
            writeFileSync(
                resolve(process.cwd(), args.corpus),
                JSON.stringify({ query: args.query, docs: usable })
            );
            console.error(`corpus mis en cache dans ${args.corpus}`);
        }
    }

    if (usable.length < 5)
        throw new Error(
            `Seulement ${usable.length} pages exploitables, corpus trop maigre.`
        );

    const brief = buildBrief(args.query, usable);
    if (args.out) {
        writeFileSync(
            resolve(process.cwd(), args.out),
            JSON.stringify(brief, null, 2)
        );
        console.error(`brief ecrit dans ${args.out}`);
    }
    if (args.json) console.log(JSON.stringify(brief, null, 2));
    else printBrief(brief);
}

main().catch(err => {
    console.error(`\n${err.message}`);
    process.exit(1);
});
