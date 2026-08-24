/**
 * MDX source to plain Markdown, for the `.md` twin of an article.
 *
 * Article bodies are MDX and lean on a large component set
 * (`components/mdx/mdx-components.tsx`), so the raw source is not readable
 * Markdown: `<Lead>`, `<Steps>`/`<Step title>`, `<Callout>` and the rest would
 * reach the reader as literal tags, which defeats the point of serving a
 * clean text twin to retrieval crawlers.
 *
 * The conversion is deliberately generic rather than a per-component table:
 * text-carrying attributes (`title`, `label`, `date`, `caption`, ...) become a
 * lead-in line, and anything unknown is unwrapped to its children. A component
 * added next month degrades to its prose here without touching this file, and
 * that is the property worth having, since the component set grows.
 *
 * Code is never rewritten: fenced blocks and inline spans are copied verbatim,
 * so the `demo-mdx` article's own examples of these tags survive intact.
 */

/** Opening or closing fence of a code block, with up to 3 spaces of indent. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/** Attributes that read as the title of the block, in the order we print them. */
const HEAD_ATTRS = ['date', 'kicker', 'title', 'label', 'summary'] as const;

/** Attributes that read as a caption under it. */
const NOTE_ATTRS = ['subtitle', 'caption', 'alt'] as const;

type Tag = {
    name: string;
    attrs: Record<string, string>;
    closing: boolean;
    selfClosing: boolean;
    /** Index just past the `>`. */
    end: number;
};

/**
 * Reads a component tag starting at `start` (which must be a `<`).
 *
 * Only capitalised names are treated as components, which is exactly MDX's own
 * rule: `<https://…>` autolinks and lowercase HTML are left untouched. Returns
 * `null` when there is no tag there, or when it is unterminated.
 */
function readTag(text: string, start: number): Tag | null {
    let i = start + 1;
    const closing = text[i] === '/';
    if (closing) i++;
    const name = /^[A-Z][A-Za-z0-9]*/.exec(text.slice(i))?.[0];
    if (!name) return null;
    i += name.length;

    // Scan to the matching `>`, stepping over quoted strings and over `{}`
    // expressions (a `data={[{ x: 1 }]}` attribute contains no shortage of
    // characters that would otherwise end the tag early).
    const attrStart = i;
    let depth = 0;
    let quote: string | null = null;
    for (; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            if (c === quote) quote = null;
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
        } else if (c === '>' && depth === 0) {
            break;
        }
    }
    if (i >= text.length) return null;

    const raw = text.slice(attrStart, i);
    return {
        name,
        attrs: parseAttrs(raw),
        closing,
        selfClosing: /\/\s*$/.test(raw),
        end: i + 1,
    };
}

