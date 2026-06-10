'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    calibreRegular,
    calibreSemibold,
    ralewayMedium,
    ralewaySemiBold,
} from '@/app/fonts';
import type { MissionView } from '@/jsons/jsonUtils';
import styles from '@/styles/experience/missionModal.module.css';

interface MissionModalProps {
    employerName: string;
    /** Localized count label, e.g. "3 missions". */
    subtitle: string;
    /** Accessible label for the close button. */
    closeLabel: string;
    missions: MissionView[];
    onClose: () => void;
}

/** Square logo for a mission, with an initials fallback when absent or broken. */
function MissionLogo({ src, label }: { src: string; label: string }) {
    const [failed, setFailed] = useState(false);
    const initials = label.trim().slice(0, 2).toUpperCase();

    if (!src || failed) {
        return (
            <span className={styles.missionLogoFallback} aria-hidden>
                {initials}
            </span>
        );
    }
    return (
        // Plain <img>: client logos are arbitrary remote hosts; onError gives
        // us the initials fallback.
        <img
            className={styles.missionLogo}
            src={src}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}

/**
 * A modal listing an employer's missions in full (context, tasks, tags, dates,
 * client logo) — the "detail" view behind each experience card's CTA. Centered
 * dialog on desktop, bottom sheet on mobile. Closes on backdrop click, the X
 * button, or Escape; locks body scroll while open.
 */
export default function MissionModal({
    employerName,
    subtitle,
    closeLabel,
    missions,
    onClose,
}: MissionModalProps) {
    const t = useTranslations('jobs');
    const titleId = useId();
    // Only render after mount so we have a real `document.body` to portal into
    // (the dialog is client-only and opens on click, so this never blocks SSR).
    const [mounted, setMounted] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    // The scrollable region — focused on open so wheel/keyboard scroll the modal
    // content (not the locked page behind it).
    const bodyRef = useRef<HTMLDivElement>(null);

    // Escape to close, Tab trapped inside the dialog, background scroll locked.
    useEffect(() => {
        setMounted(true);
        // Restore focus to whatever opened the modal (the card's CTA) on close.
        const opener = document.activeElement as HTMLElement | null;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key !== 'Tab' || !dialogRef.current) return;
            // Focus trap: keep Tab cycling within the dialog's focusables.
            const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
                'a[href], button, input, [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
            opener?.focus?.();
        };
    }, [onClose]);

    // Move focus into the scrollable body once it's in the DOM, so the modal
    // immediately captures scroll input.
    useEffect(() => {
        if (mounted) bodyRef.current?.focus();
    }, [mounted]);

    if (!mounted) return null;

    // Portal to <body> so the overlay escapes the card's transformed ancestor
    // (AnimatedComponent applies a `transform`, which would otherwise trap
    // `position: fixed` inside the card's stacking context).
    return createPortal(
        // Backdrop click closes; clicks inside the dialog are stopped below.
        <div className={styles.overlay} onClick={onClose} role="presentation">
            <div
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={e => e.stopPropagation()}
            >
                <header className={styles.header}>
                    <div>
                        <h3
                            id={titleId}
                            className={`${styles.headerTitle} ${calibreSemibold.className}`}
                        >
                            {employerName}
                        </h3>
                        <p
                            className={`${styles.headerSub} ${ralewayMedium.className}`}
                        >
                            {subtitle}
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                        aria-label={closeLabel}
                    >
                        ×
                    </button>
                </header>

                <div
                    ref={bodyRef}
                    className={styles.body}
                    tabIndex={-1}
                    // The scroll container takes focus so PageUp/Down, arrows
                    // and the wheel reveal more content immediately on open.
                >
                    {missions.map((mission, mIndex) => {
                        const label = mission.client || mission.title;
                        // A mission carried out for a client carries that
                        // client's name; an in-house one has none.
                        const isClient = mission.client !== '';
                        // "Jan 2024 - Mar 2025 · Paris" — date, then location
                        // when known.
                        const dateLine = mission.location
                            ? `${mission.date} · ${mission.location}`
                            : mission.date;
                        return (
                            <article
                                className={styles.mission}
                                key={`${mission.title}-${mIndex}`}
                            >
                                {/* Decorative watermark: the mission's
                                    illustration, large and faint on the right.
                                    A real <img> (not a CSS bg) so it can carry a
                                    border-radius. Its wrapper clips only the
                                    image — the text sits outside it and is never
                                    cut. */}
                                {mission.logoUrl && (
                                    <span
                                        className={styles.watermark}
                                        aria-hidden="true"
                                    >
                                        <img
                                            className={styles.watermarkImg}
                                            src={mission.logoUrl}
                                            alt=""
                                            loading="lazy"
                                        />
                                    </span>
                                )}
                                <div className={styles.missionHead}>
                                    <MissionLogo
                                        src={mission.logoUrl}
                                        label={label}
                                    />
                                    <div>
                                        <div className={styles.missionTitleRow}>
                                            <h4
                                                className={`${styles.missionTitle} ${calibreSemibold.className}`}
                                            >
                                                {label}
                                            </h4>
                                            <span
                                                className={`${styles.missionBadge} ${isClient ? styles.badgeClient : styles.badgeInternal} ${ralewaySemiBold.className}`}
                                            >
                                                {isClient
                                                    ? t('missionClient')
                                                    : t('missionInternal')}
                                            </span>
                                        </div>
                                        <div
                                            className={`${styles.missionDate} ${ralewayMedium.className}`}
                                        >
                                            {dateLine}
                                        </div>
                                    </div>
                                </div>

                                {/* Client block: the client company's OWN blurb
                                    (only for client missions), distinct from the
                                    mission detail below. */}
                                {isClient && mission.clientDescription && (
                                    <p
                                        className={`${styles.clientDesc} ${calibreRegular.className}`}
                                    >
                                        {mission.clientDescription}
                                    </p>
                                )}

                                {/* No per-mission role line: the job title is an
                                    employer-level fact (already on the card), and
                                    the head already leads with the client. The
                                    mission's nature comes through its context. */}
                                {mission.context && (
                                    <p
                                        className={`${styles.context} ${calibreRegular.className}`}
                                    >
                                        {mission.context}
                                    </p>
                                )}

                                {mission.tasks.length > 0 && (
                                    <ul className={styles.tasks}>
                                        {mission.tasks.map((task, tIndex) => (
                                            <li
                                                className={
                                                    calibreRegular.className
                                                }
                                                key={`${task}-${tIndex}`}
                                            >
                                                {task}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {mission.tags.length > 0 && (
                                    <div className={styles.tags}>
                                        {mission.tags.map(tag =>
                                            tag.url && tag.url !== '#' ? (
                                                <a
                                                    className={`${styles.tag} ${ralewaySemiBold.className}`}
                                                    key={tag.name}
                                                    href={tag.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {tag.name}
                                                </a>
                                            ) : (
                                                <span
                                                    className={`${styles.tag} ${ralewaySemiBold.className}`}
                                                    key={tag.name}
                                                >
                                                    {tag.name}
                                                </span>
                                            )
                                        )}
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}
