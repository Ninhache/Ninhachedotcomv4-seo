'use client';

import { evaluate } from '@mdx-js/mdx';
import { type ReactNode, useEffect, useState } from 'react';
import * as runtime from 'react/jsx-runtime';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { MDX_REHYPE_PLUGINS, MDX_REMARK_PLUGINS } from './mdx-plugins';

/**
 * Compile un corps MDX **dans le navigateur** et rend le resultat.
 *
 * Jumeau client de `render-article.tsx` (qui est `server-only`) : meme chaine de
 * plugins, meme table de composants, pour que la previsualisation et le score
 * de l'editeur voient exactement l'article que le site publiera. Seule
 * difference assumee avec la page publique : pas de coloration Shiki, qui ne
 * tourne que sur le serveur.
 *
 * Une erreur de compilation MDX (un `<` isole, du JSX mal ferme) revient dans
 * `error` au lieu de faire tomber la page : c'est un etat normal de l'editeur,
 * pas une panne.
 */
export function useCompiledMdx(body: string): {
    rendered: ReactNode;
    error: string | null;
} {
    const [rendered, setRendered] = useState<ReactNode>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!body.trim()) {
            setRendered(null);
            setError(null);
            return;
        }
        (async () => {
            try {
                const { default: MDXContent } = await evaluate(body, {
                    ...runtime,
                    remarkPlugins: MDX_REMARK_PLUGINS,
                    rehypePlugins: MDX_REHYPE_PLUGINS,
                });
                if (cancelled) return;
                setError(null);
                setRendered(<MDXContent components={mdxComponents} />);
            } catch (err) {
                if (cancelled) return;
                setRendered(null);
                setError(err instanceof Error ? err.message : String(err));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [body]);

    return { rendered, error };
}
