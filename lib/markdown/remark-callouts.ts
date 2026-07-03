import { visit } from 'unist-util-visit';

/**
 * Callout kinds writable in Markdown as remark-directive containers:
 *
 *     :::tip[Titre optionnel]
 *     Some helpful aside.
 *     :::
 *
 * Each is rewritten into a `<Callout type="<kind>">` MDX element, so a `:::`
 * directive renders **identically** to the `<Callout>` component: same icon +
 * title header, same `.callout` styling, and the same scroll fade-in (the
 * component is wrapped in `withFadeIn` in `mdx-components.tsx`). Writing it as a
 * raw `<div>` here would bypass the component and skip the animation.
 */
const CALLOUT_KINDS = new Set(['note', 'info', 'tip', 'warning', 'danger']);

function textOf(node: any): string {
    if (node.type === 'text') return node.value ?? '';
    if (Array.isArray(node.children)) return node.children.map(textOf).join('');
    return '';
}

/**
 * remark plugin bridging `remark-directive` container nodes (`:::tip … :::`) to
 * the `<Callout>` component. `remark-directive` only parses the syntax into
 * `containerDirective` nodes; this converts the known ones into
 * `mdxJsxFlowElement` `<Callout type="<kind>">`, lifting an optional
 * `:::tip[Titre]` label into the `title` prop. Unknown directive names are left
 * untouched.
 */
export function remarkCallouts() {
    return (tree: any) => {
        visit(tree, (node: any) => {
            if (node.type !== 'containerDirective') return;
            if (!CALLOUT_KINDS.has(node.name)) return;

            const attributes = [
                { type: 'mdxJsxAttribute', name: 'type', value: node.name },
            ];
            let children = node.children ?? [];
            // `:::tip[Titre]` -> the label is the first child, flagged as such.
            if (children[0]?.data?.directiveLabel) {
                const title = textOf(children[0]).trim();
                if (title) {
                    attributes.push({
                        type: 'mdxJsxAttribute',
                        name: 'title',
                        value: title,
                    });
                }
                children = children.slice(1);
            }

            node.type = 'mdxJsxFlowElement';
            node.name = 'Callout';
            node.attributes = attributes;
            node.children = children;
            node.data = undefined;
        });
    };
}
