/**
 * Scores a page the way an AI crawler sees it: over HTTP, with a crawler
 * User-Agent, on the HTML actually served. It never imports the app, so it
 * measures what a GPTBot receives rather than what the code claims to produce
 * (client-only content, for instance, scores as the crawler sees it: absent).
 *
 * Usage:
 *   npm run geo:audit -- --slug <slug>        one article, both locales
 *   npm run geo:audit -- --all                every article in /sitemap.xml
 *   npm run geo:audit -- --url /fr/blog/x     an arbitrary path
 *   npm run geo:audit -- --preview <token>    a draft (content checks only)
 *   npm run geo:audit -- --mono              a deliberately single-locale article
 *   npm run geo:audit -- --base https://ninhache.fr
 *   npm run geo:audit -- --json               machine-readable output
 *   ... | npm run geo:audit -- logs           nginx access log on stdin
 *
 * Exit code is 0 unless the run itself failed; a bad score is a report, not an
 * error, so this stays usable in a watch loop.
 */
import * as cheerio from 'cheerio';

/** What the score is out of, per category. The four sum to 100. */
const WEIGHTS = { A: 25, B: 25, C: 35, D: 15 };

const CATEGORY_NAMES = {
    A: 'Surface machine',
    B: 'Structure sans JS',
    C: 'Citabilite GEO',
    D: 'Parite FR / EN',
};

/** Letter grades. First threshold reached, reading top down. */
const GRADES = [
    [90, 'A'],
    [78, 'B'],
    [65, 'C'],
    [50, 'D'],
];

const LOCALES = ['fr', 'en'];

// Thresholds. Named here rather than inline so a disagreement about the
// barometer is a one-line edit and not a hunt through the checks.
const TITLE_MIN = 30;
const TITLE_MAX = 65;
const DESC_MIN = 70;
const DESC_MAX = 165;
/** A self-contained opening paragraph: long enough to quote, short enough to lift whole. */
const LEAD_MIN_WORDS = 40;
const LEAD_MAX_WORDS = 90;
/** An assistant cites passages, not pages: sections must be liftable on their own. */
const SECTION_MIN_WORDS = 120;
const SECTION_MAX_WORDS = 400;
/** Numbers and dates per 100 words. Below this the prose asserts without grounding. */
const FACT_DENSITY_MIN = 1.5;
/** How much of the Markdown twin's text must survive into the server-rendered HTML. */
const SSR_TEXT_RATIO_MIN = 0.8;
/** Word-count ratio between locales. Outside this, one side is a truncated translation. */
const PARITY_MIN = 0.8;
const PARITY_MAX = 1.25;

/** Openers that make a first sentence depend on a sentence that is not there. */
const ANAPHORA = ['cela', 'ca', 'donc', 'this', 'it'];

/**
 * French function words that have no business in an English slug (and vice
 * versa). Presence of one is the signal the localised-slug work removes.
 */
const FRENCH_SLUG_WORDS = [
    'sans',
    'des',
    'les',
    'pour',
    'donnees',
    'quon',
    'avec',
    'dans',
    'une',
    'aux',
    'ecrire',
    'travers',
    'monde',
];
const ENGLISH_SLUG_WORDS = [
    'the',
    'with',
    'without',
    'from',
    'why',
    'how',
    'across',
    'data',
    'built',
    'building',
];

const UA =
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot';

// ---------------------------------------------------------------- arguments

function parseArgs(argv) {
    const args = {
        base: process.env.GEO_AUDIT_BASE || 'http://localhost:3001',
    };
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--json') args.json = true;
        else if (a === '--all') args.all = true;
        else if (a === '--mono') args.mono = true;
        else if (a === '--slug') args.slug = argv[++i];
        else if (a === '--url') args.url = argv[++i];
        else if (a === '--preview') args.preview = argv[++i];
        else if (a === '--base') args.base = argv[++i];
        else rest.push(a);
    }
    if (rest.includes('logs')) args.logs = true;
    args.base = args.base.replace(/\/$/, '');
    return args;
}

// ------------------------------------------------------------------ fetching

