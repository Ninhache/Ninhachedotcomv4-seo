/**
 * Types du brief lexical.
 *
 * Ecrits a la main parce que le runtime vit en `.mjs` : le CLI tourne sous
 * `node` nu, l'appli sous Turbopack, et `.mjs` est le seul format que les deux
 * consomment sans outillage. TypeScript resout `./terms.mjs` vers ce fichier
 * (`.d.mts`, pas `.d.ts` : c'est l'extension qui appaire avec `.mjs`).
 *
 * Toute signature modifiee dans `terms.mjs` doit l'etre ici aussi, rien ne le
 * verifie automatiquement.
 */

/** Un terme est d'autant plus haut place que la SERP l'emploie largement. */
export type SeoTier = 'obligatoire' | 'recommande' | 'complementaire';

/** Position du texte note vis-a-vis de la fenetre interquartile du corpus. */
export type SeoBand = 'manquant' | 'sous-utilise' | 'ok' | 'sur-optimise';

export type SeoGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Ce que valent, contre ce brief, les pages qui l'ont produit.
 *
 * Sert d'etalon a la note lettree : une page ne peut pas tenir dans la fenetre
 * interquartile de tous les termes a la fois, donc 100 est hors d'atteinte et
 * une echelle absolue rendrait F a tout le monde. Absent des briefs generes
 * avant son introduction, d'ou l'optionalite cote `SeoBrief`.
 */
export interface SeoBenchmark {
    /** La meilleure des pages du corpus. Depasser ce chiffre vaut A. */
    best: number;
    q3: number;
    median: number;
    q1: number;
    worst: number;
}

/** Un document du corpus, deja tokenise. */
export interface SeoDocument {
    url: string;
    title: string;
    /** Nombre de mots utiles, denominateur des densites. */
    total: number;
    /** Terme -> occurrences dans ce document. */
    counts: Record<string, number>;
}

export interface SeoTerm {
    term: string;
    /** Nombre de documents du corpus qui emploient le terme. */
    nDocs: number;
    /** `nDocs` rapporte a la taille du corpus, entre 0 et 1. */
    coverage: number;
    /** Borne basse de la fenetre cible, en pourcentage du texte. */
    q1: number;
    median: number;
    /** Borne haute : au-dela, le texte est sur-optimise. */
    q3: number;
    /** `coverage * median`, avant normalisation. */
    rawWeight: number;
    /** Poids discriminant normalise sur 100. Ce n'est PAS un trafic. */
    weight: number;
    tier: SeoTier;
}

export interface SeoBrief {
    /** La requete cible : un brief sans elle est ininterpretable. */
    query: string;
    generatedAt: string;
    corpus: {
        /** Pages aspirees et exploitables, doublons compris. */
        requested: number;
        /**
         * Pages distinctes reellement mesurees. C'est le vrai nombre de concurrents.
         *
         * Optionnel parce que les briefs enregistres avant le dedoublonnage ne le
         * portent pas : ils restent en base tant qu'aucun corpus en cache ne permet
         * de les regenerer. Tout lecteur doit donc retomber sur `requested`.
         */
        kept?: number;
        /** Pages ecartees comme copies, avec la page qu'elles reprennent. Voir `kept`. */
        duplicates?: { url: string; sameAs: string }[];
        urls: string[];
    };
    benchmark?: SeoBenchmark;
    thresholds: {
        MANDATORY_DOC_RATIO: number;
        RECOMMENDED_DOC_RATIO: number;
        MIN_DOC_RATIO: number;
        MIN_DOC_WORDS: number;
    };
    terms: SeoTerm[];
}

export interface SeoRow extends SeoTerm {
    /** Occurrences dans le texte note. */
    count: number;
    /** Densite dans le texte note, en pourcentage des mots utiles. */
    density: number;
    band: SeoBand;
}

export interface SeoScore {
    /** Mots utiles du texte note (mots vides exclus). */
    words: number;
    rows: SeoRow[];
    /** Note sur 100 : voir la formule dans `docs/specs/seo-score.md`. */
    score: number;
    grade: SeoGrade;
    /** Part du poids total couverte par au moins une occurrence. */
    coverage: number;
    /** Part du poids total ni manquante ni sur-dosee. */
    onTarget: number;
    /** Part du poids total au-dessus de Q3. */
    overWeight: number;
    counts: Record<SeoBand, number>;
    /** Recopie du brief, pour situer la note sans avoir le brief sous la main. */
    benchmark?: SeoBenchmark;
}

export declare const MIN_DOC_WORDS: number;
export declare const MANDATORY_DOC_RATIO: number;
export declare const RECOMMENDED_DOC_RATIO: number;
export declare const MIN_DOC_RATIO: number;
export declare const MIN_TERM_LENGTH: number;
export declare const BRIEF_TERMS: number;
export declare const STOPWORDS: Set<string>;
export declare const DUPLICATE_SIMILARITY: number;

export declare function tokenize(text: string): string[];
export declare function countTerms(tokens: string[]): Map<string, number>;
export declare function quantile(values: number[], p: number): number;
export declare function dedupeDocs(
    docs: SeoDocument[],
    threshold?: number
): { docs: SeoDocument[]; duplicates: { url: string; sameAs: string }[] };
export declare function buildBrief(
    query: string,
    docs: SeoDocument[],
    generatedAt?: string
): SeoBrief;
/**
 * Note un document deja tokenise contre une liste de termes.
 *
 * Exporte parce que c'est l'unique formule de notation : `buildBrief` s'en sert
 * pour l'etalon, `scoreText` pour le texte redige, et toute regeneration qui
 * recoupe un brief doit recalculer son etalon avec elle plutot que d'en
 * reecrire une copie qui derivera.
 *
 * @param get renvoie les occurrences d'un terme dans le document
 * @param total mots utiles du document, denominateur des densites
 */
export declare function scoreCounts(
    terms: SeoTerm[],
    get: (term: string) => number,
    total: number
): Omit<SeoScore, 'words' | 'grade' | 'benchmark'>;
export declare function grade(
    score: number,
    benchmark?: SeoBenchmark
): SeoGrade;
export declare function scoreText(brief: SeoBrief, text: string): SeoScore;
