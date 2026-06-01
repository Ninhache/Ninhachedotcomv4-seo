'use client';

import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import {
    CheckCircle2,
    ExternalLink,
    FileText,
    Loader2,
    Upload,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { baseUrl } from '@/lib/baseurl';
import { ResumeApi } from '@/lib/resume/resume.api';
import type { Locale, ResumeDTO } from '@/lib/types';
import { cn } from '@/lib/utils';

const LOCALES: { code: Locale; label: string }[] = [
    { code: 'fr', label: 'Francais' },
    { code: 'en', label: 'English' },
];

export default function ResumePage() {
    const [resume, setResume] = useState<ResumeDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [frFile, setFrFile] = useState<File | null>(null);
    const [enFile, setEnFile] = useState<File | null>(null);
    const frInputRef = useRef<HTMLInputElement>(null);
    const enInputRef = useRef<HTMLInputElement>(null);

    // Fetch current resume on mount
    useEffect(() => {
        ResumeApi.findCurrent()
            .then(setResume)
            .catch(() => setResume(null))
            .finally(() => setLoading(false));
    }, []);

    const handleUpload = async () => {
        if (!frFile && !enFile) return;
        setUploading(true);
        try {
            const saved = await ResumeApi.upload(
                frFile ?? undefined,
                enFile ?? undefined
            );
            setResume(saved);
            setFrFile(null);
            setEnFile(null);
            if (frInputRef.current) frInputRef.current.value = '';
            if (enInputRef.current) enInputRef.current.value = '';
        } catch (err) {
            console.error('Resume upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const getTranslation = (locale: Locale) =>
        resume?.translations.find(t => t.locale === locale);

    const buildPdfUrl = (relativeUrl: string) =>
        relativeUrl.startsWith('http')
            ? relativeUrl
            : `${baseUrl}${relativeUrl}`;

    return (
        <AdminPageShell>
            <AdminHeader
                title="Resume / CV"
                description="Gere les fichiers PDF du CV pour chaque langue."
            />

            {/* ── Current status ── */}
            <AdminCard>
                <CardHeader className="border-b">
                    <CardTitle>Etat actuel</CardTitle>
                    <CardDescription>
                        {loading
                            ? 'Chargement...'
                            : resume
                              ? `Derniere mise a jour : ${format(new Date(resume.updatedAt), 'PPP a HH:mm', { locale: frLocale })}`
                              : 'Aucun CV enregistre.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {LOCALES.map(({ code, label }) => {
                                const t = getTranslation(code);
                                return (
                                    <div
                                        key={code}
                                        className={cn(
                                            'flex items-center justify-between rounded-lg border p-4 transition-colors',
                                            t
                                                ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                                                : 'border-muted bg-muted/30'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {t ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">
                                                        {code.toUpperCase()}
                                                    </Badge>
                                                    <span className="text-sm font-medium">
                                                        {label}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {t
                                                        ? t.url.split('/').pop()
                                                        : 'Non envoye'}
                                                </p>
                                            </div>
                                        </div>
                                        {t && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={buildPdfUrl(t.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                                    Voir
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </AdminCard>

            {/* ── Upload section ── */}
            <AdminCard>
                <CardHeader className="border-b">
                    <CardTitle>Envoyer un nouveau CV</CardTitle>
                    <CardDescription>
                        Selectionne un PDF pour chaque langue. Au moins un
                        fichier est requis. Les fichiers existants seront
                        remplaces.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* FR drop zone */}
                        <DropZone
                            locale="FR"
                            label="CV Francais"
                            file={frFile}
                            inputRef={frInputRef}
                            onFileChange={setFrFile}
                            disabled={uploading}
                        />
                        {/* EN drop zone */}
                        <DropZone
                            locale="EN"
                            label="CV English"
                            file={enFile}
                            inputRef={enInputRef}
                            onFileChange={setEnFile}
                            disabled={uploading}
                        />
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                            {frFile && enFile
                                ? '2 fichiers selectionnes'
                                : frFile || enFile
                                  ? '1 fichier selectionne'
                                  : 'Aucun fichier selectionne'}
                        </p>
                        <Button
                            onClick={handleUpload}
                            disabled={uploading || (!frFile && !enFile)}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Envoyer
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </AdminCard>
        </AdminPageShell>
    );
}

/* ------------------------------------------------------------------ */
/*  Drop-zone component for a single locale PDF                       */
/* ------------------------------------------------------------------ */
function DropZone({
    locale,
    label,
    file,
    inputRef,
    onFileChange,
    disabled,
}: {
    locale: string;
    label: string;
    file: File | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (f: File | null) => void;
    disabled: boolean;
}) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) onFileChange(selected);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Badge variant="outline">{locale}</Badge>
                <span className="text-sm font-medium">{label}</span>
            </div>
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleChange}
            />
            <button
                type="button"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm transition-colors',
                    disabled
                        ? 'cursor-wait border-muted bg-muted/50 text-muted-foreground'
                        : file
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'cursor-pointer border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground'
                )}
            >
                {file ? (
                    <>
                        <FileText className="h-8 w-8 text-primary" />
                        <span className="font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} Ko
                        </span>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="mt-1 text-xs text-destructive hover:underline"
                        >
                            Supprimer la selection
                        </button>
                    </>
                ) : (
                    <>
                        <Upload className="h-8 w-8" />
                        <span>Cliquer pour selectionner un PDF</span>
                        <span className="text-xs text-muted-foreground/70">
                            PDF uniquement, 10 Mo max
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}
