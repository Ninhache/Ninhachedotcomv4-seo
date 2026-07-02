'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import useMobileView from '@/app/_hooks/useMobileView';
import {
    calibreRegular,
    calibreSemibold,
    ralewayBold,
    ralewayMedium,
    ralewaySemiBold,
} from '@/app/fonts';
import { Locale } from '@/config';
import { Project } from '@/jsons/jsonUtils';
import styles from '@/styles/projects/bigproject.module.css';

export interface BigProjectProps {
    project: Project;
    isInverted: boolean;
}

const MEDIA_STYLE = {
    width: '630px',
    height: '350px',
    objectFit: 'cover',
} as const;

/**
 * The project's main visual. A VIDEO media must render as a real <video> —
 * next/image cannot decode an .mp4 and fails silently. The video src is an
 * absolute backend URL (`mediaSrc`), so the browser streams it directly with
 * Range requests; the image (if any) doubles as the poster.
 *
 * No controls: it autoplays (muted) only while in view and pauses off-screen,
 * so an off-screen demo doesn't burn CPU/bandwidth. Muting is required for the
 * browser to allow programmatic autoplay.
 */
const ProjectMedia: React.FC<{ project: Project }> = ({ project }) => {
    const hasVideo = !!project.videoUrl && project.videoUrl !== 'none';
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const el = videoRef.current;
        if (!el) return undefined;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.play().catch(() => {});
                } else {
                    el.pause();
                }
            },
            { threshold: 0.4 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (hasVideo) {
        return (
            <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="metadata"
                poster={project.image || undefined}
                width={630}
                height={350}
                style={MEDIA_STYLE}
            >
                <source src={project.videoUrl} />
            </video>
        );
    }

    if (!project.image) return null;

    return (
        <Image
            src={project.image}
            alt={`Image of the project ${project.title}`}
            width={630}
            height={350}
            style={MEDIA_STYLE}
        />
    );
};

export const BigProject: React.FC<BigProjectProps> = ({
    project,
    isInverted,
}) => {
    const isMobile = useMobileView();
    const locale = useLocale() as Locale;

    const t = useTranslations('projects');

    return (
        <>
            <div
                className={`project ${styles.project} ${isInverted ? `inverted ${styles.inverted}` : ''}`}
                style={{
                    backgroundImage: isMobile
                        ? `url(${project.image})`
                        : 'unset',
                }}
            >
                {isMobile && project.ongoing && (
                    <span
                        className={`${styles.ribbon} ${styles.ribbonMobile} ${ralewaySemiBold.className}`}
                    >
                        {t('inDevelopment')}
                    </span>
                )}
                <div className={`${styles.project_text}`}>
                    <div
                        className={`${styles.type} ${ralewayMedium.className}`}
                    >
                        <span>{project.date}</span>
                        {project.translations[locale].type && (
                            <>
                                <span>•</span>
                                <span>{project.translations[locale].type}</span>
                            </>
                        )}
                    </div>
                    {project.links.redirect === 'none' ? (
                        <span
                            className={`${styles.title} ${calibreSemibold.className}`}
                        >
                            {project.title}
                        </span>
                    ) : (
                        <Link
                            className={`${styles.title} ${calibreSemibold.className}`}
                            href={project.links.redirect}
                            target="_blank"
                        >
                            {project.title}
                        </Link>
                    )}
                    <div
                        className={`${styles.text} ${calibreRegular.className}`}
                    >
                        <p>{project.translations[locale].description}</p>
                    </div>
                    <div
                        className={`${styles.tags} ${ralewaySemiBold.className}`}
                    >
                        {project.tags.map(tag =>
                            tag.url && tag.url !== '#' ? (
                                <Link
                                    key={tag.name}
                                    href={`${tag.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {tag.name}
                                </Link>
                            ) : (
                                <span key={tag.name}>{tag.name}</span>
                            )
                        )}
                    </div>
                    <div className={`${styles.links}`}>
                        {project.links.git !== 'none' && (
                            <Link
                                className={`${styles.github}`}
                                href={`${project.links.git}`}
                                target="_blank"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 19.05 20.31"
                                >
                                    <desc>Logo representing something</desc>
                                    <g>
                                        <path d="M7.26 16.34c-4.11 1.23-4.11-2.06-5.76-2.47M13 18.81V15.62a2.78 2.78 0 0 0-.77-2.15c2.59-.28 5.3-1.26 5.3-5.76a4.46 4.46 0 0 0-1.23-3.08 4.18 4.18 0 0 0-.08-3.11s-1-.29-3.22 1.22a11 11 0 0 0-5.76 0C5 1.23 4 1.52 4 1.52A4.18 4.18 0 0 0 4 4.63 4.48 4.48 0 0 0 2.73 7.74c0 4.46 2.72 5.44 5.31 5.76a2.8 2.8 0 0 0-.78 2.12v3.19" />
                                    </g>
                                </svg>
                                <span
                                    className={`${styles.bubble} ${ralewayBold.className}`}
                                >
                                    {t('openGit')}
                                </span>
                            </Link>
                        )}
                        {project.links.play !== 'none' && (
                            <Link
                                className={`${styles.test}`}
                                href={`${project.links.play}`}
                                target="_blank"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 17.09 18.64"
                                >
                                    <desc>Logo representing something</desc>
                                    <g>
                                        <path d="M14.55 7.52 4.62 1.78A2.08 2.08 0 0 0 1.5 3.58V15.05a2.08 2.08 0 0 0 3.12 1.8l9.93-5.73A2.08 2.08 0 0 0 14.55 7.52Z" />
                                    </g>
                                </svg>
                                <span
                                    className={`${styles.bubble} ${ralewayBold.className}`}
                                >
                                    {t('runCode')}
                                </span>
                            </Link>
                        )}
                        {project.blogArticleSlug && (
                            <a
                                href={`/${locale}/blog/${project.blogArticleSlug}`}
                                style={
                                    {
                                        '--color': 'rgb(147, 130, 216)',
                                    } as React.CSSProperties
                                }
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                >
                                    <desc>Read the related blog article</desc>
                                    <g>
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                    </g>
                                </svg>
                                <span
                                    className={`${styles.bubble} ${ralewayBold.className}`}
                                >
                                    {t('readArticle')}
                                </span>
                            </a>
                        )}
                        {project.blogCategorySlug && (
                            <a
                                href={`/${locale}/blog?cat=${project.blogCategorySlug}`}
                                style={
                                    {
                                        '--color': 'rgb(147, 130, 216)',
                                    } as React.CSSProperties
                                }
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                >
                                    <desc>See related blog articles</desc>
                                    <g>
                                        <path d="M12 2 2 7l10 5 10-5-10-5z" />
                                        <path d="M2 17l10 5 10-5" />
                                        <path d="M2 12l10 5 10-5" />
                                    </g>
                                </svg>
                                <span
                                    className={`${styles.bubble} ${ralewayBold.className}`}
                                >
                                    {t('seeArticles')}
                                </span>
                            </a>
                        )}
                    </div>
                </div>
                {!isMobile && (
                    <div className={`${styles.project_view}`}>
                        {project.ongoing && (
                            <span
                                className={`${styles.ribbon} ${isInverted ? styles.ribbonInverted : ''} ${ralewaySemiBold.className}`}
                            >
                                {t('inDevelopment')}
                            </span>
                        )}
                        {project.links.redirect === 'none' ? (
                            <ProjectMedia project={project} />
                        ) : (
                            <Link href={project.links.redirect} target="_blank">
                                <ProjectMedia project={project} />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