/** GET as a crawler. Never throws: a dead URL is a finding, not a crash. */
async function get(url) {
    try {
        const res = await fetch(url, {
            headers: { 'user-agent': UA, accept: '*/*' },
            redirect: 'follow',
        });
        const body = await res.text();
        return {
            url,
            finalUrl: res.url,
            status: res.status,
            headers: res.headers,
            body,
            redirected: res.url !== url,
        };
    } catch (err) {
        return { url, finalUrl: url, status: 0, body: '', error: String(err) };
    }
}

/** Status only, for asset reachability (og:image). */
async function status(url) {
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'user-agent': UA, range: 'bytes=0-0' },
        });
        return res.status;
    } catch {
        return 0;
    }
}

// ------------------------------------------------------------------- helpers

const words = text =>
    (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

function median(list) {
    if (!list.length) return 0;
    const sorted = [...list].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const strip = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The article body, chrome removed, so header/footer text never inflates a count. */
function articleRoot($) {
    const root = $('article').first().length
        ? $('article').first()
        : $('main').first().length
          ? $('main').first()
          : $('body');
    root.find('script, style, noscript, nav, footer').remove();
    return root;
}

/**
 * The opening block of prose.
 *
 * Not simply the first `<p>`: the `<Lead>` component renders a `<div>` (a `<p>`
 * inside a `<p>` is invalid HTML), so keying on `p` silently measured the first
 * paragraph of the first section instead of the lede. Any block whose text is
 * substantial and which contains no heading, list or figure qualifies.
 */
function leadText($, root) {
    let lead = '';
    root.find('p, div').each((_, el) => {
        const $el = $(el);
        if (
            $el.find(
                'h1, h2, h3, h4, h5, h6, ul, ol, table, figure, blockquote, pre'
            ).length
        )
            return;
        const text = $el.text().trim();
        if (words(text) < 10) return;
        lead = text;
        return false;
    });
    return lead;
}

const meta = ($, name) =>
    $(`meta[property="${name}"]`).attr('content') ??
    $(`meta[name="${name}"]`).attr('content') ??
    '';

const abs = (base, href) =>
    href?.startsWith('http') ? href : `${base}${href}`;

/**
 * Canonicals and hreflang are absolute against the production domain, so a local
 * run compares `https://ninhache.fr/fr/blog/x` with `http://localhost:3010/fr/blog/x`.
 * Comparing paths is what makes the same rule true in both places; the host is
 * checked separately, and only where it can mean something.
 */
const pathOf = href => {
    try {
        return new URL(href, 'http://x').pathname.replace(/\/$/, '');
    } catch {
        return '';
    }
};

/** The same document, addressed on the host actually under audit. */
const onBase = (base, href) => `${base}${pathOf(href)}`;

const isLocal = base => /^https?:\/\/(localhost|127\.0\.0\.1)/.test(base);

// -------------------------------------------------------------------- checks

/**
 * One check. `points` is what it is worth; a check whose `applicable` is false
 * leaves the denominator instead of scoring zero, which is what keeps a draft
 * (no JSON-LD, no sitemap entry) from being graded F for being a draft.
 */
const check = (id, points, ok, detail, fix) => ({
    id,
    points,
    ok: !!ok,
    applicable: true,
    detail,
    fix,
});
const skip = (id, points, detail) => ({
    id,
    points,
    ok: false,
    applicable: false,
    detail,
    fix: null,
});

/** A. What a machine reads before it reads a word of prose. */
async function categoryA(page, ctx) {
    if (ctx.mode === 'preview')
        return [
            skip(
                'a',
                WEIGHTS.A,
                'brouillon: noindex, sans JSON-LD ni metadonnees sociales'
            ),
        ];

    const { $, base } = page;
    const out = [];

    const title = $('title').first().text().trim();
    out.push(
        check(
            'a-title',
            3,
            title.length >= TITLE_MIN && title.length <= TITLE_MAX,
            `title ${title.length} car.`,
            `viser ${TITLE_MIN}-${TITLE_MAX} caracteres: "${title.slice(0, 70)}"`
        )
    );

    const desc = meta($, 'description');
    out.push(
        check(
            'a-desc',
            3,
            desc.length >= DESC_MIN && desc.length <= DESC_MAX,
            `description ${desc.length} car.`,
            `viser ${DESC_MIN}-${DESC_MAX} caracteres (excerpt de l'article)`
        )
    );

    const canonical = $('link[rel="canonical"]').attr('href') || '';
    const hostOk =
        isLocal(base) ||
        (canonical.startsWith('http') &&
            new URL(canonical).host === new URL(page.finalUrl).host);
    const selfRef =
        !!canonical && pathOf(canonical) === pathOf(page.finalUrl) && hostOk;
    out.push(
        check(
            'a-canonical',
            3,
            selfRef,
            !canonical
                ? 'absente'
                : selfRef
                  ? 'auto-referente'
                  : `pointe ${canonical}`,
            'la canonical doit nommer la page elle-meme'
        )
    );

    const alternates = {};
    $('link[rel="alternate"][hreflang]').each((_, el) => {
        const lang = $(el).attr('hreflang');
        if (lang && lang !== 'x-default') alternates[lang] = $(el).attr('href');
    });
    const complete = LOCALES.every(l => alternates[l]);
    let reciprocal = false;
    if (complete) {
        const other = LOCALES.find(l => l !== page.locale);
        const twin = await get(onBase(base, alternates[other]));
        if (twin.status === 200) {
            const $t = cheerio.load(twin.body);
            const back = $t(
                `link[rel="alternate"][hreflang="${page.locale}"]`
            ).attr('href');
            reciprocal = !!back && pathOf(back) === pathOf(page.finalUrl);
        }
    }
    out.push(
        check(
            'a-hreflang',
            5,
            complete && reciprocal,
            complete
                ? reciprocal
                    ? 'complet et reciproque'
                    : 'complet mais NON reciproque'
                : `incomplet (${Object.keys(alternates).join(', ') || 'aucun'})`,
            'chaque locale doit pointer le slug de l autre, et en retour'
        )
    );

    const social = [
        'og:title',
        'og:description',
        'og:image',
        'og:type',
        'og:url',
        'twitter:card',
        'twitter:title',
    ];
    const missing = social.filter(k => !meta($, k));
    out.push(
        check(
            'a-og',
            4,
            missing.length === 0,
            missing.length ? `manque ${missing.join(', ')}` : 'complet',
            'completer les balises og: et twitter:'
        )
    );

    const ogImage = meta($, 'og:image');
    const imgStatus = ogImage ? await status(abs(base, ogImage)) : 0;
    out.push(
        check(
            'a-og-image',
            2,
            imgStatus === 200,
            ogImage ? `og:image ${imgStatus}` : 'og:image absente',
            'og:image doit repondre 200'
        )
    );

    let ld = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const parsed = JSON.parse($(el).contents().text());
            const nodes = parsed['@graph'] || [parsed];
            const posting = nodes.find(n =>
                /Posting|Article/.test(n['@type'] || '')
            );
            if (posting) ld = posting;
        } catch {
            /* a JSON-LD block that does not parse is the same as none */
        }
    });
    const h1 = $('h1').first().text().trim();
    const ldFields = ld
        ? ['datePublished', 'dateModified', 'author', 'wordCount'].filter(
              f => !ld[f]
          )
        : null;
    out.push(
        check(
            'a-jsonld',
            3,
            ld && ldFields.length === 0 && ld.headline?.trim() === h1,
            !ld
                ? 'aucun BlogPosting exploitable'
                : ldFields.length
                  ? `manque ${ldFields.join(', ')}`
                  : ld.headline?.trim() === h1
                    ? 'complet, headline == h1'
                    : 'headline != h1',
            'BlogPosting avec headline == h1, dates, author et wordCount'
        )
    );

    const path = new URL(page.finalUrl).pathname;
    out.push(
        check(
            'a-sitemap',
            1,
            ctx.sitemap.includes(path),
            ctx.sitemap.includes(path) ? 'present' : 'absent du sitemap',
            'l URL doit figurer dans /sitemap.xml'
        )
    );
    out.push(
        check(
            'a-llms',
            1,
            ctx.llms.includes(path),
            ctx.llms.includes(path) ? 'present' : 'absent de llms.txt',
            'l URL doit figurer dans /llms.txt'
        )
    );
    return out;
}

