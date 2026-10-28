'use client';

import { ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GRADE_CLASS } from '@/components/articles/seo-grade-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { domText } from '@/lib/markdown/dom-text';
import { useCompiledMdx } from '@/lib/markdown/use-compiled-mdx';
import { type SeoBand, type SeoBrief, scoreText } from '@/lib/seo/terms.mjs';
import type { Locale } from '@/lib/types';

/** Delai apres la derniere frappe avant de recompiler et renoter. */
const DEBOUNCE_MS = 600;

/** Termes affiches avant de devoir demander le reste : un brief en compte 300+. */
const DEFAULT_ROWS = 60;

/** Ou lire la methode complete. Fichier du depot, pas une page servie. */
const SPEC_PATH = 'docs/specs/seo-score.md';

const BAND_LABEL: Record<SeoBand, string> = {
    manquant: 'manquant',
    'sous-utilise': 'sous-utilisé',
    ok: 'ok',
    'sur-optimise': 'sur-optimisé',
};

const BAND_CLASS: Record<SeoBand, string> = {
    manquant: 'bg-red-500/10 text-red-600',
    'sous-utilise': 'bg-amber-500/10 text-amber-600',
    ok: 'bg-emerald-500/10 text-emerald-600',
    'sur-optimise': 'bg-violet-500/10 text-violet-600',
};

const TIER_LABEL = {
    obligatoire: 'obligatoire',
    recommande: 'recommandé',
    complementaire: 'complémentaire',
} as const;

/** "24/08, 15:20" — le brief se perime, sa date doit rester sous les yeux. */
const formatStamp = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '?'
        : new Intl.DateTimeFormat('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
          }).format(d);
};

/**
 * Le nombre de concurrents reellement mesures.
 *
 * `requested` compte les pages aspirees, doublons compris ; c'est `kept` qui
 * sert de denominateur aux couvertures. Les afficher l'un pour l'autre
 * annoncerait soixante-dix-neuf concurrents la ou trente-six ont ete mesures.
 * Repli sur `requested` pour les briefs anterieurs au dedoublonnage, qui n'ont
 * pas de `kept` tant qu'ils n'ont pas ete regeneres.
 */
const countedPages = (brief: SeoBrief) =>
    brief.corpus.kept ?? brief.corpus.requested;

/** « 36 pages distinctes (34 copies ecartees) », ou « 36 pages » s'il n'y en a pas. */
const describeCorpus = (brief: SeoBrief) => {
    const doublons = brief.corpus.duplicates?.length ?? 0;
    return doublons === 0
        ? `${countedPages(brief)} pages`
        : `${countedPages(brief)} pages distinctes (${doublons} ${
              doublons === 1 ? 'copie écartée' : 'copies écartées'
          })`;
};

type Props = {
    /** Locale de l'onglet ouvert : un brief vaut pour une traduction, pas pour l'article. */
    locale: Locale;
    /** Compte dans le score : sur la page publique, le `h1` est dans `<article>`. */
    title: string;
    body: string;
    query: string;
    brief: SeoBrief | null;
    onQueryChange: (query: string) => void;
    onBriefChange: (brief: SeoBrief | null) => void;
};

/**
 * Score SEO vivant de la traduction en cours d'ecriture.
 *
 * Deux temps volontairement separes. Le **brief** (« Generer ») est le seul
 * moment reseau : une requete SERP, une quarantaine de pages concurrentes
 * telechargees, une vingtaine de secondes, une fois par article et par locale.
 * La **notation**, elle, est purement locale et retombe a chaque frappe : elle
 * ne fait que compter les mots du texte rendu et les comparer au brief garde en
 * memoire, donc elle ne coute ni reseau ni quota.
 *
 * Le texte mesure est le **rendu**, pas la source MDX : compter dans la source
 * gonfle les chiffres, parce que les URLs contiennent des mots-cles. Le panneau
 * compile donc le corps avec `useCompiledMdx`, le meme hook que la
 * previsualisation, dans un conteneur hors ecran dont il lit le texte.
 */
