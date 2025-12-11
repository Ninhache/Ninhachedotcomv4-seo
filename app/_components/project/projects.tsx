'use client'

import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts'
import { Project } from '@/jsons/jsonUtils'
import rawData from '@/jsons/projects.json'

import styles from '@/styles/projects/project.module.css'

import { shuffleArray } from '@/utils'
import { useCallback, useEffect, useState } from 'react'
import AnimatedComponent from '../AnimatedComponent'
import { BigProject } from './BigProject'
import { SmallProject } from './SmallProject'

import { useTranslations } from 'next-intl'

interface SortButtonData {
  label: string
  value: SortType
}

interface SortButtonProps {
  label: string
  isSelected: boolean
  className?: string
  onClick: () => void
}

const SortButton: React.FC<SortButtonProps> = ({ label, isSelected, className, onClick }) => (
  <button
    className={`${styles.choice} ${ralewaySemiBold.className} ${
      isSelected ? styles.selected : ''
    } `}
    onClick={onClick}
  >
    {label}
  </button>
)

export const SORT_TYPE = {
  DATE: 'date',
  SCHOOL: 'school',
  PERSONAL: 'personal',
  WEB: 'web',
  SIMULATIONS: 'simulations',
  RANDOM: 'random',
} as const

export type SortType = (typeof SORT_TYPE)[keyof typeof SORT_TYPE]

const sortByDate = (data: Project[]) => {
  data.sort((a, b) => {
    const aArr = a.date.split('/')
    const bArr = b.date.split('/')

    const aMonth = parseInt(aArr[0].toLowerCase(), 10) + 1
    const bMonth = parseInt(bArr[0].toLowerCase(), 10) + 1

    const aYear = parseInt(aArr[1].toLowerCase(), 10)
    const bYear = parseInt(bArr[1].toLowerCase(), 10)

    const aDate: Date = new Date(aYear, aMonth)
    const bDate: Date = new Date(bYear, bMonth)

    return bDate.getTime() - aDate.getTime()
  })

  return data
}

const filterByTag = (data: Project[]) => {
  return function (searchedTag: SortType): Project[] {
    return data.filter((project) =>
      project.sortCategories.includes(
        searchedTag,
        // SortType[searchedTag.toUpperCase() as keyof typeof SortType]
      ),
    )
  }
}

const filterBySchool = (data: Project[]) => {
  return filterByTag(data)('school')
}

const filterByPersonal = (data: Project[]): Project[] => {
  return filterByTag(data)('personal')
}

const filterByWeb = (data: Project[]): Project[] => {
  return filterByTag(data)('web')
}

const filterBySimulations = (data: Project[]): Project[] => {
  return filterByTag(data)('simulations')
}

const sortByRandom = (data: Project[]): Project[] => {
  return shuffleArray(data)
}

const sortFunctions: Record<SortType, (data: Project[]) => Project[]> = {
  date: sortByDate,
  school: filterBySchool,
  personal: filterByPersonal,
  web: filterByWeb,
  simulations: filterBySimulations,
  random: sortByRandom,
}

const parseSortTypes = (categories: string[]): SortType[] => {
  return categories.map((category: string) => {
    const uppercaseCategory = category.toLocaleUpperCase()
    return SORT_TYPE[uppercaseCategory as keyof typeof SORT_TYPE]
  })
}

const jsonData: Project[] = rawData.map((item) => ({
  ...item,
  sortCategories: parseSortTypes(item.sortCategories),
}))

const Projects: React.FC = () => {
  const t = useTranslations('projects')

  const [allProjects] = useState<Project[]>(jsonData)
  const [selectedSort, setSelectedSort] = useState<SortType>('date')
  const [displayedProjects, setDisplayedProjects] = useState<Project[]>([])
  const [sortKey, setSortKey] = useState(0)

  const runSort = useCallback(
    (sortType: SortType) => {
      const newData = sortFunctions[sortType]([...allProjects])
      setDisplayedProjects(newData)
    },
    [allProjects],
  )

  useEffect(() => {
    if (selectedSort !== SORT_TYPE.RANDOM) {
      runSort(selectedSort)
    }
  }, [selectedSort, runSort])

  useEffect(() => {
    if (selectedSort === SORT_TYPE.RANDOM) {
      runSort(SORT_TYPE.RANDOM)
    }
  }, [sortKey, runSort])

  const handleSortClick = (sortType: SortType) => {
    if (sortType === SORT_TYPE.RANDOM) {
      setSortKey((prev) => prev + 1)
    }

    setSelectedSort(sortType)
  }

  const sortButtons: SortButtonData[] = [
    { label: t('sortButtons.date'), value: 'date' },
    { label: t('sortButtons.school'), value: 'school' },
    { label: t('sortButtons.personal'), value: 'personal' },
    { label: t('sortButtons.web'), value: 'web' },
    { label: t('sortButtons.simulations'), value: 'simulations' },
    { label: t('sortButtons.random'), value: 'random' },
  ]

  return (
    <>
      <section id={t('anchor')} className={`section ${styles.projects_section}`}>
        <div className={`content leaning`}>
          <span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>
            {t('title')}
          </span>
          <div className={styles.sort_choices}>
            <span className={`${styles.label} ${ralewaySemiBold.className}`}>{t('sortLabel')}</span>
            {sortButtons.map((button) => (
              <SortButton
                key={button.value}
                label={button.label}
                className={button.value === 'random' ? `${styles.cursor}` : ``}
                isSelected={button.value !== 'random' && selectedSort === button.value}
                onClick={() => {
                  handleSortClick(button.value)
                }}
              />
            ))}
          </div>

          <div className={styles.projects_content}>
            {displayedProjects.slice(0, 7).map((item, index) => (
              <AnimatedComponent delay={100} key={index}>
                <BigProject key={item.title} project={item} isInverted={index % 2 !== 0} />
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
  )
}

export default Projects