/** B. What survives with JavaScript switched off. */
async function categoryB(page, ctx) {
    const { $ } = page;
    const root = articleRoot($);
    const out = [];

    const h1Count = $('h1').length;
    out.push(
        check(
            'b-h1',
            4,
            h1Count === 1,
            `${h1Count} h1`,
            'exactement un h1 par page'
        )
    );

    const h2s = root.find('h2');
    out.push(
        check(
            'b-h2',
            3,
            h2s.length >= 3,
            `${h2s.length} h2`,
            'au moins trois h2'
        )
    );

    const levels = [];
    root.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
        levels.push(Number(el.tagName[1]));
    });
    let skipAt = null;
    for (let i = 1; i < levels.length; i++)
        if (levels[i] - levels[i - 1] > 1 && skipAt === null) skipAt = i;
    out.push(
        check(
            'b-levels',
            3,
            skipAt === null,
            skipAt === null
                ? 'aucun saut de niveau'
                : `saut h${levels[skipAt - 1]} -> h${levels[skipAt]}`,
            'ne pas sauter de niveau de titre'
        )
    );

    out.push(
        check(
            'b-article',
            2,
            $('article').length > 0,
            $('article').length ? 'present' : 'absent',
            'envelopper le contenu dans <article>'
        )
    );

    // A draft has no publication date yet, so the page legitimately renders no
    // `<time>`: the check would be measuring the draft state, not the markup.
    const times = $('time[datetime]').length;
    out.push(
        ctx.mode === 'preview'
            ? skip('b-time', 2, 'brouillon non publie: pas encore de date')
            : check(
                  'b-time',
                  2,
                  times > 0,
                  times ? `${times} <time datetime>` : 'aucune date machine',
                  'exposer la date de publication en <time datetime>'
              )
    );

    // Scoped to the body: the cover is decorative and carries `alt=""` on purpose,
    // since a screen reader would otherwise read the title twice. An article with
    // no images at all cannot fail an alt check, so the check steps aside instead
    // of pretending to have measured something.
    const body = root.find('.prose').first().length
        ? root.find('.prose').first()
        : root;
    // `aria-hidden` images are decorative by declaration (a banner behind
    // real text): they are meant to carry no alt, so counting them as
    // failures would push the page toward worse accessibility, not better.
    const imgs = body
        .find('img')
        .filter((_, el) => $(el).attr('aria-hidden') !== 'true');
    const noAlt = imgs.filter(
        (_, el) => !($(el).attr('alt') || '').trim()
    ).length;
    out.push(
        imgs.length
            ? check(
                  'b-alt',
                  3,
                  noAlt === 0,
                  `${noAlt} image(s) sans alt sur ${imgs.length}`,
                  'un alt descriptif sur chaque image de contenu'
              )
            : skip('b-alt', 3, 'aucune image dans le corps')
    );

    if (ctx.mode === 'preview' || !page.slug) {
        out.push(skip('b-md', 3, 'pas de jumeau .md pour un brouillon'));
        out.push(skip('b-ssr', 5, 'pas de jumeau .md pour un brouillon'));
        return out;
    }

    const twin = await get(`${page.base}/${page.locale}/blog/${page.slug}.md`);
    const type = twin.headers?.get('content-type') || '';
    out.push(
        check(
            'b-md',
            3,
            twin.status === 200 && type.includes('text/markdown'),
            `jumeau .md ${twin.status} ${type.split(';')[0]}`,
            'servir /blog/<slug>.md en text/markdown'
        )
    );

    const mdWords = words(twin.body.replace(/^---[\s\S]*?---/, ''));
    const htmlWords = words(root.text());
    const ratio = mdWords ? htmlWords / mdWords : 0;
    out.push(
        check(
            'b-ssr',
            5,
            ratio >= SSR_TEXT_RATIO_MIN,
            `${htmlWords} mots rendus / ${mdWords} en Markdown (${ratio.toFixed(2)})`,
            'du contenu n arrive pas dans le HTML servi (rendu client)'
        )
    );
    return out;
}

