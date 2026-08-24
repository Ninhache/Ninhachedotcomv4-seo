import type { Graph } from 'schema-dts';

/**
 * Renders a JSON-LD block.
 *
 * Structured data must be a real `<script type="application/ld+json">` in the
 * JSX — the `metadata` export has no slot for it. `dangerouslySetInnerHTML` is
 * the documented way to do this, and the `<` escape is the sanitisation Next's
 * own guide prescribes: a `</script>` sequence inside content (an article
 * excerpt, a project description) would otherwise close the tag early and turn
 * the rest of the JSON into markup.
 */
export function JsonLd({ data }: { data: Graph }) {
    return (
        <script
            type="application/ld+json"
            // Raw injection is the only way to emit JSON-LD; the payload is built server-side and its `<` escaped below.
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, '\\u003c'),
            }}
        />
    );
}
