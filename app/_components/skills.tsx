"use client"

import { Skill, SkillCategory } from '@/jsons/jsonUtils';
import rawData from '@/jsons/skills.json';
import React, { Fragment, useState } from 'react';

import useMobileView from '@/app/_hooks/useMobileView';
import { proximaNovaBold, proximaNovaSemiBold } from '@/app/fonts';
import { Locale } from '@/config';
import styles from '@/styles/skills.module.css';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

interface SkillsComponentProps { }

const SkillsComponent: React.FC<SkillsComponentProps> = () => {

	const isMobile = useMobileView();
	const t = useTranslations('skills');

	return (
		<section id={t('anchor')} className={`section ${styles.skills_section}`}>
			<div className={`content leaning`}>
				<span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>{t("title")}</span>
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

	const locale = useLocale() as Locale;
	const [selectedCategory, setSelectedCategory] = useState(data[0].translations[locale].name);

	return (
		<>
			<div className={`${styles.menu}`}>
				{data.map((category, index) => (
					<SkillCategoryView key={index} name={category.translations[locale].name} onClick={() => setSelectedCategory(category.translations[locale].name)} selectioned={selectedCategory === category.translations[locale].name} />
				))}
			</div>
			<div className={`${styles.box_content}`}>
				{data.map((category, index) => (
					<SkillsList key={index} skills={category.skills} isVisible={category.translations[locale].name === selectedCategory} />
				))}
			</div>
		</>)
}

interface SkillCategoryProps {
	name: string;
	selectioned: Boolean;
	onClick: () => void;
}

const SkillCategoryView: React.FC<SkillCategoryProps> = ({ name, selectioned, onClick }) => {

	const style = {
		'backgroundColor': selectioned ? 'rgb(255, 255, 255)' : 'unset',
		'cursor': selectioned ? 'default' : 'pointer',
	}

	return (
		<div
			className={`${styles.category} ${proximaNovaBold.className}`}
			onClick={onClick}
			style={style}
		>{name}</div>
	)
};

interface NarrowScreenViewProps {
	data: SkillCategory[];
}

const NarrowScreenView: React.FC<NarrowScreenViewProps> = ({ data }) => {

	const locale = useLocale() as Locale;
	return (
		<>
			{
				data.map((category, index) => (
					<Fragment key={index}>
						<div className={`${styles.category_title} ${proximaNovaBold.className}`}>
							{category.translations[locale].name}
						</div>
						<div className={`${styles.box_content}`}>
							<SkillsList skills={category.skills} isVisible={true} />
						</div>
					</Fragment>
				))
			}
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
				<Link key={index} style={{ textDecoration: 'none' }} className={`${styles.skill} ${proximaNovaSemiBold.className}`} href={skill.link} target="_blank" rel="noopener noreferrer">
					<Image src={skill.logo} alt={`Icon of ${skill.name}`} width={83} height={83}/>
					<span>{skill.name}</span>
				</Link>
			))}
		</div>)
};

export default SkillsComponent;