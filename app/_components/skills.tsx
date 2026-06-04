'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React, { Fragment, useState } from 'react';
import useMobileView from '@/app/_hooks/useMobileView';
import { proximaNovaBold, proximaNovaSemiBold } from '@/app/fonts';
import { Locale } from '@/config';
import { Skill, SkillCategory } from '@/jsons/jsonUtils';
import styles from '@/styles/skills.module.css';

interface SkillsComponentProps {
    data: SkillCategory[];
}

/**
 * Category label for the active locale, with a fallback to any available
 * translation so a category missing the current locale never crashes.
 */
function categoryName(category: SkillCategory, locale: Locale): string {
    return (
        category.translations[locale]?.name ??
        Object.values(category.translations)[0]?.name ??
        ''
    );
}

const SkillsComponent: React.FC<SkillsComponentProps> = ({ data }) => {
    const isMobile = useMobileView();
    const t = useTranslations('skills');

    // The public read path serves `[]` on a backend blip or when no category
    // exists — render nothing rather than dereferencing an empty list.
    if (!data || data.length === 0) return null;

    return (
        <section
            id={t('anchor')}
            className={`section ${styles.skills_section}`}
        >
            <div className={`content leaning`}>
                <span
                    className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}
                >
                    {t('title')}
                </span>
                <div className={styles.skills_content}>
                    <div className={`${styles.box}`}>
                        {!isMobile ? (
                            <WideScreenView data={data} />
                        ) : (
                            <NarrowScreenView data={data} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

interface WideScreenViewProps {
    data: SkillCategory[];
}

const WideScreenView: React.FC<WideScreenViewProps> = ({ data }) => {
    const locale = useLocale() as Locale;
    const [selectedCategory, setSelectedCategory] = useState(
        categoryName(data[0], locale)
    );

    return (
        <>
            <div className={`${styles.menu}`}>
                {data.map((category, index) => (
                    <SkillCategoryView
                        key={index}
                        name={categoryName(category, locale)}
                        onClick={() =>
                            setSelectedCategory(categoryName(category, locale))
                        }
                        selectioned={
                            selectedCategory === categoryName(category, locale)
                        }
                    />
                ))}
            </div>
            <div className={`${styles.box_content}`}>
                {data.map((category, index) => (
                    <SkillsList
                        key={index}
                        skills={category.skills}
                        isVisible={
                            categoryName(category, locale) === selectedCategory
                        }
                    />
                ))}
            </div>
        </>
    );
};

interface SkillCategoryProps {
    name: string;
    selectioned: Boolean;
    onClick: () => void;
}

const SkillCategoryView: React.FC<SkillCategoryProps> = ({
    name,
    selectioned,
    onClick,
}) => {
    const style = {
        backgroundColor: selectioned ? 'rgb(255, 255, 255)' : 'unset',
        cursor: selectioned ? 'default' : 'pointer',
    };

    return (
        <div
            className={`${styles.category} ${proximaNovaBold.className}`}
            onClick={onClick}
            style={style}
        >
            {name}
        </div>
    );
};

interface NarrowScreenViewProps {
    data: SkillCategory[];
}

const NarrowScreenView: React.FC<NarrowScreenViewProps> = ({ data }) => {
    const locale = useLocale() as Locale;
    return (
        <>
            {data.map((category, index) => (
                <Fragment key={index}>
                    <div
                        className={`${styles.category_title} ${proximaNovaBold.className}`}
                    >
                        {categoryName(category, locale)}
                    </div>
                    <div className={`${styles.box_content}`}>
                        <SkillsList skills={category.skills} isVisible={true} />
                    </div>
                </Fragment>
            ))}
        </>
    );
};

interface SkillsListProps {
    skills: Skill[];
    isVisible: Boolean;
    onClick?: () => void;
}

const SkillsList: React.FC<SkillsListProps> = ({ skills, isVisible }) => {
    return (
        <div
            className={`${styles.skills_list}`}
            style={{ display: isVisible ? 'grid' : 'none' }}
        >
            {skills.map((skill, index) => (
                <Link
                    key={index}
                    style={{ textDecoration: 'none' }}
                    className={`${styles.skill} ${proximaNovaSemiBold.className}`}
                    href={skill.link}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Image
                        src={skill.logo}
                        alt={`Icon of ${skill.name}`}
                        width={83}
                        height={83}
                        style={{ width: '83px', height: '83px' }}
                    />
                    <span>{skill.name}</span>
                </Link>
            ))}
        </div>
    );
};

export default SkillsComponent;
