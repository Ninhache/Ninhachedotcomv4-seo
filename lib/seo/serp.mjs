/**
 * Constitution du corpus : SERP reelle, telechargement, extraction du texte.
 *
 * C'est la moitie couteuse et la seule qui touche au reseau : une requete Brave
 * puis une quarantaine de pages aspirees, soit une vingtaine de secondes. Elle
 * ne tourne qu'une fois par article et par locale, a la demande. La notation,
 * elle, vit dans `./terms.mjs` et ne coute rien.
 *
 * Serveur uniquement : ce module suppose `fetch` et `cheerio`, et manipule la
 * cle Brave. Rien ici ne doit remonter dans un bundle client.
 *
 * Methode complete : `docs/specs/seo-score.md`.
 */

import * as cheerio from 'cheerio';
import { buildBrief, countTerms, MIN_DOC_WORDS, tokenize } from './terms.mjs';

// --- Configuration -------------------------------------------------------

export const BRAVE_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';
export const SUGGEST_ENDPOINT =
    'https://suggestqueries.google.com/complete/search';
export const ENV_KEY = 'BRAVE_SEARCH_API_KEY';

/**
 * Nombre de concurrents demandes a la SERP.
 *
 * Volontairement plus haut que le corpus vise : sur une requete commerciale, la
 * moitie des resultats sont des pages produit rendues en JavaScript, sans prose
 * cote serveur, et se font ecarter. Demander 60 pour en garder 25 est le prix a
 * payer pour que le vocabulaire editorial ne soit pas noye par le vocabulaire
 * marchand.
 */
export const DEFAULT_TOP = 60;
/** Brave plafonne une reponse a 20 resultats ; au-dela il faut paginer. */
const RESULTS_PER_PAGE = 20;
/** Plafond de pagination impose par l'API. */
const MAX_PAGE = 9;
/**
 * Marche de la SERP, choisi par la locale de la traduction notee.
 *
 * Interroger le marche francais avec une requete anglaise renvoie une SERP
 * biaisee : Brave privilegie les hotes et les pages du pays demande, donc le
 * corpus n'est pas celui contre lequel l'article anglais est reellement en
 * concurrence. Un brief est indissociable de sa requete ; il l'est tout autant
 * de son marche.
 */
const MARKETS = {
    fr: { country: 'fr', search_lang: 'fr', ui_lang: 'fr-FR' },
    en: { country: 'us', search_lang: 'en', ui_lang: 'en-US' },
};
export const DEFAULT_LOCALE = 'fr';

/** Le marche d'une locale, repli sur le francais pour une locale inconnue. */
export function marketFor(locale) {
    return MARKETS[locale] ?? MARKETS[DEFAULT_LOCALE];
}

const FETCH_TIMEOUT_MS = 12_000;
/** Pages telechargees en parallele. Assez bas pour rester poli avec les hotes. */
const FETCH_CONCURRENCY = 5;
const USER_AGENT = 'ninhache-seo-brief/1.0 (+https://ninhache.fr)';

/** Amorces de l'« alphabet soup » Suggest : lettres, chiffres et mots interrogatifs. */
const SUGGEST_SEEDS = [
    '',
    ...'abcdefghijklmnopqrstuvwxyz',
    ...'0123456789',
    'comment',
    'pourquoi',
    'quelle',
    'quel',
    'quand',
    'ou',
    'combien',
    'pour',
    'sans',
    'avec',
    'meilleur',
    'prix',
];

// --- Utilitaires ---------------------------------------------------------

/** Execute `worker` sur chaque item, `limit` en vol simultanement. */
export async function mapLimit(items, limit, worker) {
    const out = new Array(items.length);
    let cursor = 0;
    const runners = Array.from(
        { length: Math.min(limit, items.length) },
        async () => {
            while (cursor < items.length) {
                const i = cursor++;
                out[i] = await worker(items[i], i);
            }
        }
    );
    await Promise.all(runners);
    return out;
}

export async function fetchWithTimeout(url, options = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
        clearTimeout(timer);
    }
}

// --- Etape 1 : la SERP ---------------------------------------------------

/**
 * Les `top` premiers resultats organiques de Brave pour `query`.
 *
 * @returns {Promise<{url: string, title: string}[]>}
 * @throws si la cle est absente ou refusee : sans corpus il n'y a pas de brief,
 *   mieux vaut echouer franchement que produire des quantiles sur 3 pages.
 */
