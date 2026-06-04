'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts';
import { Project } from '@/jsons/jsonUtils';
import { SORT_TYPE, type SortType } from '@/lib/project-categories';
import styles from '@/styles/projects/project.module.css';
import { shuffleArray } from '@/utils';
import AnimatedComponent from '../AnimatedComponent';
import { BigProject } from './BigProject';
import { SmallProject } from './SmallProject';

interface SortButtonData {
    label: string;
    value: SortType;
}

interface SortButtonProps {
    label: string;
    isSelected: boolean;
    className?: string;
    onClick: () => void;
}

const SortButton: React.FC<SortButtonProps> = ({
    label,
    isSelected,
    className,
    onClick,
}) => (
    <button
        className={`${styles.choice} ${ralewaySemiBold.className} ${
            isSelected ? styles.selected : ''
        } ${className ?? ''}`}
        onClick={onClick}
    >
        {label}
    </button>
);

type SortDir = 'asc' | 'desc';

const time = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

const sortByDate = (data: Project[], dir: SortDir = 'asc') => {
    // asc => oldest first; desc => newest first.
    const factor = dir === 'asc' ? 1 : -1;
    data.sort((a, b) => {
        // Under-development projects (no endDate) always come first, whatever
        // the direction — they're the "current" work.
        if (a.ongoing !== b.ongoing) return a.ongoing ? -1 : 1;
        // Both finished: order by endDate in the chosen direction.
        if (!a.ongoing && !b.ongoing) {
            const byEnd = time(a.endDate) - time(b.endDate);
            if (byEnd !== 0) return byEnd * factor;
        }
        // Tiebreak (and the ordering within the ongoing group) by startDate.
        return (time(a.startDate) - time(b.startDate)) * factor;
    });

    return data;
};

const filterByTag = (data: Project[]) => {
    return function (searchedTag: SortType): Project[] {
        return data.filter(project =>
            project.sortCategories.includes(
                searchedTag
                // SortType[searchedTag.toUpperCase() as keyof typeof SortType]
            )
        );
    };
};

const filterBySchool = (data: Project[]) => {
    return filterByTag(data)('school');
};

const filterByPersonal = (data: Project[]): Project[] => {
    return filterByTag(data)('personal');
};

const filterByWeb = (data: Project[]): Project[] => {
    return filterByTag(data)('web');
};

const filterBySimulations = (data: Project[]): Project[] => {
    return filterByTag(data)('simulations');
};

const sortByRandom = (data: Project[]): Project[] => {
    return shuffleArray(data);
};

const sortFunctions: Record<SortType, (data: Project[]) => Project[]> = {
    date: sortByDate,
    school: filterBySchool,
    personal: filterByPersonal,
    web: filterByWeb,
    simulations: filterBySimulations,
    random: sortByRandom,
};

const parseSortTypes = (categories: string[]): SortType[] => {
    return categories.map((category: string) => {
        const uppercaseCategory = category.toLocaleUpperCase();
        return SORT_TYPE[uppercaseCategory as keyof typeof SORT_TYPE];
    });
};

interface ProjectsProps {
    data: Project[];
}

const Projects: React.FC<ProjectsProps> = ({ data }) => {
    const t = useTranslations('projects');

    const [allProjects] = useState<Project[]>(data);
    const [selectedSort, setSelectedSort] = useState<SortType>('date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [displayedProjects, setDisplayedProjects] = useState<Project[]>([]);
    const [sortKey, setSortKey] = useState(0);

    const runSort = useCallback(
        (sortType: SortType, dir: SortDir) => {
            const newData =
                sortType === 'date'
                    ? sortByDate([...allProjects], dir)
                    : sortFunctions[sortType]([...allProjects]);
            setDisplayedProjects(newData);
        },
        [allProjects]
    );

    useEffect(() => {
        if (selectedSort !== SORT_TYPE.RANDOM) {
            runSort(selectedSort, sortDir);
        }
    }, [selectedSort, sortDir, runSort]);

    useEffect(() => {
        if (selectedSort === SORT_TYPE.RANDOM) {
            runSort(SORT_TYPE.RANDOM, sortDir);
        }
    }, [sortKey, runSort]);

    const handleSortClick = (sortType: SortType) => {
        if (sortType === SORT_TYPE.RANDOM) {
            setSortKey(prev => prev + 1);
            setSelectedSort(sortType);
            return;
        }

        if (sortType === 'date') {
            if (selectedSort === 'date') {
                // Re-clicking the active date sort flips its direction.
                setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
            } else {
                // Entering the date sort always starts on DESC (newest first).
                setSortDir('desc');
                setSelectedSort('date');
            }
            return;
        }

        setSelectedSort(sortType);
    };

    const sortButtons: SortButtonData[] = [
        { label: t('sortButtons.date'), value: 'date' },
        { label: t('sortButtons.school'), value: 'school' },
        { label: t('sortButtons.personal'), value: 'personal' },
        { label: t('sortButtons.web'), value: 'web' },
        { label: t('sortButtons.simulations'), value: 'simulations' },
        { label: t('sortButtons.random'), value: 'random' },
    ];

    return (
        <>
            <section
                id={t('anchor')}
                className={`section ${styles.projects_section}`}
            >
                <div className={`content leaning`}>
                    <span
                        className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}
                    >
                        {t('title')}
                    </span>
                    <div className={styles.sort_choices}>
                        <span
                            className={`${styles.label} ${ralewaySemiBold.className}`}
                        >
                            {t('sortLabel')}
                        </span>
                        {sortButtons.map(button => (
                            <SortButton
                                key={button.value}
                                label={
                                    button.value === 'date' &&
                                    selectedSort === 'date'
                                        ? `${button.label} ${sortDir === 'asc' ? '↑' : '↓'}`
                                        : button.label
                                }
                                className={
                                    button.value === 'date'
                                        ? styles.toggleable
                                        : ''
                                }
                                isSelected={
                                    button.value !== 'random' &&
                                    selectedSort === button.value
                                }
                                onClick={() => {
                                    handleSortClick(button.value);
                                }}
                            />
                        ))}
                    </div>

                    <div className={styles.projects_content}>
                        {displayedProjects.slice(0, 7).map((item, index) => (
                            <AnimatedComponent delay={100} key={index}>
                                <BigProject
                                    key={item.title}
                                    project={item}
                                    isInverted={index % 2 !== 0}
                                />
                            </AnimatedComponent>
                        ))}
                    </div>

                    <div className={styles.other_projects_content}>
                        {displayedProjects.slice(7, 21).map((item, index) => (
                            <AnimatedComponent
                                delay={100}
                                key={index}
                                customCss={{
                                    height: '100%',
                                }}
                            >
                                <SmallProject key={item.title} project={item} />
                            </AnimatedComponent>
                        ))}
                    </div>
                </div>
            </section>
            <div className={`section_end ${styles.projects_end}`}></div>
        </>
    );
};

export default Projects;