/** C. What makes a passage worth quoting rather than skimming. */
function categoryC(page) {
    const { $, base } = page;
    const root = articleRoot($);
    const out = [];

    const lead = leadText($, root);
    const leadWords = words(lead);
    out.push(
        check(
            'c-lead',
            5,
            leadWords >= LEAD_MIN_WORDS && leadWords <= LEAD_MAX_WORDS,
            `chapeau ${leadWords} mots`,
            `viser ${LEAD_MIN_WORDS}-${LEAD_MAX_WORDS} mots, autoportant`
        )
    );
    const firstWord = strip(lead.split(/\s+/)[0] || '').replace(/[^a-z']/g, '');
    out.push(
        check(
            'c-lead-anaphora',
            3,
            !ANAPHORA.includes(firstWord),
            firstWord ? `commence par "${firstWord}"` : 'chapeau vide',
            'ouvrir sur une phrase qui se suffit a elle-meme'
        )
    );

    const sections = [];
    root.find('h2').each((_, el) => {
        let n = $(el).next();
        let count = 0;
        while (n.length && !/^h[12]$/i.test(n[0].tagName || '')) {
            count += words(n.text());
            n = n.next();
        }
        sections.push(count);
    });
    const med = median(sections);
    out.push(
        check(
            'c-granularity',
            7,
            med >= SECTION_MIN_WORDS && med <= SECTION_MAX_WORDS,
            `mediane ${med} mots par section (${sections.length} sections)`,
            `viser ${SECTION_MIN_WORDS}-${SECTION_MAX_WORDS} mots par h2`
        )
    );

    // Structures are detected on semantics, not on class names: a styled panel
    // that renders as a <ul> is extractable, one that renders as a <div> is not,
    // whatever the component is called.
    const kinds = [];
    if (root.find('table').length) kinds.push('tableau');
    if (
        root.find('ul, ol').filter((_, el) => $(el).children('li').length >= 3)
            .length
    )
        kinds.push('liste');
    if (root.find('dl').length) kinds.push('liste de definitions');
    if (root.find('details').length) kinds.push('details');
    if (root.find('figure figcaption').length) kinds.push('figure legendee');
    if (root.find('blockquote').length) kinds.push('citation');
    out.push(
        check(
            'c-structures',
            6,
            kinds.length >= 2,
            kinds.length ? kinds.join(', ') : 'aucune',
            'au moins deux structures extractibles (tableau, liste, dl, figure legendee)'
        )
    );

    const questions = root
        .find('h2, h3')
        .filter((_, el) => $(el).text().includes('?')).length;
    out.push(
        check(
            'c-question',
            4,
            questions >= 1,
            `${questions} titre(s) en question`,
            'au moins un titre formule comme la question posee a l assistant'
        )
    );

    const bodyText = root.text();
    const bodyWords = words(bodyText);
    const numbers = (bodyText.match(/\b\d+([.,]\d+)?\b|\b\d{4}\b/g) || [])
        .length;
    const density = bodyWords ? (numbers / bodyWords) * 100 : 0;
    out.push(
        check(
            'c-facts',
            4,
            density >= FACT_DENSITY_MIN,
            `${density.toFixed(1)} chiffres / 100 mots`,
            `viser ${FACT_DENSITY_MIN}+ : dates, volumes, versions, mesures`
        )
    );

    const host = new URL(base).host;
    const outbound = new Set();
    let internal = 0;
    const here = new URL(page.finalUrl).pathname;
    root.find('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (/^https?:\/\//.test(href)) {
            const h = new URL(href).host;
            if (h !== host) outbound.add(h);
            return;
        }
        if (href.startsWith('#') || href.startsWith('mailto:')) return;
        const path = href.startsWith('/')
            ? href
            : `${here.replace(/\/[^/]*$/, '')}/${href}`;
        if (/\/blog\//.test(path) && path !== here) internal++;
    });
    out.push(
        check(
            'c-outbound',
            3,
            outbound.size >= 2,
            `${outbound.size} domaine(s) cite(s)`,
            'citer au moins deux sources externes distinctes'
        )
    );
    out.push(
        check(
            'c-internal',
            3,
            internal >= 1,
            `${internal} lien(s) vers un autre article`,
            'lier au moins un autre article du blog'
        )
    );
    return out;
}

/** D. Whether the second locale is a real page or a decorative one. */
function categoryD(pages, ctx) {
    const out = [];
    if (ctx.mono)
        return [
            skip(
                'd',
                WEIGHTS.D,
                'article monolingue assume: la parite ne s applique pas'
            ),
        ];

    const [fr, en] = LOCALES.map(l => pages[l]);

    const both = fr?.status === 200 && en?.status === 200;
    out.push(
        check(
            'd-both',
            5,
            both,
            both
                ? 'les deux locales repondent 200'
                : `fr ${fr?.status} / en ${en?.status}`,
            'chaque article doit exister dans les deux locales'
        )
    );
    if (!both) {
        out.push(skip('d-ratio', 4, 'une locale manque'));
        out.push(skip('d-distinct', 3, 'une locale manque'));
        out.push(skip('d-slug', 3, 'une locale manque'));
        return out;
    }

    const wf = words(articleRoot(fr.$).text());
    const we = words(articleRoot(en.$).text());
    const ratio = wf && we ? Math.min(wf, we) / Math.max(wf, we) : 0;
    const tf = fr.$('h1').first().text().trim();
    const te = en.$('h1').first().text().trim();
    const distinct = tf && te && tf !== te;

    // Without an English translation the English URL serves the French one, word
    // for word. Scoring that as perfect parity would be the opposite of true, so
    // the ratio steps aside and the missing translation is reported once, below.
    if (!distinct)
        out.push(
            skip(
                'd-ratio',
                4,
                'la locale en rend la traduction fr telle quelle'
            )
        );
    else
        out.push(
            check(
                'd-ratio',
                4,
                ratio >= PARITY_MIN && ratio <= PARITY_MAX,
                `${wf} mots fr / ${we} mots en (${ratio.toFixed(2)})`,
                'une des deux versions est tronquee ou absente'
            )
        );

    out.push(
        check(
            'd-distinct',
            3,
            distinct,
            distinct
                ? 'titres distincts'
                : 'titres identiques: la traduction manque',
            'traduire reellement titre et excerpt, pas seulement l URL'
        )
    );

    if (ctx.mode === 'preview') {
        out.push(
            skip(
                'd-slug',
                3,
                'un brouillon est servi sous un token, pas sous un slug'
            )
        );
        return out;
    }
    const offenders = [];
    for (const loc of LOCALES) {
        const slug = strip(
            new URL(pages[loc].finalUrl).pathname.split('/').pop() || ''
        );
        const bad = (
            loc === 'en' ? FRENCH_SLUG_WORDS : ENGLISH_SLUG_WORDS
        ).filter(w => slug.split('-').includes(w));
        if (bad.length) offenders.push(`${loc}: ${slug} (${bad.join(', ')})`);
    }
    out.push(
        check(
            'd-slug',
            3,
            offenders.length === 0,
            offenders.length
                ? offenders.join(' | ')
                : 'chaque slug est dans sa langue',
            'le slug est souvent le seul texte lu avant d ouvrir le lien'
        )
    );
    return out;
}

// -------------------------------------------------------------------- runner

async function loadPage(base, path, locale) {
    const res = await get(`${base}${path}`);
    const $ = cheerio.load(res.body || '');
    const finalPath = new URL(res.finalUrl).pathname;
    return {
        ...res,
        $,
        base,
        locale,
        slug: finalPath.split('/').pop(),
        path: finalPath,
    };
}

async function siteContext(base, mode, mono) {
    if (mode === 'preview') return { mode, mono, sitemap: '', llms: '' };
    const [sitemap, llms] = await Promise.all([
        get(`${base}/sitemap.xml`),
        get(`${base}/llms.txt`),
    ]);
    return { mode, mono, sitemap: sitemap.body || '', llms: llms.body || '' };
}

async function auditPair(pages, ctx) {
    const groups = {};
    const primary = pages.fr?.status === 200 ? pages.fr : pages.en;
    // Every check reads an empty DOM as a failure, so a mistyped slug used to
    // come back as a detailed F rather than as the 404 it is.
    if (!primary || primary.status !== 200)
        throw new Error(
            `${pages.fr?.url || pages.en?.url} repond ${pages.fr?.status ?? pages.en?.status}`
        );
    groups.A = await categoryA(primary, ctx);
    groups.B = await categoryB(primary, ctx);
    groups.C = categoryC(primary);
    groups.D = categoryD(pages, ctx);

    const scored = {};
    let got = 0;
    let max = 0;
    for (const [key, checks] of Object.entries(groups)) {
        const usable = checks.filter(c => c.applicable);
        const g = usable.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
        const m = usable.reduce((s, c) => s + c.points, 0);
        scored[key] = { checks, got: g, max: m };
        got += g;
        max += m;
    }
    const score = max ? Math.round((got / max) * 100) : 0;
    const grade = GRADES.find(([t]) => score >= t)?.[1] || 'F';
    return { url: primary.finalUrl, groups: scored, score, grade };
}

// ------------------------------------------------------------------ reporting

const BAR = '-'.repeat(64);

function report(result) {
    console.log(`\nGEO audit  ${result.url}`);
    console.log(BAR);
    for (const [key, g] of Object.entries(result.groups)) {
        const label = `${key}. ${CATEGORY_NAMES[key]}`.padEnd(26);
        const line = g.max
            ? `${String(g.got).padStart(2)} / ${String(g.max).padEnd(2)}`
            : ' hors bareme';
        console.log(`${label} ${line}`);
        for (const c of g.checks) {
            const mark = !c.applicable ? '~' : c.ok ? '+' : 'x';
            console.log(`   ${mark} ${c.id.padEnd(16)} ${c.detail}`);
        }
    }
    console.log(BAR);
    console.log(`Score ${result.score} / 100     grade ${result.grade}`);

    const failed = Object.values(result.groups)
        .flatMap(g => g.checks)
        .filter(c => c.applicable && !c.ok)
        .sort((a, b) => b.points - a.points);
    if (!failed.length) {
        console.log('\nRien a corriger.');
        return;
    }
    console.log('\nA corriger, par points perdus');
    for (const c of failed)
        console.log(
            `  -${String(c.points).padEnd(2)} ${c.id}: ${c.detail}\n      ${c.fix}`
        );
}

function reportAll(results) {
    console.log(`\n${'slug'.padEnd(46)} score  grade`);
    console.log(BAR);
    for (const r of results) {
        const slug = new URL(r.url).pathname.split('/').pop();
        console.log(
            `${slug.slice(0, 45).padEnd(46)}${String(r.score).padStart(4)}   ${r.grade}`
        );
    }
    console.log(BAR);
    const avg = Math.round(
        results.reduce((s, r) => s + r.score, 0) / results.length
    );
    console.log(`moyenne ${avg} / 100 sur ${results.length} articles`);

    const tally = new Map();
    for (const r of results)
        for (const c of Object.values(r.groups).flatMap(g => g.checks))
            if (c.applicable && !c.ok)
                tally.set(c.id, {
                    n: (tally.get(c.id)?.n || 0) + 1,
                    fix: c.fix,
                    points: c.points,
                });
    const ranked = [...tally.entries()].sort(
        (a, b) => b[1].n * b[1].points - a[1].n * a[1].points
    );
    console.log('\nEchecs les plus couteux sur l ensemble du blog');
    for (const [id, t] of ranked.slice(0, 8))
        console.log(
            `  ${String(t.n).padStart(2)} articles  -${t.points}  ${id}: ${t.fix}`
        );
}

// ----------------------------------------------------------------- logs mode

/** Crawlers that read to train, versus those that read to answer a live question. */
const TRAINING_BOTS = [
    'GPTBot',
    'ClaudeBot',
    'Google-Extended',
    'CCBot',
    'Bytespider',
];
const FETCH_BOTS = [
    'ChatGPT-User',
    'Claude-User',
    'OAI-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
];
const AI_REFERRERS = [
    'chatgpt.com',
    'perplexity.ai',
    'claude.ai',
    'copilot.microsoft.com',
];

async function readStdin() {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
}

async function logsMode() {
    const raw = await readStdin();
    const lines = raw.split('\n').filter(Boolean);
    const bots = new Map();
    const paths = new Set();
    const notFound = new Map();
    const referrers = new Map();
    let training = 0;
    let fetching = 0;

    for (const line of lines) {
        const m = line.match(/"(?:GET|HEAD) (\S+) HTTP\/[\d.]+" (\d{3})/);
        const agent = line.match(/"([^"]*)"\s*$/)?.[1] || '';
        const referrer = line.match(/"([^"]*)" "[^"]*"\s*$/)?.[1] || '';
        const bot = [...TRAINING_BOTS, ...FETCH_BOTS].find(b =>
            agent.includes(b)
        );
        for (const r of AI_REFERRERS)
            if (referrer.includes(r))
                referrers.set(r, (referrers.get(r) || 0) + 1);
        if (!bot || !m) continue;
        bots.set(bot, (bots.get(bot) || 0) + 1);
        if (TRAINING_BOTS.includes(bot)) training++;
        else fetching++;
        if (m[2] === '404') notFound.set(m[1], (notFound.get(m[1]) || 0) + 1);
        else if (/\/blog\/[^/]+$/.test(m[1])) paths.add(m[1]);
    }

    console.log(`\n${lines.length} lignes lues`);
    console.log(BAR);
    for (const [bot, n] of [...bots].sort((a, b) => b[1] - a[1]))
        console.log(`  ${String(n).padStart(6)}  ${bot}`);
    console.log(BAR);
    console.log(`  entrainement ${training}   recuperation ${fetching}`);
    console.log(`  ${paths.size} articles distincts tires au moins une fois`);
    if (notFound.size) {
        console.log('\n404 pris par des bots');
        for (const [p, n] of [...notFound]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10))
            console.log(`  ${String(n).padStart(4)}  ${p}`);
    }
    if (referrers.size) {
        console.log('\nVisites referencees depuis une IA');
        for (const [r, n] of [...referrers].sort((a, b) => b[1] - a[1]))
            console.log(`  ${String(n).padStart(4)}  ${r}`);
    }
}

