"use client"

import { proximaNovaBold } from '@/app/fonts'

import styles from '@/styles/skills.module.css'

import rawData from '@/jsons/skills.json'
import { Skill, SkillCategory } from '@/jsons/jsonUtils';
import { useState } from 'react';

interface SkillsListProps {
	skills: Skill[];
	isVisible: boolean;
}

const SkillsList: React.FC<SkillsListProps> = ({ skills, isVisible }) => (
	<div
		className={`${styles.skills_list}`}
		style={{ display: isVisible ? 'grid' : 'none' }}
	>
		{skills.map(skill => (
			<a key={skill.name} className={`${styles.skill} ${proximaNovaBold.className}`} href={skill.link} target="_blank" rel="noopener noreferrer">
				<img src={skill.logo} alt={skill.name} />
				<span>{skill.name}</span>
			</a>
		))}
	</div>
);

interface SkillCategoryProps {
	category: SkillCategory;
	selectioned: Boolean;
	onClick: () => void;
}

const SkillCategory: React.FC<SkillCategoryProps> = ({ category, selectioned, onClick }) => {

	const style = {
		'backgroundColor': selectioned ? 'rgb(255, 255, 255)' : 'unset',
		'cursor': selectioned ? 'default' : 'pointer',
	}

	return (
		<div
			className={`${styles.category} ${proximaNovaBold.className}`}
			style={style}
			onClick={onClick}
		>
			{category.name}
		</div>)
}


export default function Skills() {

	const [selectedCategory, setSelectedCategory] = useState(rawData[0].name);

	return (
		<>
			<section id={`skills`} className={`section ${styles.skills_section}`}>
				<div className={`content leaning`}>
					<span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>What are my Skills?</span>
					<div className={styles.skills_content}>
						<div className={styles.box}>
							<div className={`${styles.menu}`}>
								{rawData.map((category, index) => (
									<SkillCategory
										key={index}
										category={category}
										selectioned={category.name === selectedCategory}
										onClick={() => setSelectedCategory(category.name)}
									/>
								))}
							</div>
							<div className={`${styles.box_content}`}>
								{rawData.map(category =>
									<SkillsList
										key={category.name}
										skills={category.skills}
										isVisible={selectedCategory === category.name}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</section>

			<div className={`section_end ${styles.skills_end}`}></div>
		</>
	)
}
