import { useTranslations } from 'next-intl';
import { calibreRegular, proximaNovaBold } from '@/app/fonts';
import type { EmployerWithMissions } from '@/jsons/jsonUtils';
import styles from '@/styles/experience/experience.module.css';
import '@/styles/globals.css';
import AnimatedComponent from '../AnimatedComponent';
import { ExperienceItem } from './ExperienceItem';

interface ExperienceProps {
    data: EmployerWithMissions[];
}

/**
 * Public "where I've worked" section: one alternating zigzag image-card per
 * employer (see {@link ExperienceItem}), each with a CTA opening its missions
 * in a modal. Server Component — `data` is already locale-resolved by
 * `mapTimelineToEmployers`.
 */
export default function Experience({ data }: ExperienceProps) {
    const t = useTranslations('jobs');

    return (
        <>
            <section id={t('anchor')} className={`section ${styles.section}`}>
                <div className={`content leaning`}>
                    <span
                        className={`section_title ${styles.title} ${proximaNovaBold.className}`}
                    >
                        {t('title')}
                    </span>

                    {data.length === 0 ? (
                        <p
                            className={`${styles.empty} ${calibreRegular.className}`}
                        >
                            {t('noExperiences')}
                        </p>
                    ) : (
                        <div className={styles.content}>
                            {data.map((employer, index) => (
                                <AnimatedComponent
                                    delay={100}
                                    key={`${employer.companyName}-${index}`}
                                >
                                    <ExperienceItem
                                        employer={employer}
                                        inverted={index % 2 === 0}
                                    />
                                </AnimatedComponent>
                            ))}
                        </div>
                    )}
                </div>
            </section>
            <div className={`section_end ${styles.experience_end}`} />
        </>
    );
}