export async function searchSerp(query, top, apiKey, locale = DEFAULT_LOCALE) {
    const pages = Math.min(Math.ceil(top / RESULTS_PER_PAGE), MAX_PAGE + 1);
    const seen = new Set();
    const out = [];

    // Sequentiel a dessein : le palier gratuit limite le debit, et une page vide
    // signifie qu'on a atteint le fond de la SERP, donc inutile de tirer la suite.
    for (let page = 0; page < pages && out.length < top; page++) {
        const params = new URLSearchParams({
            q: query,
            count: String(RESULTS_PER_PAGE),
            offset: String(page),
            ...marketFor(locale),
        });
        const res = await fetchWithTimeout(`${BRAVE_ENDPOINT}?${params}`, {
            headers: {
                Accept: 'application/json',
                'X-Subscription-Token': apiKey,
            },
        });
        if (!res.ok) {
            if (page > 0) break; // une page de rab qui echoue n'invalide pas le corpus
            throw new Error(
                `Brave Search a repondu ${res.status} ${res.statusText}. ` +
                    `Verifie ${ENV_KEY}.`
            );
        }
        const results = (await res.json()).web?.results ?? [];
        if (!results.length) break;
        for (const r of results) {
            if (seen.has(r.url)) continue;
            seen.add(r.url);
            out.push({ url: r.url, title: r.title ?? '' });
        }
    }
    return out.slice(0, top);
}

/** Debut de page suffisant pour y trouver la balise `meta` qui declare l'encodage. */
const CHARSET_SNIFF_BYTES = 2048;

/**
 * Decode une page en respectant l'encodage qu'elle declare.
 *
 * `Response.text()` decode **toujours** en UTF-8 et ignore le charset annonce.
 * Sur les pages francophones encore servies en ISO-8859-1, les octets accentues
 * sont alors remplaces par le caractere de remplacement, que le tokeniseur coupe
 * ensuite en fragments : `donnees` devenait `donn`, `etre` devenait `tre`. Ces
 * fragments n'etaient pas du bruit inoffensif, ils avaient un poids reel dans le
 * brief (`donn` sur dix pages, `tre` sur douze) et occupaient la place des vrais
 * mots. Meme famille de degat que les cellules de tableau soudees plus bas.
 *
 * L'en-tete fait foi ; a defaut on renifle la balise `meta` sur le debut du
 * document, ou elle est en ASCII quel que soit l'encodage du reste.
 */
