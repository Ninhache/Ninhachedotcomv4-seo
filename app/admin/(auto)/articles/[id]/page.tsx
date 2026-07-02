'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminHeader, AdminPageShell } from '@/components/admin/page-shell';
import { ArticleForm } from '@/components/articles/form';
import { Button } from '@/components/ui/button';
import { ArticleApi } from '@/lib/article/article.api';
import { ArticleCategoryApi } from '@/lib/article-category/article-category.api';
import type { ArticleCategoryDTO, ArticleDTO } from '@/lib/types';

/**
 * Full-page article editor (create when `[id]` is "new", otherwise edit).
 *
 * Replaces the cramped modal: the form gets the whole page width, so the
 * Markdown body editor sits next to its live preview comfortably, and the field
 * groups are collapsible fieldsets. Save/cancel navigate back to the list.
 */
export default function ArticleEditorPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params.id;
    const isNew = id === 'new';

    const [article, setArticle] = useState<ArticleDTO | null>(null);
    const [categories, setCategories] = useState<ArticleCategoryDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            const cats = await ArticleCategoryApi.findAll().catch(() => []);
            let found: ArticleDTO | null = null;
            if (!isNew) {
                // No admin GET-by-id endpoint; the admin list carries full rows.
                const list = await ArticleApi.findAll().catch(() => []);
                found = list.find(a => a.id === id) ?? null;
                if (!found && !ignore) setMissing(true);
            }
            if (!ignore) {
                setCategories(cats);
                setArticle(found);
                setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [id, isNew]);

    const back = () => router.push('/admin/articles');

    return (
        <AdminPageShell>
            <AdminHeader
                title={isNew ? 'Nouvel article' : "Éditer l'article"}
                description="Édition pleine page — le corps Markdown et son aperçu côte à côte."
                actions={
                    <Button variant="outline" size="sm" onClick={back}>
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Retour à la liste
                    </Button>
                }
            />

            {loading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : missing ? (
                <p className="text-sm text-muted-foreground">
                    Article introuvable.
                </p>
            ) : (
                <ArticleForm
                    initial={article}
                    categories={categories}
                    onSaved={back}
                    onCancel={back}
                />
            )}
        </AdminPageShell>
    );
}
