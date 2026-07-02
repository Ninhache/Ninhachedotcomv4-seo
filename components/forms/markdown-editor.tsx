'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Textarea } from '@/components/ui/textarea';

/**
 * Split Markdown editor for article bodies: a raw-text {@link Textarea} on the
 * left, a live GitHub-Flavored-Markdown preview (`react-markdown` +
 * `remark-gfm`) on the right. Side-by-side from `md:` up, stacked on mobile.
 * Used by {@link ArticleForm}'s "Contenu" section, one instance per locale.
 */
export function MarkdownEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
                Markdown (GFM) — tableaux, listes de tâches, liens automatiques…
            </p>
            <div className="grid gap-3 md:grid-cols-2">
                <Textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={'# Titre\n\nContenu en Markdown…'}
                    className="min-h-[28rem] resize-y font-mono text-sm"
                />
                <div className="min-h-[28rem] overflow-y-auto rounded-md border bg-background p-4">
                    {value ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {value}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Aperçu…</p>
                    )}
                </div>
            </div>
        </div>
    );
}