/** Flattens a `{…}` attribute value to text, or to nothing when it is data. */
function expressionText(expr: string): string {
    const t = expr.trim();
    // `data={[…]}` / `nodes={[…]}` / `cols={3}`: payloads and numbers, not prose.
    if (t.startsWith('[') || t.startsWith('{') || /^-?\d/.test(t)) return '';
    return t
        .replace(/<Arrow[^>]*>/g, '->')
        .replace(/<\/?[A-Za-z]*[^>]*>/g, ' ')
        .replace(/^['"`]|['"`]$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** String and expression attributes of a tag; valueless flags are ignored. */
function parseAttrs(raw: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([A-Za-z][\w-]*)\s*=\s*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
        const at = re.lastIndex;
        const c = raw[at];
        if (c === '"' || c === "'") {
            const end = raw.indexOf(c, at + 1);
            if (end === -1) break;
            attrs[m[1]] = raw.slice(at + 1, end);
            re.lastIndex = end + 1;
        } else if (c === '{') {
            let depth = 0;
            let i = at;
            for (; i < raw.length; i++) {
                if (raw[i] === '{') depth++;
                else if (raw[i] === '}' && --depth === 0) break;
            }
            attrs[m[1]] = expressionText(raw.slice(at + 1, i));
            re.lastIndex = i + 1;
        }
    }
    return attrs;
}

function join(attrs: Record<string, string>, keys: readonly string[]): string {
    return keys
        .map(k => attrs[k]?.trim())
        .filter((v): v is string => Boolean(v))
        .join(' - ');
}

/** `tip` -> `Tip`, for a callout that carries a kind but no title. */
function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

type Open = { name: string; close: string };

/**
 * Rewrites the component tags of one non-code chunk.
 *
 * Written as a scanner rather than a set of regexes because attributes hold
 * braces, nested tags and quoted `>` characters; a regex that survives all
 * three is worse to read than the loop.
 */
function unwrapJsx(text: string, locale: string): string {
    let out = '';
    let i = 0;
    const stack: Open[] = [];

    /** True when nothing but whitespace precedes the tag on its line. */
    const atLineStart = () => /(^|\n)[ \t]*$/.test(out);

    while (i < text.length) {
        const c = text[i];

        // Inline code span: copy through, tags inside it are examples.
        if (c === '`') {
            const run = /^`+/.exec(text.slice(i))?.[0] ?? '`';
            const end = text.indexOf(run, i + run.length);
            if (end === -1) {
                out += text.slice(i);
                break;
            }
            out += text.slice(i, end + run.length);
            i = end + run.length;
            continue;
        }

        // A string-literal MDX expression, which prose uses to get a literal
        // brace past the compiler: `{'{[COND]?a:b}'}` is the text it quotes.
        if (c === '{') {
            const literal = /^\{\s*(['"`])((?:\\.|(?!\1).)*)\1\s*\}/.exec(
                text.slice(i)
            );
            if (literal) {
                out += literal[2].replace(/\\(.)/g, '$1');
                i += literal[0].length;
                continue;
            }
        }

        if (c === '<') {
            // Fragments, which only show up inside attribute expressions.
            if (text.startsWith('<>', i) || text.startsWith('</>', i)) {
                i += text.startsWith('</>', i) ? 3 : 2;
                continue;
            }
            const tag = readTag(text, i);
            if (tag) {
                out += tag.closing
                    ? renderClose(tag, stack)
                    : renderOpen(tag, stack, atLineStart(), locale);
                i = tag.end;
                continue;
            }
        }

        out += c;
        i++;
    }

    return out;
}

function renderClose(tag: Tag, stack: Open[]): string {
    // Search backwards: an unbalanced tag in the source must not desynchronise
    // everything after it.
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === tag.name) {
            const [open] = stack.splice(i, 1);
            return open.close;
        }
    }
    return '';
}

function renderOpen(
    tag: Tag,
    stack: Open[],
    block: boolean,
    locale: string
): string {
    const { name, attrs } = tag;
    const push = (close: string) => {
        if (!tag.selfClosing) stack.push({ name, close });
    };

    switch (name) {
        // Inline components whose meaning is a link or a glyph.
        case 'Arrow':
            return '->';
        case 'Ext':
            push(`](${attrs.href ?? ''})`);
            return '[';
        case 'Sidenote':
            push(')');
            return ' (';
        case 'Term':
            push(attrs.def ? ` (${attrs.def})` : '');
            return '';
        case 'ArticleLink':
            push('');
            return `\n\n[${attrs.title || attrs.label || attrs.slug || ''}](/${locale}/blog/${attrs.slug ?? ''})\n\n`;
        // Images: the caption is the alt text a reader would want.
        case 'Figure':
        case 'Wide':
            push('');
            return `\n\n![${attrs.caption || attrs.alt || ''}](${attrs.src ?? ''})\n\n`;
        case 'Divider':
            push('');
            return attrs.label ? `\n\n**${attrs.label}**\n\n` : '\n\n---\n\n';
    }

    // A callout with no title still announces its kind, the same way the
    // `:::tip` directive form does.
    const head =
        name === 'Callout' && !attrs.title && attrs.type
            ? capitalize(attrs.type)
            : join(attrs, HEAD_ATTRS);
    const note = join(attrs, NOTE_ATTRS);

    if (!block) {
        // Inline wrapper (`<Lead>`, `<U>`, `<Mark>`, ...): keep the children only.
        push('');
        return '';
    }

    push('\n\n');
    return `\n\n${head ? `**${head}**\n\n` : ''}${note ? `_${note}_\n\n` : ''}`;
}

/**
 * Converts an MDX article body to plain Markdown.
 *
 * @param body   Raw MDX as stored on the article translation.
 * @param locale Locale the twin is served under, used to keep internal links
 *               (`<ArticleLink slug=…>`) pointing at the right prefix.
 * @returns Markdown with no component tags left outside code blocks.
 */
export function toPlainMarkdown(body: string, locale: string): string {
    const lines = body
        // `import … from '…'` / `export …`: the render pipeline drops these too
        // (`remark-strip-imports`), they are never content.
        .replace(/^\s*(?:import|export)\s+[^\n]*\n/gm, '')
        .split('\n');

    const out: string[] = [];
    let buffer: string[] = [];
    let fence: string | null = null;

    const flush = () => {
        if (buffer.length === 0) return;
        const chunk = buffer
            .join('\n')
            // `:::tip[Titre]` containers become the same lead-in line as the
            // `<Callout>` form they are sugar for; the closing `:::` vanishes.
            .replace(
                /^:::(\w+)(?:\[([^\]]*)\])?[ \t]*$/gm,
                (_m, kind, title) => `\n**${title || capitalize(kind)}**\n`
            )
            .replace(/^:::[ \t]*$/gm, '');
        out.push(unwrapJsx(chunk, locale));
        buffer = [];
    };

    for (const line of lines) {
        const fenceMark = FENCE.exec(line)?.[1];
        if (fence) {
            out.push(line);
            if (fenceMark && line.trim().startsWith(fence)) fence = null;
            continue;
        }
        if (fenceMark) {
            flush();
            out.push(line);
            fence = fenceMark;
            continue;
        }
        buffer.push(line);
    }
    flush();

    return out
        .join('\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
