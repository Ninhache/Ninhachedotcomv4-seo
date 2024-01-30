"use client"

import { calibreRegular, calibreSemibold, ralewayMedium, ralewaySemiBold } from '@/app/fonts';
import { Experience } from '@/jsons/jsonUtils';

import styles from '@/styles/experience/experienceItem.module.css';
import '@/styles/globals.css'

import Link from 'next/link';
import { Fragment } from 'react';
import useMobileView from '@/app/_hooks/useMobileView';
import { useLocale } from 'next-intl';
import { Locale } from '@/config';
import Image from 'next/image';

interface ExperienceItemProps {
	inverted: Boolean;
	experience: Experience;
}

export const ExperienceItem: React.FC<ExperienceItemProps> = ({ inverted, experience }) => {

	const parts = experience.date.split("<br>");

	const isMobile = useMobileView();
	const locale = useLocale() as Locale;

	return (
		isMobile ? (
			<div className={`${styles.content}`} style={{ backgroundImage: `url(${experience.image})` }}>
				<div className={`${styles.information}`}>
					<div className={`${styles.type} ${ralewayMedium.className}`}>
						<span>{experience.translations[locale].type}</span>
						<span>
							{experience.date.split("<br>").map((part, index) => (
								<Fragment key={index}>
									{part}
									{index !== experience.date.split("<br>").length - 1 && <br />}
								</Fragment>
							))}
						</span>
					</div>
					<Link className={`${styles.title} ${calibreSemibold.className}`} href={experience.link} target="_blank">
						{experience.title}
					</Link>
					<div className={`${styles.text} ${calibreRegular.className}`}>
						<p>{experience.translations[locale].description}</p>
					</div>
					<div className={`tags ${styles.tags}`}>
						{experience.tags.map(tag => <Link className={`${ralewaySemiBold.className}`} key={tag.name} href={`${tag.url}`} target="_blank">{tag.name}</Link>)}
					</div>
				</div>
			</div>
		) : (
			<div className={`${styles.content} ${inverted ? styles.inverted : ""}`}>
				<div className={`${styles.information}`}>
					<div className={`${styles.type}`}
						style={{
							marginLeft: inverted ? 'unset' : '15px'
						}}
					>
						<span
							className={`${ralewayMedium.className}`}
							style={{
								marginRight: inverted ? '15px' : 'unset',
							}}
						>
							{parts.map((part, index) => (
								<Fragment key={index}>
									{part}
									{index !== parts.length - 1 && <br />}
								</Fragment>
							))}
						</span>
						{
							experience.translations[locale].type && 
								<span className={`${styles.type} ${ralewayMedium.className}`}>
									<i>{experience.translations[locale].type} - {experience.translations[locale].jobtitle}</i>
								</span>
						}
					</div>
					<Link className={`${styles.title} ${calibreSemibold.className}`} href={`${experience.link}`} target="_blank">
						{experience.title}
					</Link>
					<div className={`${styles.text} ${calibreRegular.className}`}>
						<p>
							{experience.translations[locale].description}
						</p>
					</div>
					<div className={`${styles.tags}`}>
						{experience.tags.map(tag => <Link className={`${ralewaySemiBold.className}`} key={tag.name} href={`${tag.url}`} target="_blank">{tag.name}</Link>)}
					</div>
				</div>
				<div className={`${styles.view}`}>
					<Link href={`${experience.link}`} target="_blank">
						<Image src={`${experience.image}`} alt={`${experience.title}`} width={600} height={340}/>
					</Link>
				</div>
			</div>
		)
	)
};
