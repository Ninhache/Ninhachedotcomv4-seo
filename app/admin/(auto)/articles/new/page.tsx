'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminHeader, AdminPageShell } from '@/components/admin/page-shell';
import { ArticleEditor } from '@/components/articles/article-editor';
import { Button } from '@/components/ui/button';
import { ArticleCategoryApi } from '@/lib/article-category/article-category.api';
import type { ArticleCategoryDTO } from '@/lib/types';

/** Full-page "create article" editor (CMS layout with Édition/Prévisualisation). */
export default function NewArticlePage() {
    const router = useRouter();
    const [categories, setCategories] = useState<ArticleCategoryDTO[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        ArticleCategoryApi.findAll()
            .catch(() => [])
            .then(cats => {
                if (ignore) return;
                setCategories(cats);
                setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, []);

    const back = () => router.push('/admin/articles');

    return (
        <AdminPageShell>
            <AdminHeader
                title="Nouvel article"
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
            ) : (
                <ArticleEditor
                    categories={categories}
                    onSaved={back}
                    onCancel={back}
                />
            )}
        </AdminPageShell>
    );
}
