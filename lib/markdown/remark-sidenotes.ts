import { SKIP, visit } from 'unist-util-visit';

/**
 * remark plugin turning inline `<Sidenote>` MDX elements into real footnotes
 * collected at the **bottom of each section** (flushed before every `h1`/`h2`,
 * and at the end of the document). Each `<Sidenote>` becomes a numbered
 * superscript link (`<sup><a href="#fn-N">N</a></sup>`) in the text, and its
 * content moves into an ordered list at the section's end with a back-link (↩).
 * Numbering is continuous across the article. Runs on both the server render and
 * the admin preview, so the `<Sidenote>` component itself is only a fallback.
 */

type Node = any;

function attr(name: string, value: string) {
    return { type: 'mdxJsxAttribute', name, value };
}

function marker(num: number, refId: string, noteId: string): Node {
    return {
        type: 'mdxJsxTextElement',
        name: 'sup',
        attributes: [attr('id', refId)],
        children: [
            {
                type: 'mdxJsxTextElement',
                name: 'a',
                attributes: [
                    attr('href', `#${noteId}`),
                    attr('className', 'fn-ref'),
                ],
                children: [{ type: 'text', value: String(num) }],
            },
        ],
    };
}

function footnotesList(notes: Node[]): Node {
    return {
        type: 'mdxJsxFlowElement',
        name: 'ol',
        attributes: [attr('className', 'section-footnotes')],
        children: notes.map(nt => ({
            type: 'mdxJsxFlowElement',
            name: 'li',
            attributes: [attr('id', nt.noteId)],
            children: [
                ...nt.content,
                { type: 'text', value: ' ' },
                {
                    type: 'mdxJsxTextElement',
                    name: 'a',
                    attributes: [
                        attr('href', `#${nt.refId}`),
                        attr('className', 'fn-back'),
                        attr('aria-label', 'Retour au texte'),
                    ],
                    children: [{ type: 'text', value: '↩' }],
                },
            ],
        })),
    };
}

export function remarkSidenotes() {
    return (tree: Node) => {
        let counter = 0;
        let pending: Node[] = [];
        const out: Node[] = [];
        const flush = () => {
            if (pending.length) {
                out.push(footnotesList(pending));
                pending = [];
            }
        };
        for (const node of tree.children ?? []) {
            if (node.type === 'heading' && node.depth <= 2) {
                flush();
                out.push(node);
                continue;
            }
            visit(node, (n: Node, index, parent: Node) => {
                if (
                    (n.type === 'mdxJsxTextElement' ||
                        n.type === 'mdxJsxFlowElement') &&
                    n.name === 'Sidenote' &&
                    parent &&
                    typeof index === 'number'
                ) {
                    counter += 1;
                    const num = counter;
                    const refId = `fnref-${num}`;
                    const noteId = `fn-${num}`;
                    pending.push({ refId, noteId, content: n.children ?? [] });
                    parent.children[index] = marker(num, refId, noteId);
                    return SKIP;
                }
            });
            out.push(node);
        }
        flush();
        tree.children = out;
    };
}
