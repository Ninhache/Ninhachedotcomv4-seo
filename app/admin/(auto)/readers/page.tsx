'use client';

import {
    MessageSquareX,
    Pencil,
    RefreshCcw,
    ShieldBan,
    ShieldCheck,
    UserX,
} from 'lucide-react';
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ModerationApi } from '@/lib/moderation/moderation.api';
import {
    DISPLAY_NAME_MAX,
    DISPLAY_NAME_MIN,
    PROVIDER_LABEL,
} from '@/lib/reader/reader.api';
import type { ModerationReaderRowDTO } from '@/lib/types';

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

/** What to call someone who signed in and never chose a name. */
function label(reader: ModerationReaderRowDTO) {
    return reader.displayName ?? reader.providerName;
}

/**
 * The accounts behind the comments, and the four levers over them: rename,
 * ban, wipe what they wrote, close the account.
 *
 * They are four and not one because they are four different decisions. A
 * hostile pseudonym is a rename, a raid is a wipe, a person who keeps coming
 * back is a ban, and only the last of these needs the account to go.
 *
 * The provider's own name sits under the chosen one on every row. That is the
 * entire reason the API keeps it: someone who renamed themselves after a ban
 * is otherwise a stranger.
 */
export default function ReadersPage() {
    const [items, setItems] = useState<ModerationReaderRowDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [pending, setPending] = useState(false);

    const [renameTarget, setRenameTarget] =
        useState<ModerationReaderRowDTO | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameError, setRenameError] = useState<string | null>(null);

    const [banTarget, setBanTarget] = useState<ModerationReaderRowDTO | null>(
        null
    );
    const [wipeTarget, setWipeTarget] = useState<ModerationReaderRowDTO | null>(
        null
    );
    const [deleteTarget, setDeleteTarget] =
        useState<ModerationReaderRowDTO | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setItems((await ModerationApi.findReaders()) ?? []);
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
        return items.filter(reader =>
            [reader.displayName, reader.providerName, reader.email]
                .filter(Boolean)
                .some(value => value?.toLowerCase().includes(needle))
        );
    }, [items, q]);

    const patch = (id: string, changes: Partial<ModerationReaderRowDTO>) =>
        setItems(prev =>
            prev.map(item => (item.id === id ? { ...item, ...changes } : item))
        );

    const openRename = (reader: ModerationReaderRowDTO) => {
        setRenameValue(label(reader));
        setRenameError(null);
        setRenameTarget(reader);
    };

    const submitRename = async () => {
        if (!renameTarget || pending) return;
        const trimmed = renameValue.trim();
        if (trimmed.length < DISPLAY_NAME_MIN) return;
        setPending(true);
        setRenameError(null);
        try {
            await ModerationApi.renameReader(renameTarget.id, trimmed);
            patch(renameTarget.id, { displayName: trimmed });
            setRenameTarget(null);
        } catch (err) {
            setRenameError(
                err instanceof Error ? err.message : 'Renommage refusé.'
            );
        } finally {
            setPending(false);
        }
    };

    return (
        <AdminPageShell>
            <AdminHeader
                title="Lecteurs"
                description="Les comptes qui commentent et réagissent sous les articles."
                meta={
                    <p className="text-muted-foreground text-xs">
                        {items.length
                            ? `${items.length} lecteurs`
                            : 'Aucun lecteur'}
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
                    placeholder="Rechercher un lecteur…"
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
                                    <TableHead className="hidden lg:table-cell">
                                        Email
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Activité
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Inscrit le
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(reader => (
                                    <TableRow key={reader.id}>
                                        <TableCell className="align-top">
                                            <div className="flex items-center gap-2">
                                                {reader.avatarUrl ? (
                                                    <img
                                                        src={reader.avatarUrl}
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
                                                        {label(reader)}
                                                        {!reader.displayName && (
                                                            <span className="ml-2 text-muted-foreground text-xs">
                                                                pseudo non
                                                                choisi
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground text-xs">
                                                        {
                                                            PROVIDER_LABEL[
                                                                reader.provider
                                                            ]
                                                        }
                                                        {' · '}
                                                        {reader.providerName}
                                                        {reader.isBanned &&
                                                            ' · banni'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden align-top text-muted-foreground text-xs lg:table-cell">
                                            {reader.email ?? '—'}
                                        </TableCell>
                                        <TableCell className="hidden align-top text-sm md:table-cell">
                                            {reader._count.comments} com.
                                            {' · '}
                                            {reader._count.reactions} réac.
                                        </TableCell>
                                        <TableCell className="hidden align-top text-muted-foreground text-xs md:table-cell">
                                            {formatDate(reader.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            <div className="inline-flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Renommer"
                                                    onClick={() =>
                                                        openRename(reader)
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={
                                                        reader.isBanned
                                                            ? 'Réhabiliter'
                                                            : 'Bannir'
                                                    }
                                                    onClick={() =>
                                                        setBanTarget(reader)
                                                    }
                                                >
                                                    {reader.isBanned ? (
                                                        <ShieldCheck className="h-4 w-4" />
                                                    ) : (
                                                        <ShieldBan className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Supprimer tous ses commentaires"
                                                    disabled={
                                                        reader._count
                                                            .comments === 0
                                                    }
                                                    onClick={() =>
                                                        setWipeTarget(reader)
                                                    }
                                                >
                                                    <MessageSquareX className="h-4 w-4 text-destructive" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Supprimer le compte"
                                                    onClick={() =>
                                                        setDeleteTarget(reader)
                                                    }
                                                >
                                                    <UserX className="h-4 w-4 text-destructive" />
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
                                            Aucun lecteur correspondant.
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

            <Dialog
                open={!!renameTarget}
                onOpenChange={next => !next && setRenameTarget(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Renommer ce lecteur</DialogTitle>
                        <DialogDescription>
                            Le nouveau nom remplace le pseudo public sous tous
                            ses commentaires. Les mêmes règles que côté lecteur
                            s'appliquent : de {DISPLAY_NAME_MIN} à{' '}
                            {DISPLAY_NAME_MAX} caractères, pas de nom réservé.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="reader-rename">Nom d'affichage</Label>
                        <Input
                            id="reader-rename"
                            value={renameValue}
                            maxLength={DISPLAY_NAME_MAX}
                            onChange={e => setRenameValue(e.target.value)}
                        />
                        {renameTarget && (
                            <p className="text-muted-foreground text-xs">
                                Nom du fournisseur : {renameTarget.providerName}
                            </p>
                        )}
                        {renameError && (
                            <p className="text-destructive text-sm">
                                {renameError}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setRenameTarget(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={
                                pending ||
                                renameValue.trim().length < DISPLAY_NAME_MIN
                            }
                            onClick={submitRename}
                        >
                            Renommer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!banTarget}
                onOpenChange={next => !next && setBanTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {banTarget?.isBanned
                                ? 'Réhabiliter ce lecteur ?'
                                : 'Bannir ce lecteur ?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {banTarget?.isBanned
                                ? `${label(banTarget)} pourra de nouveau commenter et réagir.`
                                : banTarget
                                  ? `${label(banTarget)} ne pourra plus commenter ni réagir. Ses commentaires existants restent visibles.`
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
                                const next = !banTarget.isBanned;
                                setPending(true);
                                try {
                                    await ModerationApi.setBanned(
                                        banTarget.id,
                                        next
                                    );
                                    patch(banTarget.id, { isBanned: next });
                                    setBanTarget(null);
                                } finally {
                                    setPending(false);
                                }
                            }}
                        >
                            {banTarget?.isBanned ? 'Réhabiliter' : 'Bannir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!wipeTarget}
                onOpenChange={next => !next && setWipeTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer tous ses commentaires ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {wipeTarget
                                ? `Les ${wipeTarget._count.comments} commentaires de ${label(wipeTarget)} seront définitivement supprimés, réponses comprises. Le compte est conservé.`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setWipeTarget(null)}>
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={pending}
                            onClick={async () => {
                                if (!wipeTarget) return;
                                setPending(true);
                                try {
                                    await ModerationApi.removeReaderComments(
                                        wipeTarget.id
                                    );
                                    patch(wipeTarget.id, {
                                        _count: {
                                            ...wipeTarget._count,
                                            comments: 0,
                                        },
                                    });
                                    setWipeTarget(null);
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
                open={!!deleteTarget}
                onOpenChange={next => !next && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer ce compte ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `Le compte de ${label(deleteTarget)}, son email et ses réactions sont effacés définitivement. Ses ${deleteTarget._count.comments} commentaires restent en ligne, signés « Compte supprimé ».`
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={pending}
                            onClick={async () => {
                                if (!deleteTarget) return;
                                setPending(true);
                                try {
                                    await ModerationApi.removeReader(
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
                            Supprimer le compte
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPageShell>
    );
}