export function SeoScorePanel({
    locale,
    title,
    body,
    query,
    brief,
    onQueryChange,
    onBriefChange,
}: Props) {
    const [open, setOpen] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Le corps n'est recompile qu'une fois la frappe retombee : compiler du MDX
    // a chaque caractere rendrait la saisie collante sur un article long.
    // Changer d'onglet, en revanche, n'est pas frapper au clavier : le corps est
    // remplace d'un bloc, donc on bascule sans attendre la temporisation.
    const [settled, setSettled] = useState({ locale, body });
    const settledRef = useRef(settled);
    useEffect(() => {
        const commit = () => {
            settledRef.current = { locale, body };
            setSettled(settledRef.current);
        };
        if (settled.locale !== locale) {
            commit();
            return;
        }
        if (settled.body === body) return;
        const id = setTimeout(commit, DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [body, locale, settled]);

    // Sans brief il n'y a rien a noter : on ne compile meme pas.
    const { rendered } = useCompiledMdx(brief ? settled.body : '');

    const hostRef = useRef<HTMLDivElement>(null);
    // Le texte mesure, etiquete de la locale dont il est issu. Le brief bascule
    // des le clic sur l'onglet alors que la recompilation du corps arrive
    // apres : sans cette etiquette, le panneau confronterait le brief anglais au
    // texte francais et afficherait une note fausse, pas seulement en retard.
    const [scored, setScored] = useState<{
        locale: Locale | null;
        text: string;
    }>({ locale: null, text: '' });
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        // `rehype-slug` pose un id sur chaque titre. Cette copie hors ecran vit
        // en meme temps que la previsualisation : sans ce nettoyage, deux
        // elements porteraient le meme id et un lien `#ancre` de la
        // previsualisation sauterait sur la copie invisible.
        for (const el of host.querySelectorAll('[id]'))
            el.removeAttribute('id');
        setScored({ locale: settledRef.current.locale, text: domText(host) });
    }, [rendered]);

    // Un corps non vide qui n'a pas encore produit de texte n'est pas notable :
    // sans ce garde-fou, generer un brief afficherait un zero le temps de la
    // premiere compilation. Une frappe, elle, conserve la note precedente : la
    // locale n'a pas change, seul le texte est en retard de la temporisation.
    const ready =
        scored.locale === locale && (!body.trim() || scored.text.trim() !== '');
    const score = useMemo(
        () =>
            brief && ready
                ? scoreText(brief, `${title}\n${scored.text}`)
                : null,
        [brief, ready, title, scored.text]
    );

    const rows = score?.rows ?? [];
    const shown = showAll ? rows : rows.slice(0, DEFAULT_ROWS);

    const generate = async () => {
        const q = query.trim();
        if (!q || busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/seo/brief', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, locale }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
            onQueryChange(q);
            onBriefChange(json.brief as SeoBrief);
            setOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-lg border">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left"
            >
                <ChevronRight
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                        open ? 'rotate-90' : ''
                    }`}
                />
                <span className="text-sm font-semibold">
                    SEO {locale.toUpperCase()}
                </span>

                {score ? (
                    <>
                        <span className="tabular-nums text-lg font-semibold leading-none">
                            {score.score}
                            <span className="text-sm text-muted-foreground">
                                /100
                            </span>
                        </span>
                        <span
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${GRADE_CLASS[score.grade]}`}
                        >
                            {score.grade}
                        </span>
                        {/* Seul « 62 » ne veut rien dire : 100 est hors
                            d'atteinte, une page ne pouvant pas tenir dans la
                            fenetre de tous les termes a la fois. On donne donc
                            toujours la mediane des concurrents a cote. */}
                        {score.benchmark && (
                            <span className="text-xs text-muted-foreground">
                                médiane des pages qui rankent{' '}
                                <span className="tabular-nums font-medium text-foreground">
                                    {score.benchmark.median}
                                </span>
                                , meilleure{' '}
                                <span className="tabular-nums font-medium text-foreground">
                                    {score.benchmark.best}
                                </span>
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                            couverture {score.coverage}% · {score.words} mots
                            utiles
                        </span>
                    </>
                ) : brief ? (
                    <span className="text-xs text-muted-foreground">
                        calcul…
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        aucun brief pour cette traduction
                    </span>
                )}

                <span className="ml-auto truncate text-xs text-muted-foreground">
                    {brief
                        ? `« ${brief.query} » · ${describeCorpus(brief)} · ${formatStamp(brief.generatedAt)}`
                        : 'déplier pour en générer un'}
                </span>
            </button>

            {open && (
                <div className="space-y-4 border-t px-4 py-4">
                    <div className="grid gap-2">
                        <Label>Requête cible ({locale.toUpperCase()})</Label>
                        <div className="flex gap-2">
                            <Input
                                value={query}
                                onChange={e => onQueryChange(e.target.value)}
                                onKeyDown={e => {
                                    // Le panneau vit dans le formulaire de
                                    // l'article : sans cela, Entree enregistre.
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    void generate();
                                }}
                                placeholder="quelles fleurs planter pour la toussaint"
                                className="text-sm"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={generate}
                                disabled={busy || !query.trim()}
                            >
                                {busy ? (
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-1.5 h-4 w-4" />
                                )}
                                {brief ? 'Regénérer' : 'Générer le brief'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {busy
                                ? 'Interrogation de la SERP puis téléchargement des pages concurrentes, une vingtaine de secondes.'
                                : 'Une génération ne touche pas la base : le brief part avec le prochain enregistrement de l’article.'}
                        </p>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    {score && (
                        <>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>dans la cible {score.onTarget}%</span>
                                <span>sur-optimisé {score.overWeight}%</span>
                                <span>
                                    {score.counts.ok} ok ·{' '}
                                    {score.counts['sous-utilise']} sous-utilisés
                                    · {score.counts['sur-optimise']}{' '}
                                    sur-optimisés · {score.counts.manquant}{' '}
                                    manquants
                                </span>
                            </div>

                            <div className="max-h-[28rem] overflow-y-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground backdrop-blur">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium">
                                                Terme
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                Poids
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                Occ.
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                Densité
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                Fenêtre visée
                                            </th>
                                            <th className="px-3 py-2 text-left font-medium">
                                                État
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map(r => (
                                            <tr
                                                key={r.term}
                                                className="border-t"
                                            >
                                                <td className="px-3 py-1.5">
                                                    <span className="font-medium">
                                                        {r.term}
                                                    </span>
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {TIER_LABEL[r.tier]} ·{' '}
                                                        {r.nDocs}/
                                                        {brief
                                                            ? countedPages(
                                                                  brief
                                                              )
                                                            : ''}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                                    {r.weight}
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">
                                                    {r.count}
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">
                                                    {r.density.toFixed(2)}%
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                                                    {r.q1.toFixed(2)} –{' '}
                                                    {r.q3.toFixed(2)}%
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${BAND_CLASS[r.band]}`}
                                                    >
                                                        {BAND_LABEL[r.band]}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {rows.length > DEFAULT_ROWS && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAll(a => !a)}
                                >
                                    {showAll
                                        ? `Ne garder que les ${DEFAULT_ROWS} premiers`
                                        : `Afficher les ${rows.length - DEFAULT_ROWS} termes restants`}
                                </Button>
                            )}
                        </>
                    )}

                    <details className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <summary className="cursor-pointer font-medium">
                            Comment ça marche ?
                        </summary>
                        <div className="space-y-2 pt-2 text-muted-foreground">
                            <p>
                                Les mots ne sortent pas d’un dictionnaire : ce
                                sont ceux qu’emploient réellement les pages qui
                                se classent sur ta requête. Pour chaque mot on
                                mesure sa densité dans chacune de ces pages ; la
                                fenêtre visée est l’intervalle interquartile,
                                autrement dit le dosage de la moitié centrale
                                des concurrents. Au-dessus, tu sur-optimises ;
                                en dessous, tu sous-exploites.
                            </p>
                            <p>
                                Ce n’est <strong>pas</strong> une estimation de
                                trafic ni de position : personne ne sait les
                                calculer depuis l’extérieur. Le « poids » est le
                                poids d’un mot dans ce corpus, sa couverture
                                multipliée par sa densité médiane.
                            </p>
                            <p>
                                Une page miroitée ne compte qu’
                                <strong>une fois</strong> : un manuel décliné en
                                dix versions, ou traduit sur un autre domaine,
                                reste un seul concurrent. Sans ce dédoublonnage,
                                une unique page de référence recopiée pesait
                                jusqu’à un quart du corpus, et son vocabulaire
                                propre passait pour du vocabulaire de métier.
                            </p>
                            <p>
                                Et c’est{' '}
                                <strong>ta requête qui décide de tout</strong>.
                                « fleurs toussaint » donne un corpus marchand, «
                                quelles fleurs planter pour la toussaint » un
                                corpus éditorial. Deux briefs incomparables pour
                                un même article.
                            </p>
                            <p>
                                <strong>100 est hors d’atteinte</strong>, et
                                c’est normal : aucune page ne tient dans la
                                fenêtre de tous les mots à la fois, puisque la
                                moitié du corpus est dehors sur chacun. La note
                                se lit donc contre les concurrents, jamais dans
                                l’absolu.{' '}
                                {score?.benchmark
                                    ? `Ici les ${brief ? countedPages(brief) : 0} pages qui rankent
                                       vont de ${score.benchmark.worst} à ${score.benchmark.best},
                                       médiane ${score.benchmark.median} : A à partir de
                                       ${score.benchmark.best}, B ${score.benchmark.q3},
                                       C ${score.benchmark.median}, D ${score.benchmark.q1}.`
                                    : 'La lettre situe le texte dans la distribution du corpus.'}
                            </p>
                            <p>
                                Méthode complète : <code>{SPEC_PATH}</code>.
                            </p>
                        </div>
                    </details>
                </div>
            )}

            {/*
                La copie mesuree. Hors ecran plutot que `display:none`, qui
                empecherait certains composants de se monter, et `inert` pour
                qu'aucun bouton de cette copie n'attrape le clavier.
            */}
            <div
                ref={hostRef}
                inert
                aria-hidden
                className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-[48rem] overflow-hidden"
            >
                {rendered}
            </div>
        </div>
    );
}
