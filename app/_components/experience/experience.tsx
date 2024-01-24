"use client"

import { proximaNovaBold } from '@/app/fonts';

import rawData from '@/jsons/experiences.json';
import AnimatedComponent from '../AnimatedComponent';

import { ExperienceItem } from './ExperienceItem';

import styles from '@/styles/experience/experience.module.css';
import '@/styles/globals.css'

export default function Experience() {

	return (
		<>
			<section className={`section ${styles.section}`} id="experience">
				<div className={`content leaning`}>
					<span className={`section_title ${styles.title} ${proximaNovaBold.className}`}>Where I&apos;ve Worked</span>
					<div className={styles.content}>
						{
							rawData.map((item, index) => {
								return (
									<AnimatedComponent delay={100} key={index}>
										<ExperienceItem key={index} experience={item} inverted={index % 2 === 0} />
									</AnimatedComponent>
								)
							})
						}
					</div>
				</div>
			</section>
			<div className={`section_end ${styles.experience_end}`} />
		</>
	)
}
