'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import useMobileView from '@/app/_hooks/useMobileView';
import {
    calibreRegular,
    calibreSemibold,
    ralewayMedium,
    ralewaySemiBold,
} from '@/app/fonts';
import type { EmployerWithMissions } from '@/jsons/jsonUtils';
import styles from '@/styles/experience/experienceItem.module.css';
import '@/styles/globals.css';
import MissionModal from './MissionModal';

interface ExperienceItemProps {
    inverted: boolean;
    employer: EmployerWithMissions;
}

/**
 * One employer rendered as the classic zigzag card: a screenshot on one side,
 * its details (period, contract · role, blurb, tech tags) on the other, with the
 * left/right orientation alternating per row. A CTA opens a modal listing that
 * employer's missions in full. On mobile the screenshot becomes the card's
 * background with the details overlaid.
 *
 * Consumes the live mapped {@link EmployerWithMissions} (no more static JSON);
 * the blurb is the in-house mission's context and the role line is the current
 * job title — both derived in `lib/mappers.ts`. Client Component: owns the
 * modal open/close state.
 */
export const ExperienceItem: React.FC<ExperienceItemProps> = ({
    inverted,
    employer,
}) => {
    const t = useTranslations('jobs');
    const isMobile = useMobileView();
    const [modalOpen, setModalOpen] = useState(false);

    const hasLink = employer.siteUrl !== '#' && employer.siteUrl !== '';
    const hasMissions = employer.missions.length > 0;
    // Localize the contract type (backend stores raw English keys like
    // "Workstudy"); fall back to the raw value for any unmapped key.
    const contractKey = `contractTypes.${employer.contractType}`;
    const contractLabel = employer.contractType
        ? t.has(contractKey)
            ? t(contractKey)
            : employer.contractType
        : '';
    // "Alternance - Ingénieur Full-Stack & DevOps" — contract then current role.
    const roleLine = [contractLabel, employer.roleTitle]
        .filter(Boolean)
        .join(' - ');

    const title = hasLink ? (
        <Link
            className={`${styles.title} ${calibreSemibold.className}`}
            href={employer.siteUrl}
            target="_blank"
        >
            {employer.companyName}
        </Link>
    ) : (
        <span className={`${styles.title} ${calibreSemibold.className}`}>
            {employer.companyName}
        </span>
    );

    const tags = employer.cardTags.length > 0 && (
        <div className={styles.tags}>
            {employer.cardTags.map(tag =>
                tag.url && tag.url !== '#' ? (
                    <Link
                        className={ralewaySemiBold.className}
                        key={tag.name}
                        href={tag.url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {tag.name}
                    </Link>
                ) : (
                    <span className={ralewaySemiBold.className} key={tag.name}>
                        {tag.name}
                    </span>
                )
            )}
        </div>
    );

    const cta = hasMissions && (
        <button
            type="button"
            className={`${styles.cta} ${ralewaySemiBold.className}`}
            onClick={() => setModalOpen(true)}
        >
            {t('showMissions')} ({employer.missions.length})
        </button>
    );

    const modal = modalOpen && (
        <MissionModal
            employerName={employer.companyName}
            subtitle={t('missionsCount', { count: employer.missions.length })}
            closeLabel={t('close')}
            missions={employer.missions}
            onClose={() => setModalOpen(false)}
        />
    );

    if (isMobile) {
        return (
            <div
                className={styles.content}
                style={{ backgroundImage: `url(${employer.logoUrl})` }}
            >
                <div className={styles.information}>
                    <div
                        className={`${styles.type} ${ralewayMedium.className}`}
                    >
                        <span>{employer.date}</span>
                        {roleLine && (
                            <span>
                                <i>{roleLine}</i>
                            </span>
                        )}
                    </div>
                    {title}
                    {employer.description && (
                        <div
                            className={`${styles.text} ${calibreRegular.className}`}
                        >
                            <p>{employer.description}</p>
                        </div>
                    )}
                    {tags}
                    {cta}
                </div>
                {modal}
            </div>
        );
    }

    return (
        <div className={`${styles.content} ${inverted ? styles.inverted : ''}`}>
            <div className={styles.information}>
                <div
                    className={styles.type}
                    style={{ marginLeft: inverted ? 'unset' : '15px' }}
                >
                    <span
                        className={ralewayMedium.className}
                        style={{ marginRight: inverted ? '15px' : 'unset' }}
                    >
                        {employer.date}
                    </span>
                    {roleLine && (
                        <span
                            className={`${styles.type} ${ralewayMedium.className}`}
                        >
                            <i>{roleLine}</i>
                        </span>
                    )}
                </div>
                {title}
                {employer.description && (
                    <div
                        className={`${styles.text} ${calibreRegular.className}`}
                    >
                        <p>{employer.description}</p>
                    </div>
                )}
                {tags}
                {cta}
            </div>
            <div className={styles.view}>
                {hasLink ? (
                    <Link href={employer.siteUrl} target="_blank">
                        <Image
                            src={employer.logoUrl}
                            alt={employer.companyName}
                            width={600}
                            height={340}
                            style={{ width: '600px', height: '340px' }}
                        />
                    </Link>
                ) : (
                    <Image
                        src={employer.logoUrl}
                        alt={employer.companyName}
                        width={600}
                        height={340}
                        style={{ width: '600px', height: '340px' }}
                    />
                )}
            </div>
            {modal}
        </div>
    );
};
