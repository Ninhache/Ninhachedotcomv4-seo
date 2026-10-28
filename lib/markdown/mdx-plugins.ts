import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { remarkCallouts } from './remark-callouts';
import { remarkSidenotes } from './remark-sidenotes';
import { remarkStripImports } from './remark-strip-imports';

/**
 * La chaine de plugins MDX du navigateur, en un seul endroit.
 *
 * La previsualisation de l'editeur, le score de l'editeur et le score affiche
 * dans la liste des articles compilent tous le meme corps. S'ils ne partageaient
 * pas cette liste, une divergence d'un seul plugin suffirait a leur faire compter
 * des mots differents, et la liste annoncerait une note que l'editeur contredit.
 */
export const MDX_REMARK_PLUGINS = [
    remarkStripImports,
    remarkGfm,
    remarkDirective,
    remarkCallouts,
    remarkSidenotes,
];

export const MDX_REHYPE_PLUGINS = [rehypeSlug];
