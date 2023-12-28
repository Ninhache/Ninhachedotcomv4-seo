"use client"

import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts'
import { Project } from '@/jsons/jsonUtils'
import rawData from '@/jsons/projects.json'

import styles from '@/styles/projects/project.module.css'

import { shuffleArray } from '@/utils'
import { useEffect, useState } from 'react'
import { BigProject } from './BigProject'
import { SmallProject } from './SmallProject'
import AnimatedComponent from '../AnimatedComponent'

interface SortButtonData {
	label: string;
	value: SortType;
};

interface SortButtonProps {
	label: string;
	isSelected: boolean;
	onClick: () => void;
};

const SortButton: React.FC<SortButtonProps> = ({ label, isSelected, onClick }) => (
	<button
		className={`${styles.choice} ${ralewaySemiBold.className} ${isSelected ? styles.selected : ''}`}
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
	const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

	data.sort((a, b) => {
		const aArr = a.date.split(" ");
		const bArr = b.date.split(" ");

		// Convert month name to a number (0-11)
		const aMonth = monthNames.indexOf(aArr[0].toLowerCase());
		const bMonth = monthNames.indexOf(bArr[0].toLowerCase());

		// Create Date objects
		const aDate: Date = new Date(parseInt(aArr[1]), aMonth);
		const bDate: Date = new Date(parseInt(bArr[1]), bMonth);

		// Compare dates
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

export default function Projects() {

	const [selectedSort, setSelectedSort] = useState<SortType>(SortType.DATE);
	const [originalData, _] = useState<Project[]>(jsonData);
	const [sortedData, setSortedData] = useState<Project[]>(sortFunctions[SortType.DATE](jsonData));

	const sortData = (sortType: SortType) => {
		const sorted = sortFunctions[sortType]([...originalData]);

		setSortedData(sorted);
	};

	const sortButtons: SortButtonData[] = [
		{ label: 'Date', value: SortType.DATE },
		{ label: 'School', value: SortType.SCHOOL },
		{ label: 'Personal', value: SortType.PERSONAL },
		{ label: 'Web', value: SortType.WEB },
		{ label: 'Simulations', value: SortType.SIMULATIONS },
		{ label: 'Random', value: SortType.RANDOM },
	];

	useEffect(() => {
		sortData(selectedSort);
	}, [selectedSort, originalData]);

	return (
		<>
			<section id="projects" className={`section ${styles.projects_section}`}>
				<div className={`content leaning ${styles.content}`}>
					<span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>Some of my Projects</span>

					<div className={styles.sort_choices}>
						<span className={`${styles.label} ${ralewaySemiBold.className}`}>Sort by</span>
						{sortButtons.map((button) => (
							<SortButton
								key={button.value}
								label={button.label}
								isSelected={selectedSort === button.value}
								onClick={() => setSelectedSort(button.value)}
							/>
						))}
					</div>

					<div className={styles.projects_content}>
						{
							sortedData.slice(0, 7).map((item, index) => (
								<AnimatedComponent delay={100}>
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
							<AnimatedComponent delay={100}>
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