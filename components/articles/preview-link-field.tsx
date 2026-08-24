'use client';

import { Check, Copy, Link2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArticleApi } from '@/lib/article/article.api';

// How long the "Copié" confirmation stays up, in ms.
const COPIED_FEEDBACK_MS = 2000;

/**
 * Settings-sidebar control for an article's private review link.
 *
 * The link is orthogonal to `isVisible`: it exposes the article at
 * `/<locale>/blog/preview/<token>` whether or not it is published, so a draft
 * can be sent out for validation. Regenerating rotates the token (the URL
 * already shared stops working); revoking clears it.
 *
 * Only meaningful once the article exists, since the token is stored on it, so
 * the whole block is inert on the creation screen.
 */
export function PreviewLinkField({
    articleId,
    initialToken,
    locale = 'fr',
}: {
    articleId?: string | null;
    initialToken?: string | null;
    locale?: string;
}) {
    const [token, setToken] = useState<string | null>(initialToken ?? null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Built client-side: the admin is served from the same origin as the blog.
    const url =
        token && typeof window !== 'undefined'
            ? `${window.location.origin}/${locale}/blog/preview/${token}`
            : '';

    const run = async (action: () => Promise<string | null>) => {
        setBusy(true);
        setError(null);
        try {
            setToken(await action());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Action impossible');
        } finally {
            setBusy(false);
        }
    };

    const issue = () =>
        run(async () =>
            articleId
                ? (await ArticleApi.issuePreviewToken(articleId)).previewToken
                : null
        );

    const revoke = () =>
        run(async () => {
            if (articleId) await ArticleApi.revokePreviewToken(articleId);
            return null;
        });

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
        } catch {
            setError('Copie refusée par le navigateur, copie l’URL à la main.');
        }
    };

    return (
        <div className="space-y-2">
            <Label className="text-sm font-medium">Lien de validation</Label>

            {!articleId ? (
                <p className="text-xs text-muted-foreground">
                    Enregistre l’article d’abord pour pouvoir générer un lien de
                    relecture.
                </p>
            ) : !token ? (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={issue}
                        className="w-full"
                    >
                        {busy ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <Link2 />
                        )}
                        Générer un lien de relecture
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        URL privée, non indexée, qui affiche l’article même en
                        brouillon.
                    </p>
                </>
            ) : (
                <>
                    <Input
                        readOnly
                        value={url}
                        onFocus={e => e.currentTarget.select()}
                        className="font-mono text-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={copy}
                        >
                            {copied ? <Check /> : <Copy />}
                            {copied ? 'Copié' : 'Copier'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={issue}
                            title="Invalide immédiatement le lien déjà partagé"
                        >
                            {busy ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <RefreshCw />
                            )}
                            Régénérer
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={revoke}
                        >
                            <Trash2 />
                            Révoquer
                        </Button>
                    </div>
                </>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
