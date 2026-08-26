'use client';

import { Download, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ReaderLoginPanel } from '@/app/_components/blog/ReaderLoginPanel';
import { useReaderSession } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
import { Button } from '@/components/ui/button';
import {
    DISPLAY_NAME_MAX,
    DISPLAY_NAME_MIN,
    downloadExport,
    PROVIDER_LABEL,
    ReaderApi,
    type ReaderExport,
} from '@/lib/reader/reader.api';
import { cn } from '@/lib/utils';

function formatDate(iso: string, locale: string) {
    return new Date(iso).toLocaleDateString(
        locale === 'fr' ? 'fr-FR' : 'en-US',
        { day: 'numeric', month: 'long', year: 'numeric' }
    );
}

function Section({
    title,
    intro,
    tone = 'plain',
    children,
}: {
    title: string;
    intro?: string;
    tone?: 'plain' | 'danger';
    children: React.ReactNode;
}) {
    return (
        <section
            className={cn(
                'rounded-2xl border p-6 sm:p-8',
                tone === 'danger'
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-border bg-card'
            )}
        >
            <h2
                className={cn(
                    'text-foreground text-xl',
                    ralewaySemiBold.className
                )}
            >
                {title}
            </h2>
            {intro && (
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    {intro}
                </p>
            )}
            <div className="mt-6">{children}</div>
        </section>
    );
}

/**
 * Everything a reader can do about their own record, in one page: see it,
 * rename themselves, take a copy, or leave.
 *
 * Self-service rather than a request form on purpose. A request queue would
 * mean someone's erasure waits on a human reading a mailbox, and the person has
 * no way to check it happened. Here the three rights that can be automated are
 * three buttons, and the legal notice covers whoever cannot sign in.
 *
 * The export is fetched on arrival, not on click: it is what fills the counts
 * below, so the download button already holds the bytes and asks the API for
 * nothing.
 */
export function AccountView() {
    const t = useTranslations('account');
    const locale = useLocale();
    const { reader, loading, updateName, deleteAccount } = useReaderSession();

    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const [data, setData] = useState<ReaderExport | null>(null);

    const [confirm, setConfirm] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleted, setDeleted] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (!reader) return;
        setName(reader.displayName ?? reader.suggestedName);
    }, [reader]);

    useEffect(() => {
        if (!reader) return;
        let cancelled = false;
        ReaderApi.exportMe()
            .then(payload => {
                if (!cancelled) setData(payload);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [reader]);

    if (loading) return null;

    if (deleted) {
        return (
            <Section title={t('deleted')}>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {t('deletedBody')}
                </p>
            </Section>
        );
    }

    if (!reader) {
        return (
            <Section title={t('signedOutTitle')} intro={t('signedOutBody')}>
                <ReaderLoginPanel returnTo={`/${locale}/compte`} />
            </Section>
        );
    }

    const providerLabel = PROVIDER_LABEL[reader.provider];

    const saveName = async () => {
        const trimmed = name.trim();
        if (trimmed.length < DISPLAY_NAME_MIN || saving) return;
        setSaving(true);
        setNameError(null);
        setSaved(false);
        const failure = await updateName(trimmed);
        setSaving(false);
        if (failure) setNameError(failure);
        else setSaved(true);
    };

    const confirmDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await deleteAccount();
            setDeleted(true);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : t('error'));
        } finally {
            setDeleting(false);
        }
    };

    // Typing the name back is the confirmation: it is the one string the person
    // is sure to recognise, and it cannot be produced by a stray click on the
    // button. Falls back to the provider's name for someone who signed in and
    // left before choosing one: they still have a record, so they still have
    // the right to erase it.
    const confirmTarget = reader.displayName ?? reader.suggestedName;
    const canDelete = confirm.trim() === confirmTarget;

    return (
        <div className="space-y-6">
            <Section title={t('profileTitle')} intro={t('profileIntro')}>
                <div className="flex items-center gap-4">
                    {reader.avatarUrl ? (
                        <img
                            src={reader.avatarUrl}
                            alt=""
                            width={56}
                            height={56}
                            className="h-14 w-14 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-14 w-14 shrink-0 rounded-full bg-muted" />
                    )}
                    <dl className="text-sm">
                        <div className="flex gap-2">
                            <dt className="text-muted-foreground">
                                {t('provider')}
                            </dt>
                            <dd className="text-foreground">{providerLabel}</dd>
                        </div>
                        <div className="mt-1 flex gap-2">
                            <dt className="text-muted-foreground">
                                {t('joined')}
                            </dt>
                            <dd className="text-foreground">
                                {formatDate(reader.createdAt, locale)}
                            </dd>
                        </div>
                    </dl>
                </div>

                <label
                    htmlFor="account-display-name"
                    className="mt-6 block text-foreground text-sm"
                >
                    {t('namePrompt.label')}
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <input
                        id="account-display-name"
                        value={name}
                        maxLength={DISPLAY_NAME_MAX}
                        autoComplete="off"
                        onChange={e => {
                            setName(e.target.value);
                            setSaved(false);
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') saveName();
                        }}
                        className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
                    />
                    <Button
                        className="rounded-full px-6"
                        disabled={
                            name.trim().length < DISPLAY_NAME_MIN || saving
                        }
                        onClick={saveName}
                    >
                        {saving ? t('namePrompt.saving') : t('save')}
                    </Button>
                </div>
                <p className="mt-2 text-muted-foreground text-xs">
                    {t('namePrompt.hint')}
                </p>
                {nameError && (
                    <p className="mt-3 text-destructive text-sm">{nameError}</p>
                )}
                {saved && (
                    <p className="mt-3 text-primary text-sm">{t('saved')}</p>
                )}
            </Section>

            <Section title={t('dataTitle')} intro={t('dataIntro')}>
                <ul className="space-y-2 text-muted-foreground text-sm leading-relaxed">
                    <li>{t('dataItems.identity')}</li>
                    <li>{t('dataItems.displayName')}</li>
                    <li>{t('dataItems.email', { provider: providerLabel })}</li>
                    <li>{t('dataItems.avatar')}</li>
                    <li>{t('dataItems.account')}</li>
                    <li>{t('dataItems.content')}</li>
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                    <Button
                        className="rounded-full px-6"
                        disabled={!data}
                        onClick={() => data && downloadExport(data)}
                    >
                        {data ? (
                            <Download className="mr-2 h-4 w-4" />
                        ) : (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {t('download')}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                        {t('downloadHint')}
                    </p>
                </div>
            </Section>

            <Section
                title={t('deleteTitle')}
                intro={t('deleteBody')}
                tone="danger"
            >
                <label
                    htmlFor="account-delete-confirm"
                    className="block text-foreground text-sm"
                >
                    {t('deleteConfirmLabel')}
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <input
                        id="account-delete-confirm"
                        value={confirm}
                        autoComplete="off"
                        placeholder={confirmTarget}
                        onChange={e => setConfirm(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-destructive/60"
                    />
                    <Button
                        variant="destructive"
                        className="rounded-full px-6"
                        disabled={!canDelete || deleting}
                        onClick={confirmDelete}
                    >
                        {deleting ? t('deleting') : t('deleteButton')}
                    </Button>
                </div>
                {deleteError && (
                    <p className="mt-3 text-destructive text-sm">
                        {deleteError}
                    </p>
                )}
            </Section>
        </div>
    );
}
