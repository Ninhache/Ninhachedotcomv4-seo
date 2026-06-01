import { proximaNovaBold } from '@/app/fonts';

import type { Experience } from '@/jsons/jsonUtils';
import styles from '@/styles/experience/experience.module.css';
import AnimatedComponent from '../AnimatedComponent';
import { ExperienceItem } from './ExperienceItem';
import '@/styles/globals.css';
import { useTranslations } from 'next-intl';

interface ExperienceProps {
    data: Experience[];
}

export default function Experience({ data }: ExperienceProps) {
    const t = useTranslations('jobs');

    return (
        <>
            <section id={t('anchor')} className={`section ${styles.section}`}>
                <div className={`content leaning`}>
                    <span
                        className={`section_title ${styles.title} ${proximaNovaBold.className}`}
                    >
                        Where I&apos;ve Worked
                    </span>
                    <div className={styles.content}>
                        {data.map((item, index) => {
                            return (
                                <AnimatedComponent delay={100} key={index}>
                                    <ExperienceItem
                                        key={index}
                                        experience={item}
                                        inverted={index % 2 === 0}
                                    />
                                </AnimatedComponent>
                            );
                        })}
                    </div>
                </div>
            </section>
            <div className={`section_end ${styles.experience_end}`} />
        </>
    );
}
