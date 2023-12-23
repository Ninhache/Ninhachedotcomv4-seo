"use client"

import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts'
import styles from '@/styles/projects.module.css'
import { useEffect, useState } from 'react'
import rawData from '@/jsons/projects.json'
import { Project, Tag } from '@/jsons/jsonUtils'
import { isInViewport, shuffleArray, sleep } from '@/utils'
import Link from 'next/link'
import Image from 'next/image'

interface SortButtonData {
	label: string;
	value: SortType;
};

interface SortButtonProps {
	label: string;
	isSelected: boolean;
	onClick: () => void;
};

interface BigProjectProps {
	project: Project;
	isInverted: boolean;
};

const SortButton: React.FC<SortButtonProps> = ({ label, isSelected, onClick }) => (
	<button
		className={`${styles.choice} ${ralewaySemiBold.className} ${isSelected ? styles.selected : ''}`}
		onClick={onClick}
	>
		{label}
	</button>
);

const BigProject: React.FC<BigProjectProps> = ({ project, isInverted }) => {

	// aniations
	const [isAnimationDone, setAnimationDone] = useState(false);
	const inAnimationCheck = async () => {
		if (!isAnimationDone) {
			const elements = document.querySelectorAll("#projects .in_animation") as NodeListOf<HTMLElement>;

			if (elements.length === 0) return;

			if (isInViewport(elements[0])) {
				for (let i of elements) {
					const element = i as HTMLElement;
					element.style.opacity = "1";
					element.style.transform = "translateY(0)";
					await sleep(100);
				}
				setAnimationDone(true);
			}
		}
	}
	useEffect(() => {
		const handleScroll = () => {
			inAnimationCheck();
		};

		const handleResize = () => {
			inAnimationCheck();
		};

		window.addEventListener("scroll", handleScroll);
		window.addEventListener("resize", handleResize);

		// Initial check
		inAnimationCheck();

		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleResize);
		};
	}, [isAnimationDone]);


	return (
		<>
			<div className={`in_animation ${styles.in_animation} project ${styles.project} ${isInverted ? `inverted ${styles.inverted}` : ""}`}>
				<div className={`${styles.project_text}`}>
					<div className={`${styles.type}`}>
						<span>{project.date}</span>
						<span>•</span>
						<span>{project.type}</span>
					</div>
					<Link className={`${styles.project_title}`} href={`${project.links.redirect}`} target="_blank">{project.title}</Link>
				<div className={`${styles.text}`}>
					<p>{project.description}</p>
				</div>
				<div className={`${styles.tags}`}>
					{
						project.tags.map(tag =>
							<Link key={tag.name} href={`${tag.url}`} target="_blank">{tag.name}</Link>
						)
					}
				</div>
				<div className={`${styles.links}`}>
					{
						project.links.git ??
							<a className={`github ${styles.github}`} href={`${project.links.git}`} target='_blank'>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.05 20.31"><g><path d="M7.26 16.34c-4.11 1.23-4.11-2.06-5.76-2.47M13 18.81V15.62a2.78 2.78 0 0 0-.77-2.15c2.59-.28 5.3-1.26 5.3-5.76a4.46 4.46 0 0 0-1.23-3.08 4.18 4.18 0 0 0-.08-3.11s-1-.29-3.22 1.22a11 11 0 0 0-5.76 0C5 1.23 4 1.52 4 1.52A4.18 4.18 0 0 0 4 4.63 4.48 4.48 0 0 0 2.73 7.74c0 4.46 2.72 5.44 5.31 5.76a2.8 2.8 0 0 0-.78 2.12v3.19"/></g></svg>
								<span className={`${styles.bubble}`}>See the code</span>
							</a>
					}
					{
						project.links.play ?? 
							<a className={`${styles.test}`} href="${project.links[2]}" target="_blank">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.09 18.64"><g><path d="M14.55 7.52 4.62 1.78A2.08 2.08 0 0 0 1.5 3.58V15.05a2.08 2.08 0 0 0 3.12 1.8l9.93-5.73A2.08 2.08 0 0 0 14.55 7.52Z"/></g></svg>
								<span className={`${styles.bubble}`}>Test the program</span>
							</a>
					}
				</div>
			</div>
			<div className={`${styles.project_view}`}>
				<a href={`${project.links.redirect}`} target="_blank">
					<img src={project.image} alt={`Image of the project ${project.title}`} />
				</a>
			</div>
		</div >
		</>
	);
}

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

const filterBySchool = (data: Project[]) => {

	return data;
};

const filterByTag = (data: Project[]) => {
	return function (searchedTag: string): Project[] {
		return data.filter(project =>
			project.sortCategories
				.includes(SortType[searchedTag.toUpperCase() as keyof typeof SortType]));
	};
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

const jsonData = rawData.map(item => ({
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
					<span className={`section_title ${proximaNovaBold.className}`}>Some of my Projects</span>

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
							sortedData.slice(0, 7).map((item, index) =>
								<BigProject
									key={index}
									project={item}
									isInverted={index % 2 !== 0}
								/>
							)
						}
					</div>

					<div className={styles.other_projects_content}>
						{sortedData.slice(7, 21).map((item, index) => {
							return <div key={index}>
								Mini-{index} - {item.title}
							</div>
						})}
					</div>
				</div>
			</section>
			<div className={`section_end ${styles.projects_end}`}></div>
		</>
	)
}
