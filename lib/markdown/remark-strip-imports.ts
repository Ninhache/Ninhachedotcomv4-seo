/**
 * remark plugin that drops MDX `import`/`export` (ESM) statements from an article
 * body. Article MDX may only reference the curated component map — never import
 * arbitrary modules. Client-safe (no `server-only`), used by both the server
 * render and the admin client preview.
 */
export function remarkStripImports() {
    return (tree: any) => {
        if (Array.isArray(tree.children)) {
            tree.children = tree.children.filter(
                (n: any) => n.type !== 'mdxjsEsm'
            );
        }
    };
}
