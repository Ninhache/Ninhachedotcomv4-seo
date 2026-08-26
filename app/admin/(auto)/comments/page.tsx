'use client';

import { RefreshCcw, ShieldBan, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ModerationApi } from '@/lib/moderation/moderation.api';
import type { ModerationCommentDTO } from '@/lib/types';

const PROVIDER_LABEL = {
    google: 'Google',
    github: 'GitHub',
    discord: 'Discord',
} as const;

function articleTitle(comment: ModerationCommentDTO) {
    const translations = comment.article.translations ?? [];
    return (
        translations.find(t => t.locale === comment.locale)?.title ??
        translations[0]?.title ??
        comment.article.slug
    );
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

/**
 * Moderation a posteriori: comments publish immediately and get taken down
 * here. Deleting a message and banning its author are two separate actions on
 * purpose, so a bad comment does not have to cost someone their account.
 */
export default function CommentsPage() {
    const [items, setItems] = useState<ModerationCommentDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [deleteTarget, setDeleteTarget] =
        useState<ModerationCommentDTO | null>(null);
    const [banTarget, setBanTarget] = useState<ModerationCommentDTO | null>(
        null
    );
    const [pending, setPending] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { items: comments } = await ModerationApi.findComments();
            setItems(comments ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return items;
        return items.filter(
            comment =>
                comment.body.toLowerCase().includes(needle) ||
                comment.reader.displayName.toLowerCase().includes(needle) ||
                articleTitle(comment).toLowerCase().includes(needle)
        );
    }, [items, q]);

    // A ban is an account-level decision: reflect it on every row of that
    // reader at once instead of only the one that was clicked.
    const applyBan = (readerId: string, isBanned: boolean) =>
        setItems(prev =>
            prev.map(item =>
                item.reader.id === readerId
                    ? { ...item, reader: { ...item.reader, isBanned } }
                    : item
            )
        );

    return (
        <AdminPageShell>
            <AdminHeader
                title="Commentaires"
                description="Modère les commentaires laissés sous les articles."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} commentaires`
                            : 'Aucun commentaire'}
                    </p>
                }
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => load()}
                        disabled={loading}
                    >
                        <RefreshCcw className="mr-1 h-4 w-4" />
                        Actualiser
                    </Button>
                }
            />

            <AdminToolbar className="gap-4">
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un commentaire…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-backdrop-filter:bg-muted/40">
                                <TableRow>
                                    <TableHead>Lecteur</TableHead>
                                    <TableHead>Commentaire</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Article
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Date
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(comment => (
                                    <TableRow key={comment.id}>
                                        <TableCell className="align-top">
                                            <div className="flex items-center gap-2">
                                                {comment.reader.avatarUrl ? (
                                                    // Avatars are hosted on the
                                                    // providers' CDNs, which are
                                                    // not in next/image's
                                                    // remotePatterns.
                                                    <img
                                                        src={
                                                            comment.reader
                                                                .avatarUrl
                                                        }
                                                        alt=""
                                                        width={32}
                                                        height={32}
                                                        className="h-8 w-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded-full bg-muted" />
                                                )}
                                                <div>
                                                    <div className="font-medium">
                                                        {
                                                            comment.reader
                                                                .displayName
                                                        }
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            PROVIDER_LABEL[
                                                                comment.reader
                                                                    .provider
                                                            ]
                                                        }
                                                        {comment.reader
                                                            .isBanned &&
                                                            ' · banni'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-md align-top">
                                            <p className="whitespace-pre-wrap text-sm">
                                                {comment.body}
                                            </p>
                                        </TableCell>
                                        <TableCell className="hidden align-top md:table-cell">
                                            <div className="text-sm">
                                                {articleTitle(comment)}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {comment.locale}
                                                {!comment.article.isVisible &&
                                                    ' · masqué'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="hidden align-top text-xs text-muted-foreground md:table-cell">
                                            {formatDate(comment.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            <div className="inline-flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={
                                                        comment.reader.isBanned
                                                            ? 'Réhabiliter le lecteur'
                                                            : 'Bannir le lecteur'
                                                    }
                                                    onClick={() =>
                                                        setBanTarget(comment)
                                                    }
                                                >
                                                    {comment.reader.isBanned ? (
                                                        <ShieldCheck className="h-4 w-4" />
                                                    ) : (
                                                        <ShieldBan className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Supprimer"
                                                    onClick={() =>
                                                        setDeleteTarget(comment)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun commentaire correspondant.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Chargement…
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </AdminCard>

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={next => !next && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer ce commentaire ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `Le message de ${deleteTarget.reader.displayName} sera définitivement supprimé.`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setDeleteTarget(null)}
                        >
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                            disabled={pending}
                            onClick={async () => {
                                if (!deleteTarget) return;
                                setPending(true);
                                try {
                                    await ModerationApi.removeComment(
                                        deleteTarget.id
                                    );
                                    setItems(prev =>
                                        prev.filter(
                                            item => item.id !== deleteTarget.id
                                        )
                                    );
                                    setDeleteTarget(null);
                                } finally {
                                    setPending(false);
                                }
                            }}
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!banTarget}
                onOpenChange={next => !next && setBanTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {banTarget?.reader.isBanned
                                ? 'Réhabiliter ce lecteur ?'
                                : 'Bannir ce lecteur ?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {banTarget?.reader.isBanned
                                ? `${banTarget.reader.displayName} pourra de nouveau commenter et réagir.`
                                : banTarget
                                  ? `${banTarget.reader.displayName} ne pourra plus commenter ni réagir. Ses commentaires existants restent visibles jusqu'à suppression.`
                                  : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setBanTarget(null)}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={pending}
                            onClick={async () => {
                                if (!banTarget) return;
                                const next = !banTarget.reader.isBanned;
                                setPending(true);
                                try {
                                    await ModerationApi.setBanned(
                                        banTarget.reader.id,
                                        next
                                    );
                                    applyBan(banTarget.reader.id, next);
                                    setBanTarget(null);
                                } finally {
                                    setPending(false);
                                }
                            }}
                        >
                            {banTarget?.reader.isBanned
                                ? 'Réhabiliter'
                                : 'Bannir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPageShell>
    );
}
