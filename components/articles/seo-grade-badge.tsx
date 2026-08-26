import type { SeoGrade } from '@/lib/seo/terms.mjs';
import type { Locale } from '@/lib/types';

/**
 * Couleur d'un rang. Partagee entre le panneau de l'editeur et la liste des
 * articles : les deux doivent teinter un C de la meme facon.
 */
export const GRADE_CLASS: Record<SeoGrade, string> = {
    A: 'bg-emerald-500/10 text-emerald-600',
    B: 'bg-emerald-500/10 text-emerald-600',
    C: 'bg-amber-500/10 text-amber-600',
    D: 'bg-red-500/10 text-red-600',
    F: 'bg-red-500/10 text-red-600',
};

type Props = {
    locale: Locale;
    /** `null` quand la traduction n'a pas de brief : rien a noter. */
    score: { score: number; grade: SeoGrade } | null;
    /** Vrai tant que la note de cette traduction n'est pas encore calculee. */
    loading?: boolean;
    /** Met en avant la locale affichee dans le reste de la ligne. */
    active?: boolean;
};

/**
 * La note SEO d'une traduction, en une pastille « FR 55 C ».
 *
 * Sans brief on ecrit « — » plutot que zero : une traduction non briefee n'est
 * pas une mauvaise traduction, elle n'est pas mesuree.
 */
export function SeoGradeBadge({ locale, score, loading, active }: Props) {
    const tone = score
        ? GRADE_CLASS[score.grade]
        : 'bg-muted text-muted-foreground';
    return (
        <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${tone} ${
                active ? '' : 'opacity-60'
            }`}
            title={
                score
                    ? `${locale.toUpperCase()} : ${score.score}/100, rang ${score.grade}`
                    : `${locale.toUpperCase()} : pas de brief SEO`
            }
        >
            <span className="font-medium uppercase">{locale}</span>
            {score ? (
                <>
                    <span className="tabular-nums">{score.score}</span>
                    <span className="font-semibold">{score.grade}</span>
                </>
            ) : (
                <span>{loading ? '…' : '—'}</span>
            )}
        </span>
    );
}
