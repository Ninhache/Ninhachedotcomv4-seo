import { visit } from 'unist-util-visit';

/**
 * Supported callout kinds, written in Markdown as remark-directive containers:
 *
 *     :::tip
 *     Some helpful aside.
 *     :::
 *
 * Each maps to a `<div class="callout callout-<kind>">` styled in globals.css.
 */
const CALLOUT_KINDS = new Set(['note', 'info', 'tip', 'warning', 'danger']);

/**
 * remark plugin turning `remark-directive` container nodes (`:::tip … :::`) into
 * styled callout `<div>`s. `remark-directive` only parses the syntax into
 * `containerDirective` AST nodes; this bridges them to HTML via the standard
 * `data.hName` / `data.hProperties` hooks that `remark-rehype` reads. Unknown
 * directive names are left untouched (rendered as nothing special).
 */
export function remarkCallouts() {
    return (tree: unknown) => {
        visit(tree as any, (node: any) => {
            if (node.type !== 'containerDirective') return;
            if (!CALLOUT_KINDS.has(node.name)) return;
            const data = node.data ?? (node.data = {});
            data.hName = 'div';
            data.hProperties = {
                className: ['callout', `callout-${node.name}`],
                'data-callout': node.name,
            };
        });
    };
}
