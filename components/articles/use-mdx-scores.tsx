'use client';

import { evaluate } from '@mdx-js/mdx';
import { useEffect, useRef, useState } from 'react';
import * as runtime from 'react/jsx-runtime';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { domText } from '@/lib/markdown/dom-text';
import {
    MDX_REHYPE_PLUGINS,
    MDX_REMARK_PLUGINS,
} from '@/lib/markdown/mdx-plugins';
import { type SeoBrief, type SeoScore, scoreText } from '@/lib/seo/terms.mjs';

/** Une traduction a noter. `brief` absent = rien a noter, la ligne est ignoree. */
export type MdxScoreInput = {
    /** Identifiant stable de la traduction, cle de la table renvoyee. */
    key: string;
    title: string;
    body: string;
    brief: SeoBrief | null | undefined;
};

/**
 * Largeur du conteneur hors ecran. Le score ne depend pas de la mise en page,
 * mais un conteneur de largeur nulle ferait travailler le navigateur pour rien.
 */
const HOST_WIDTH_PX = 800;

/**
 * Note en lot des traductions, hors ecran, une par une.
 *
 * Le score se calcule sur le **rendu**, pas sur la source MDX : les URLs des
 * liens contiennent des mots-cles qui gonfleraient les densites. C'est la meme
 * contrainte que dans `SeoScorePanel`, et c'est pourquoi les deux passent par
 * `MDX_REMARK_PLUGINS` et `domText` plutot que par deux chemins paralleles :
 * une liste qui annonce 55 la ou l'editeur affiche 48 serait pire que pas de
 * note du tout.
 *
 * Le rendu est sequentiel et rend la main au navigateur entre deux articles :
 * compiler une vingtaine de corps MDX d'un bloc figerait la page. Les notes
 * tombent donc au fur et a mesure, et `pending` dit combien il en reste.
 *
 * @param inputs Les traductions a noter. Doit etre memoise par l'appelant.
 * @returns `scores` indexe par `key`, et le nombre de traductions restantes.
 */
export function useMdxScores(inputs: MdxScoreInput[]): {
    scores: Map<string, SeoScore>;
    pending: number;
} {
    const [scores, setScores] = useState<Map<string, SeoScore>>(new Map());
    const [pending, setPending] = useState(0);

    // Les entrees changent d'identite a chaque rendu du parent. Seule leur
    // signature declenche un recalcul, sinon l'effet se relancerait sans fin.
    const signature = inputs
        .map(i => `${i.key}:${i.brief ? i.body.length : 'x'}`)
        .join('|');
    const latest = useRef(inputs);
    latest.current = inputs;

    useEffect(() => {
        const todo = latest.current.filter(
            (i): i is MdxScoreInput & { brief: SeoBrief } => Boolean(i.brief)
        );
        setPending(todo.length);
        if (todo.length === 0) {
            setScores(new Map());
            return;
        }

        let cancelled = false;
        const host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = `position:fixed;left:-99999px;top:0;width:${HOST_WIDTH_PX}px;`;
        document.body.appendChild(host);
        const root = createRoot(host);

        (async () => {
            const out = new Map<string, SeoScore>();
            for (const item of todo) {
                if (cancelled) return;
                try {
                    const { default: MdxContent } = await evaluate(item.body, {
                        ...runtime,
                        remarkPlugins: MDX_REMARK_PLUGINS,
                        rehypePlugins: MDX_REHYPE_PLUGINS,
                    });
                    if (cancelled) return;
                    // `flushSync` parce qu'il faut le DOM tout de suite : sans
                    // lui, React rendrait apres la lecture du texte.
                    flushSync(() => {
                        root.render(<MdxContent components={mdxComponents} />);
                    });
                    out.set(
                        item.key,
                        scoreText(item.brief, `${item.title}\n${domText(host)}`)
                    );
                } catch {
                    // Un MDX qui ne compile pas n'est pas notable : la ligne
                    // reste sans note plutot que de faire tomber la liste.
                }
                if (cancelled) return;
                setScores(new Map(out));
                setPending(todo.length - out.size);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        })();

        return () => {
            cancelled = true;
            // Demonter pendant le rendu de React est interdit, d'ou le report.
            setTimeout(() => {
                root.unmount();
                host.remove();
            }, 0);
        };
    }, [signature]);

    return { scores, pending };
}
