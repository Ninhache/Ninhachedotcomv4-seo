'use client';

import { type ChangeEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mediaSrc } from '@/lib/baseurl';
import { MediaApi } from '@/lib/media/media.api';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

interface MediaUploadFieldProps {
    /** The stored string the owner form persists (a path/URL, or '' for none). */
    value: string;
    onChange: (value: string) => void;
    /**
     * Visible field label. Omit when the field already sits under a section
     * heading (e.g. inside a {@link FormSection}) — the input still gets an
     * accessible name via `aria-label` (see `ariaLabel`).
     */
    label?: string;
    /** Accessible name for the input when no visible `label` is rendered. */
    ariaLabel?: string;
    placeholder?: string;
    /** What the file picker accepts. Images only by default. */
    accept?: 'image' | 'media';
}

/**
 * The one way to attach an image/video to an entity in the admin. A plain
 * string field with two ways to fill it — paste a URL/`public/` path, or upload
 * a file (→ `/uploads/...` path via {@link MediaApi}) — plus an inline preview.
 * Used uniformly by every owner form (companies, missions, skills, …) so image
 * handling looks and works the same everywhere.
 */
export function MediaUploadField({
    value,
    onChange,
    label,
    ariaLabel,
    placeholder = 'https://… ou svg/…/logo.svg ou /uploads/…',
    accept = 'image',
}: MediaUploadFieldProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            onChange(await MediaApi.upload(file));
        } catch {
            setError("Échec de l'upload");
        } finally {
            setUploading(false);
        }
    };

    const isVideo = VIDEO_EXT.test(value);
    // Context-aware import label: mention video only when it's allowed.
    const uploadLabel = uploading
        ? 'Envoi…'
        : accept === 'media'
          ? 'Importer une image ou une vidéo'
          : 'Importer une image';

    return (
        <div className="grid gap-2">
            {label && <Label>{label}</Label>}
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={label ?? ariaLabel ?? 'Média'}
            />
            <p className="text-xs text-muted-foreground">
                Collez une URL ou importez un fichier.
            </p>
            <div className="flex items-center gap-3">
                <input
                    ref={fileRef}
                    type="file"
                    accept={accept === 'media' ? 'image/*,video/*' : 'image/*'}
                    className="hidden"
                    onChange={handleUpload}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                >
                    {uploadLabel}
                </Button>
                {value &&
                    (isVideo ? (
                        <video
                            src={mediaSrc(value)}
                            className="h-12 w-12 rounded-md border object-cover"
                            muted
                        />
                    ) : (
                        <img
                            src={mediaSrc(value)}
                            alt="Aperçu"
                            className="h-12 w-12 rounded-md border bg-white object-contain p-1"
                        />
                    ))}
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploading}
                        onClick={() => onChange('')}
                    >
                        Retirer
                    </Button>
                )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
