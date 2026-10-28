import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth.config';
import { DEFAULT_TOP, ENV_KEY, generateBrief } from '@/lib/seo/serp.mjs';

/**
 * Genere le brief lexical d'une requete, pour le panneau de score de l'editeur.
 *
 * C'est le seul moment de la chaine qui sort sur le reseau : une requete Brave,
 * puis le telechargement des pages qui rankent. Une vingtaine de secondes, une
 * fois par article et par locale. La notation elle-meme est purement locale
 * (`scoreText`) et ne repasse jamais par ici.
 *
 * La reponse n'est pas ecrite en base : elle repart dans le formulaire, et ne
 * devient une donnee que quand l'article est enregistre.
 *
 * Methode complete : `docs/specs/seo-score.md`.
 */

/**
 * Une generation prend ~20 s (40 pages en parallele borne). La valeur par
 * defaut de la plateforme est plus courte, et la coupure tomberait pile au
 * moment ou le travail est presque fini.
 */
export const maxDuration = 60;

/**
 * Plafond du nombre de resultats demandes a la SERP. Brave rend 20 resultats
 * par appel, donc 100 coute 5 requetes sur les 2000 mensuelles : c'est la
 * borne qui empeche un `top` saisi de travers de vider le quota d'un coup.
 */
const MAX_TOP = 100;

/** En dessous, les quantiles se calculent sur trop peu de pages pour valoir. */
const MIN_CORPUS = 5;

export async function POST(req: NextRequest) {
    // Sans ce garde-fou, n'importe qui declenche 40 telechargements sortants
    // depuis le serveur et brule le quota Brave.
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }

    const { query, top, locale } = body as {
        query?: unknown;
        top?: unknown;
        locale?: unknown;
    };
    if (typeof query !== 'string' || !query.trim()) {
        return NextResponse.json(
            { error: 'query must be a non-empty string' },
            { status: 400 }
        );
    }
    if (
        top !== undefined &&
        (typeof top !== 'number' || !Number.isFinite(top))
    ) {
        return NextResponse.json(
            { error: 'top must be a number' },
            { status: 400 }
        );
    }

    // La cle reste cote serveur : elle n'a volontairement pas de prefixe
    // NEXT_PUBLIC_, et rien ici ne la renvoie au navigateur, pas meme en erreur.
    const apiKey = process.env[ENV_KEY];
    if (!apiKey) {
        return NextResponse.json(
            { error: `${ENV_KEY} is not configured on this server` },
            { status: 500 }
        );
    }

    try {
        const { brief, docs, dropped, results } = await generateBrief(
            query.trim(),
            {
                top: Math.min(
                    Math.max(Number(top) || DEFAULT_TOP, 10),
                    MAX_TOP
                ),
                apiKey,
                // Le marche interroge suit la locale de la traduction : une
                // requete anglaise sur la SERP francaise ne renvoie pas le
                // corpus contre lequel l'article anglais concourt.
                locale: locale === 'en' ? 'en' : 'fr',
            }
        );

        if (docs.length < MIN_CORPUS) {
            return NextResponse.json(
                {
                    error: `corpus trop maigre : ${docs.length} pages exploitables sur ${results}`,
                },
                { status: 422 }
            );
        }

        // Les documents eux-memes ne repartent pas : seuls leurs decomptes ont
        // servi, et les renvoyer ferait une reponse de plusieurs mega-octets.
        return NextResponse.json({
            brief,
            corpus: { results, usable: docs.length, dropped: dropped.length },
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'brief failed' },
            { status: 502 }
        );
    }
}
