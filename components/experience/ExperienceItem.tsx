"use client";
import { calibreRegular, calibreSemibold, ralewayMedium, ralewaySemiBold } from '@/app/fonts';
import { Experience } from '@/jsons/jsonUtils';

import styles from '@/styles/experience/experienceItem.module.css';
import '@/styles/globals.css'

import Link from 'next/link';
import { Fragment } from 'react';

interface ExperienceItemProps {
	inverted: Boolean;
	experience: Experience;
}

export const ExperienceItem: React.FC<ExperienceItemProps> = ({ inverted, experience }) => {

	const parts = experience.date.split("<br>");

	return (
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
						experience.type && <span className={`${styles.type} ${ralewayMedium.className}`}><i>{experience.type}</i></span>
					}
				</div>
				<a className={`${styles.title} ${calibreSemibold.className}`} href={`${experience.link}`} target="_blank">
					{experience.title}
				</a>
				<div className={`${styles.text} ${calibreRegular.className}`}>
					<p>{experience.description}</p>
					</div>
				<div className={`${styles.tags}`}>
					{
						experience.tags.map(tag => <Link className={`${styles.tag} ${ralewaySemiBold.className}`} key={tag.name} href={`${tag.url}`} target="_blank">{tag.name}</Link>)
					}
				</div>
			</div>
			<div className={`${styles.view}`}>
				<a className={`${styles.website_link}`} href={`${experience.link}`} target="_blank">
					<img className={`${styles.image}`} src={`${experience.image}`} />
					{experience.videoUrl !== `none` &&
						(<video className={`${styles.video}`} loop muted preload={`metadata`}>
							<source src={`${experience.videoUrl}`} type="video/mp4" />
						</video>)}
				</a>
			</div>
		</div>
	)
};
