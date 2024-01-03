"use client"

import { Skill, SkillCategory } from '@/jsons/jsonUtils';
import rawData from '@/jsons/skills.json';
import React, { useState } from 'react';

import { proximaNovaBold, proximaNovaSemiBold } from '@/app/fonts';
import styles from '@/styles/skills.module.css';
import isMobileView from '@/components/hooks/useMobileView';

interface SkillsComponentProps { }

const SkillsComponent: React.FC<SkillsComponentProps> = () => {
	
	const isMobile = isMobileView();

	return (
		<section id={`skills`} className={`section ${styles.skills_section}`}>
			<div className={`content leaning`}>
				<span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>What are my Skills?</span>
				<div className={styles.skills_content}>
					<div className={`${styles.box}`}>
						{!isMobile ? <WideScreenView data={rawData} /> : <NarrowScreenView data={rawData} />}
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

	const [selectedCategory, setSelectedCategory] = useState(rawData[0].name);


	return (
		<>
			<div className={`${styles.menu}`}>
				{data.map((category, index) => (
					<SkillCategoryView key={index} category={category} onClick={() => setSelectedCategory(category.name)} selectioned={selectedCategory === category.name} />
				))}
			</div>
			<div className={`${styles.box_content}`}>
				{data.map((category, index) => (
					<SkillsList key={index} skills={category.skills} isVisible={category.name === selectedCategory} />
				))}
			</div>
		</>)
}

interface SkillCategoryProps {
	category: SkillCategory;
	selectioned: Boolean;
	onClick: () => void;
}


const SkillCategoryView: React.FC<SkillCategoryProps> = ({ category, selectioned, onClick }) => {

	const style = {
		'backgroundColor': selectioned ? 'rgb(255, 255, 255)' : 'unset',
		'cursor': selectioned ? 'default' : 'pointer',
	}

	return (
		<div
			className={`${styles.category} ${proximaNovaBold.className}`}
			onClick={onClick}
			style={style}
		>{category.name}</div>
	)
};


interface NarrowScreenViewProps {
	data: SkillCategory[];
}

const NarrowScreenView: React.FC<NarrowScreenViewProps> = ({ data }) => {
	return (
		<>
			{data.map((category, index) => (
				<div key={index}>
					<div className={`${styles.category_title} ${proximaNovaBold.className}`}>{category.name}</div>
					<div className={`${styles.box_content}`}>
						<SkillsList skills={category.skills} isVisible={true} />
					</div>
				</div>
			))}
		</>
	)
};

interface SkillsListProps {
	skills: Skill[];
	isVisible: Boolean;
	onClick?: () => void;
}


const SkillsList: React.FC<SkillsListProps> = ({ skills, isVisible }) => {

	return (
		<div className={`${styles.skills_list}`}
			style={{ display: isVisible ? 'grid' : 'none' }}
		>
			{skills.map((skill, index) => (
				<a key={index} style={{textDecoration: 'none'}} className={`${styles.skill} ${proximaNovaSemiBold.className}`} href={skill.link} target="_blank" rel="noopener noreferrer">
					<img src={skill.logo} alt={skill.name} />
					<span>{skill.name}</span>
				</a>
			))}
		</div>)
};

export default SkillsComponent;