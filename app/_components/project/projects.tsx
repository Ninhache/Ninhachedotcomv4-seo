"use client"

import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts'
import { Project } from '@/jsons/jsonUtils'
import rawData from '@/jsons/projects.json'

import styles from '@/styles/projects/project.module.css'

import { shuffleArray } from '@/utils'
import { useEffect, useState } from 'react'
import AnimatedComponent from '../AnimatedComponent'
import { BigProject } from './BigProject'
import { SmallProject } from './SmallProject'

import { useTranslations } from 'next-intl'

interface SortButtonData {
	label: string;
	value: SortType;
};

interface SortButtonProps {
	label: string;
	isSelected: boolean;
	className?: string;
	onClick: () => void;
};

const SortButton: React.FC<SortButtonProps> = ({ label, isSelected, className, onClick }) => (
	<button
		className={`${styles.choice} ${ralewaySemiBold.className} ${isSelected ? styles.selected : ''} `}
		onClick={onClick}
	>
		{label}
	</button>
);

export enum SortType {
	DATE = "Date",
	SCHOOL = "School",
	PERSONAL = "Personal",
	WEB = "Web",
	SIMULATIONS = "Simulations",
	RANDOM = "Random"
}

const sortByDate = (data: Project[]) => {
	data.sort((a, b) => {
		const aArr = a.date.split("/");
		const bArr = b.date.split("/");

		const aMonth = parseInt(aArr[0].toLowerCase(), 10) + 1;
		const bMonth = parseInt(bArr[0].toLowerCase(), 10) + 1;

		const aYear = parseInt(aArr[1].toLowerCase(), 10);
		const bYear = parseInt(bArr[1].toLowerCase(), 10);

		const aDate: Date = new Date(aYear, aMonth);
		const bDate: Date = new Date(bYear, bMonth);

		return bDate.getTime() - aDate.getTime();
	});

	return data;
};

const filterByTag = (data: Project[]) => {
	return function (searchedTag: string): Project[] {
		return data.filter(project =>
			project.sortCategories
				.includes(SortType[searchedTag.toUpperCase() as keyof typeof SortType]));
	};
};

const filterBySchool = (data: Project[]) => {
	return filterByTag(data)("school");
};

const filterByPersonal = (data: Project[]): Project[] => {
	return filterByTag(data)("personal");
};

const filterByWeb = (data: Project[]): Project[] => {
	return filterByTag(data)("web");
};

const filterBySimulations = (data: Project[]): Project[] => {
	return filterByTag(data)("simulations");
};

const sortByRandom = (data: Project[]): Project[] => {
	return shuffleArray(data);
};

const sortFunctions = {
	[SortType.DATE]: sortByDate,
	[SortType.SCHOOL]: filterBySchool,
	[SortType.PERSONAL]: filterByPersonal,
	[SortType.WEB]: filterByWeb,
	[SortType.SIMULATIONS]: filterBySimulations,
	[SortType.RANDOM]: sortByRandom,
};

const parseSortTypes = (categories: string[]): SortType[] => {
	return categories.map((category: string) => {
		const uppercaseCategory = category.toLocaleUpperCase();
		if (uppercaseCategory in SortType) {
			return SortType[uppercaseCategory as keyof typeof SortType];
		}
		throw new Error(`Invalid sort category: ${category}`);
	});
}

const jsonData: Project[] = rawData.map((item) => ({
	...item,
	sortCategories: parseSortTypes(item.sortCategories)
}));


interface ProjectsProps { };

const Projects: React.FC<ProjectsProps> = ({ }) => {
	const t = useTranslations("projects");

	const [selectedSort, setSelectedSort] = useState<SortType>(SortType.DATE);
	// We're using 2 states because some sortFunctions are "clearing" the array (to filter by tag and not sort)
	const [originalData, _] = useState<Project[]>(jsonData);
	const [sortedData, setSortedData] = useState<Project[]>(sortFunctions[SortType.DATE](jsonData));

	const sortButtons: SortButtonData[] = [
		{ label: t("sortButtons.date"), value: SortType.DATE },
		{ label: t("sortButtons.school"), value: SortType.SCHOOL },
		{ label: t("sortButtons.personal"), value: SortType.PERSONAL },
		{ label: t("sortButtons.web"), value: SortType.WEB },
		{ label: t("sortButtons.simulations"), value: SortType.SIMULATIONS },
		{ label: t("sortButtons.random"), value: SortType.RANDOM },
	];

	useEffect(() => {
		const sortData = (sortType: SortType) => {
			const sorted = sortFunctions[sortType]([...originalData]);
			setSortedData(sorted);
		};

		sortData(selectedSort);
	}, [selectedSort, originalData]);

	

	return (
		<>
			<section id={t('anchor')} className={`section ${styles.projects_section}`}>
				<div className={`content leaning`}>
					<span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>
						{t("title")}
					</span>
					<div className={styles.sort_choices}>
						<span className={`${styles.label} ${ralewaySemiBold.className}`}>
							{t("sortLabel")}
						</span>
						{sortButtons.map((button) => (
							<SortButton
								key={button.value}
								label={button.label}
								className={button.value === SortType.RANDOM ? `${styles.cursor}` : ``}
								isSelected={selectedSort === button.value}
								onClick={() => setSelectedSort(button.value)}
							/>
						))}
					</div>

					<div className={styles.projects_content}>
						{
							sortedData.slice(0, 7).map((item, index) => (
								<AnimatedComponent delay={100} key={index}>
									<BigProject
										key={item.title}
										project={item}
										isInverted={index % 2 !== 0}
									/>
								</AnimatedComponent>
							)
							)
						}
					</div>

					<div className={styles.other_projects_content}>
						{sortedData.slice(7, 21).map((item, index) => (
							<AnimatedComponent 
								delay={100}
								key={index}
								customCss={{
									height: '100%'
								}}	
							>
								<SmallProject
									key={item.title}
									project={item}
								/>
							</AnimatedComponent>
						))}
					</div>
				</div>
			</section>
			<div className={`section_end ${styles.projects_end}`}></div>
		</>
	)
}

export default Projects;