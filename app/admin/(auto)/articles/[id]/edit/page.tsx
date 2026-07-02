'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminHeader, AdminPageShell } from '@/components/admin/page-shell';
import { ArticleEditor } from '@/components/articles/article-editor';
import { Button } from '@/components/ui/button';
import { ArticleApi } from '@/lib/article/article.api';
import { ArticleCategoryApi } from '@/lib/article-category/article-category.api';
import type { ArticleCategoryDTO, ArticleDTO } from '@/lib/types';

/** Full-page "edit article" editor (CMS layout with Édition/Prévisualisation). */
export default function EditArticlePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params.id;

    const [article, setArticle] = useState<ArticleDTO | null>(null);
    const [categories, setCategories] = useState<ArticleCategoryDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let ignore = false;
        (async () => {
            setLoading(true);
            const cats = await ArticleCategoryApi.findAll().catch(() => []);
            // No admin GET-by-id endpoint; the admin list carries full rows.
            const list = await ArticleApi.findAll().catch(() => []);
            const found = list.find(a => a.id === id) ?? null;
            if (ignore) return;
            setCategories(cats);
            setArticle(found);
            setMissing(!found);
            setLoading(false);
        })();
        return () => {
            ignore = true;
        };
    }, [id]);

    const back = () => router.push('/admin/articles');

    return (
        <AdminPageShell>
            <AdminHeader
                title="Éditer l'article"
                description="Édition pleine page — bascule Édition / Prévisualisation."
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
                <ArticleEditor
                    initial={article}
                    categories={categories}
                    onSaved={back}
                    onCancel={back}
                />
            )}
        </AdminPageShell>
    );
}