export function decodeBody(buffer, contentType) {
    const fromHeader = /charset=\s*"?([\w:.+-]+)/i.exec(contentType ?? '')?.[1];
    const head = Buffer.from(buffer, 0, CHARSET_SNIFF_BYTES).toString('latin1');
    const fromMeta =
        /<meta[^>]+charset=\s*["']?([\w:.+-]+)/i.exec(head)?.[1] ??
        /<meta[^>]+content=["'][^"']*charset=\s*([\w:.+-]+)/i.exec(head)?.[1];

    for (const label of [fromHeader, fromMeta, 'utf-8']) {
        if (!label) continue;
        try {
            // Une etiquette inconnue fait lever le constructeur : on retombe
            // alors sur la suivante, et en dernier ressort sur UTF-8.
            return new TextDecoder(label, { fatal: false }).decode(buffer);
        } catch {}
    }
    return Buffer.from(buffer).toString('utf8');
}

/**
 * Part du texte de la page au-dela de laquelle un bloc ne peut plus etre du chrome.
 *
 * Garde-fou indispensable et non negociable : WordPress et la plupart des
 * themes posent les descripteurs de gabarit sur le `<body>` lui-meme
 * (`wp-singular post-template-default no-sidebar menu-... footer-...`). Une
 * correspondance en sous-chaine y matche, et sans ce plafond la suppression
 * emporte le document entier. Mesure : sur le corpus toussaint, douze pages sur
 * trente-sept tombaient a zero mot utile. Un bloc qui porte le tiers du texte
 * n'est pas une barre de navigation, quel que soit le nom de sa classe.
 */
const CHROME_MAX_SHARE = 0.3;

/** En deca, un bloc est trop court pour que sa densite de liens veuille dire quelque chose. */
const LINK_LIST_MIN_CHARS = 60;
/** Part du texte tenue par des liens au-dela de laquelle le bloc est une liste de navigation. */
const LINK_LIST_RATIO = 0.8;
/** Longueur a partir de laquelle un texte repete est du gabarit, pas une coincidence. */
const BOILERPLATE_MIN_CHARS = 25;
/** Nombre de repetitions dans une meme page a partir duquel un bloc est du gabarit. */
const BOILERPLATE_MIN_REPEATS = 3;

/**
 * Motifs de classe et d'identifiant du chrome le plus repandu.
 *
 * En sous-chaine, pour couvrir `mainmenu`, `nav-bar`, `site-header` et leurs
 * variantes. Volontairement muet sur `content`, `main` et `post` : sur un
 * forum, le corps des messages porte precisement ces classes, et les couper
 * viderait la page de ce qu'on est venu y mesurer.
 */
const CHROME_SELECTOR =
    '[class*="nav"], [class*="menu"], [class*="sidebar"], [class*="breadcrumb"], ' +
    '[class*="footer"], [class*="header"], [class*="signature"], [class*="pagination"], ' +
    '[class*="popup"], [class*="toolbar"], [class*="userinfo"], [class*="postbit"], ' +
    '[id*="nav"], [id*="footer"], [id*="header"]';

/** Texte d'un noeud, espaces normalises. */
function flatText(node) {
    return node.text().replace(/\s+/g, ' ').trim();
}

/**
 * Retire le chrome designe par son nom de classe, sans jamais vider la page.
 *
 * Le nom de classe seul est un indice, pas une preuve : voir `CHROME_MAX_SHARE`.
 * Un noeud qui contient l'`<article>` ou le `<main>` est epargne de la meme
 * facon, parce qu'il est par construction le perimetre qu'on cherche a mesurer.
 */
function stripChrome($) {
    const total = flatText($('body')).length || 1;
    $(CHROME_SELECTOR).each((_, el) => {
        const node = $(el);
        if (node.find('article, main').length) return;
        if (flatText(node).length / total > CHROME_MAX_SHARE) return;
        node.remove();
    });
}

/**
 * Retire les blocs qui ne sont qu'une liste de liens.
 *
 * Les noms de classes ne suffisent pas : le meme menu s'appelle `navtabs` ici,
 * `floatcontainer` la, `thread_controls` ailleurs. La densite de liens, elle, ne
 * depend d'aucune convention : un bloc dont 80% du texte est cliquable est une
 * barre de navigation, un sommaire ou un pied de page, sur n'importe quel site.
 * De la prose n'atteint jamais ce taux.
 */
function stripLinkLists($) {
    $('div, ul, ol, dl, table, td, section').each((_, el) => {
        const node = $(el);
        const text = node.text().replace(/\s+/g, ' ').trim();
        if (text.length < LINK_LIST_MIN_CHARS) return;
        const linked = node.find('a').text().replace(/\s+/g, ' ').trim().length;
        if (linked / text.length >= LINK_LIST_RATIO) node.remove();
    });
}

/**
 * Retire le gabarit qui se repete dans la page.
 *
 * Sur un forum, chaque message traine le meme encart d'auteur : « Informations
 * personnelles », « Informations professionnelles », repetes autant de fois
 * qu'il y a d'intervenants. Ce n'est pas du vocabulaire du sujet, mais le
 * comptage le voyait passer dix fois.
 *
 * Le plancher de longueur est ce qui rend la regle sans danger : une cellule de
 * tableau qui repete `integer` ou `float8` est du vrai vocabulaire technique, et
 * reste bien en dessous des vingt-cinq caracteres exiges ici.
 */
function stripRepeatedBlocks($) {
    const seen = new Map();
    $('div, li, dt, dd, td, th, p, span, b').each((_, el) => {
        // Texte propre au noeud : sinon un parent et son enfant comptent deux
        // fois pour la meme phrase, et tout finirait par sembler repete.
        const own = $(el)
            .clone()
            .children()
            .remove()
            .end()
            .text()
            .replace(/\s+/g, ' ')
            .trim();
        if (own.length < BOILERPLATE_MIN_CHARS) return;
        if (!seen.has(own)) seen.set(own, []);
        seen.get(own).push(el);
    });
    for (const nodes of seen.values())
        if (nodes.length >= BOILERPLATE_MIN_REPEATS)
            for (const el of nodes) $(el).remove();
}

/**
 * Le texte editorial d'une page, HTML retire.
 *
 * On coupe d'abord tout le chrome (navigation, pied de page, formulaires,
 * scripts) puis on prefere `<article>` ou `<main>` s'ils existent : sur un site
 * marchand, le corps de page est noye dans des listes de produits et des menus
 * qui fausseraient completement les densites.
 *
 * Les balises semantiques ne suffisent pas. Un forum comme developpez.net n'a ni
 * `<article>` ni `<main>`, et range sa navigation dans des `<div>` : le perimetre
 * retombait donc sur `<body>` et le brief comptait `inscription`, `membre` et
 * `messages` comme du vocabulaire de metier, sur quatorze pages. D'ou le second
 * jeu de selecteurs, sur les classes et identifiants les plus repandus.
 */
export function extractText(html) {
    const $ = cheerio.load(html);
    $(
        'script, style, noscript, template, svg, nav, header, footer, aside, form, iframe, ' +
            '[role="navigation"], [role="banner"], [role="contentinfo"], .cookie, #cookie'
    ).remove();
    stripChrome($);
    stripLinkLists($);
    stripRepeatedBlocks($);
    const scope = $('article').first().length
        ? $('article').first()
        : $('main').first().length
          ? $('main').first()
          : $('body');

    // `.text()` concatene sans separateur : une ligne de tableau
    // `<td>jusqu'a</td><th>Entretien</th>` devient « jusqu'aEntretien », un
    // token fantome qui fait disparaitre deux mots reels du comptage. On insere
    // donc une frontiere explicite apres chaque element avant d'aplatir. Le prix
    // est de couper parfois un mot enveloppe dans un `<em>`, ce qui est sans
    // commune mesure avec le fait de souder toutes les cellules d'un tableau.
    scope.find('*').each((_, el) => $(el).after(' '));

    return scope.text().replace(/\s+/g, ' ').trim();
}

/** Telecharge et nettoie une page. Un `skipped` motive remplace le comptage. */
export async function loadDocument({ url, title }) {
    try {
        const res = await fetchWithTimeout(url, {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
        });
        if (!res.ok) return { url, title, skipped: `HTTP ${res.status}` };
        if (!(res.headers.get('content-type') ?? '').includes('html'))
            return { url, title, skipped: 'pas du HTML' };

        const text = extractText(
            decodeBody(await res.arrayBuffer(), res.headers.get('content-type'))
        );
        const tokens = tokenize(text);
        if (tokens.length < MIN_DOC_WORDS)
            return { url, title, skipped: `${tokens.length} mots utiles` };

        // On ne conserve que le decompte, jamais le texte : c'est tout ce que
        // l'agregation consomme, et cela rend le corpus serialisable.
        return {
            url,
            title,
            total: tokens.length,
            counts: Object.fromEntries(countTerms(tokens)),
        };
    } catch (err) {
        return {
            url,
            title,
            skipped:
                err.name === 'AbortError' ? 'timeout' : String(err.message),
        };
    }
}

/**
 * Aspire le corpus d'une requete : SERP puis pages, en parallele borne.
 *
 * Renvoie aussi bien les documents retenus que les pages ecartees, avec leur
 * motif : un corpus qui maigrit silencieusement produirait des quantiles calcules
 * sur trois pages sans que rien ne le signale.
 *
 * @param {string} query
 * @param {{top?: number, apiKey: string, locale?: string}} options
 * @returns {Promise<{results: number, docs: import('./terms.d.mts').SeoDocument[], dropped: {url: string, title: string, skipped: string}[]}>}
 */
export async function fetchCorpus(
    query,
    { top = DEFAULT_TOP, apiKey, locale = DEFAULT_LOCALE }
) {
    const results = await searchSerp(query, top, apiKey, locale);
    const loaded = await mapLimit(results, FETCH_CONCURRENCY, loadDocument);
    return {
        results: results.length,
        docs: loaded.filter(d => !d.skipped),
        dropped: loaded.filter(d => d.skipped),
    };
}

/**
 * Le brief complet pour une requete, corpus compris.
 *
 * C'est le point d'entree unique de la generation : le CLI et la route
 * `/api/seo/brief` l'appellent tous les deux, pour que rien ne puisse diverger
 * entre ce que produit la ligne de commande et ce que voit le back-office.
 */
export async function generateBrief(
    query,
    { top = DEFAULT_TOP, apiKey, locale = DEFAULT_LOCALE }
) {
    const corpus = await fetchCorpus(query, { top, apiKey, locale });
    return { ...corpus, brief: buildBrief(query, corpus.docs) };
}

// --- Mode Suggest (sans cle) --------------------------------------------

/**
 * Les completions reelles de Google pour `query` + chaque amorce.
 *
 * Sert quand on n'a pas de cle SERP : la frequence des mots dans ces requetes
 * est un proxy honnete du champ lexical, et surtout elle revele l'intention
 * (transactionnelle ou informationnelle) que le seul corpus ne montre pas.
 */
export async function suggestSoup(query) {
    const seen = new Set();
    await mapLimit(SUGGEST_SEEDS, FETCH_CONCURRENCY, async seed => {
        const params = new URLSearchParams({
            client: 'firefox',
            hl: 'fr',
            gl: 'fr',
            // Sans ces deux parametres l'endpoint repond en ISO-8859-1 et tous
            // les accents reviennent en caracteres de remplacement.
            ie: 'utf-8',
            oe: 'utf-8',
            q: seed ? `${query} ${seed}` : query,
        });
        try {
            const res = await fetchWithTimeout(`${SUGGEST_ENDPOINT}?${params}`);
            if (!res.ok) return;
            const [, list] = JSON.parse(await res.text());
            for (const s of list ?? []) seen.add(s);
        } catch {
            /* une amorce muette n'invalide pas la recolte */
        }
    });
    return [...seen].sort();
}