// --------------------------------------------------------------------- main

/** Article paths in the sitemap, French side, one entry per article. */
function sitemapArticles(xml) {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    return locs
        .map(l => new URL(l).pathname)
        .filter(
            p => /^\/fr\/blog\/[^/]+$/.test(p) && !p.startsWith('/fr/blog/c/')
        );
}

async function run(fn) {
    try {
        return await fn();
    } catch (err) {
        console.error(`\n${err.message}`);
        process.exitCode = 1;
        return null;
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.logs) return logsMode();

    const mode = args.preview ? 'preview' : 'public';
    const ctx = await siteContext(args.base, mode, !!args.mono);

    if (args.preview) {
        const pages = {};
        for (const loc of LOCALES)
            pages[loc] = await loadPage(
                args.base,
                `/${loc}/blog/preview/${args.preview}`,
                loc
            );
        const result = await run(() => auditPair(pages, ctx));
        if (!result) return;
        return args.json
            ? console.log(JSON.stringify(result, null, 2))
            : report(result);
    }

    if (args.all) {
        const results = [];
        for (const path of sitemapArticles(ctx.sitemap)) {
            const pages = { fr: await loadPage(args.base, path, 'fr') };
            const enHref = pages.fr
                .$('link[rel="alternate"][hreflang="en"]')
                .attr('href');
            pages.en = await loadPage(
                args.base,
                enHref
                    ? new URL(enHref).pathname
                    : path.replace('/fr/', '/en/'),
                'en'
            );
            const one = await run(() => auditPair(pages, ctx));
            if (one) results.push(one);
        }
        if (!results.length) {
            console.error(
                `Aucun article dans ${args.base}/sitemap.xml (le serveur tourne-t-il ?)`
            );
            process.exitCode = 1;
            return;
        }
        return args.json
            ? console.log(JSON.stringify(results, null, 2))
            : reportAll(results);
    }

    const path = args.url || (args.slug ? `/fr/blog/${args.slug}` : null);
    if (!path) {
        console.error(
            'Usage: npm run geo:audit -- --slug <slug> | --all | --url <path> | --preview <token> | logs'
        );
        process.exitCode = 1;
        return;
    }
    const first = await loadPage(args.base, path, path.split('/')[1] || 'fr');
    const other = LOCALES.find(l => l !== first.locale);
    const href = first
        .$(`link[rel="alternate"][hreflang="${other}"]`)
        .attr('href');
    const pages = { [first.locale]: first };
    pages[other] = await loadPage(
        args.base,
        href
            ? new URL(href).pathname
            : first.path.replace(`/${first.locale}/`, `/${other}/`),
        other
    );
    const result = await run(() => auditPair(pages, ctx));
    if (!result) return;
    return args.json
        ? console.log(JSON.stringify(result, null, 2))
        : report(result);
}

await main();
