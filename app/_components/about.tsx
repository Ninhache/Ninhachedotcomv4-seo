'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { calibreRegular, proximaNovaBold, ralewaySemiBold } from '@/app/fonts';
import { Locale } from '@/config';
import type { ProfileDTO } from '@/lib/types';
import styles from '@/styles/about.module.css';
import AnimatedProfilePicture from './AnimatedProfilePicture';

// Render the editable "Who am I?" text, turning a <projects>label</projects>
// tag into a link to the projects section and newlines into line breaks.
// Everything else stays plain text (React escapes it — the string is
// admin-authored, no raw HTML is injected).
function renderIntroduction(text: string, projectsHref: string) {
    return text.split(/<projects>(.*?)<\/projects>/g).map((part, i) => {
        if (i % 2 === 1) {
            return (
                <Link key={i} className="link" href={projectsHref}>
                    {part}
                </Link>
            );
        }
        const lines = part.split('\n');
        return (
            <Fragment key={i}>
                {lines.map((line, j) => (
                    <Fragment key={j}>
                        {line}
                        {j < lines.length - 1 && <br />}
                    </Fragment>
                ))}
            </Fragment>
        );
    });
}

export default function About({ profile }: { profile?: ProfileDTO | null }) {
    const t = useTranslations('about');
    const tProjects = useTranslations('projects');
    const locale = useLocale() as Locale;

    // Anchor of the projects section is localized (#projets / #projects) — use
    // the same source the section's id comes from so the link always matches.
    const projectsHref = `#${tProjects('anchor')}`;

    const introduction = profile?.translations.find(
        tr => tr.locale === locale
    )?.introduction;

    return (
        <>
            <section
                id={t('anchor')}
                className={`section ${styles.about_section}`}
            >
                <div className={`content ${styles.content}`}>
                    <span
                        className={`section_title ${proximaNovaBold.className}`}
                    >
                        {t('title')}
                    </span>
                    <div className={styles.about_content}>
                        <div className={styles.left_content}>
                            <p
                                className={`${styles.p_1} ${calibreRegular.className}`}
                            >
                                {introduction ? (
                                    renderIntroduction(
                                        introduction,
                                        projectsHref
                                    )
                                ) : (
                                    <>
                                        {t.rich('introduction', {
                                            projects: chunks => (
                                                <Link
                                                    className="link"
                                                    href={projectsHref}
                                                >
                                                    {chunks}
                                                </Link>
                                            ),
                                        })}
                                        <br />
                                        <br />
                                        {t('employmentSeeking')}
                                        <br />
                                        <br />
                                        {t('additionalInfo')}
                                    </>
                                )}
                            </p>

                            <Link
                                className={`${ralewaySemiBold.className} ${styles.download_resume}`}
                                href="/documents/CV_ALMEIDA_Neo_FR-web.pdf"
                                target="_blank"
                            >
                                <span>{t('resumeLink')}</span>
                                <Image
                                    src="/svg/OpenLink.svg"
                                    width={20}
                                    height={20}
                                    alt={t('altLink')}
                                    style={{ width: '20px', height: '20px' }}
                                />
                            </Link>
                        </div>

                        <AnimatedProfilePicture src={profile?.imageUrl} />
                    </div>
                </div>
            </section>
            <div className={`section_end ${styles.about_end}`}></div>
        </>
    );
}
