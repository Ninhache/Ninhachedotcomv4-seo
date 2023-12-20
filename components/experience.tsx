"use client"

import { proximaNovaBold } from '@/app/fonts'
import styles from '@/styles/experience.module.css'

export default function Experience() {
	return (
		<>
		<a id="experience"></a>
		<section className={`section ${styles.experience_section}`}>
			<div className={`content leaning ${styles.content}`}>
				<span className={`section_title ${proximaNovaBold.className}`}>Where I&apos;ve Worked</span>
				<div className={styles.experience_content}></div>
			</div>
		</section>
		<div className={`section_end ${styles.experience_end}`}></div>
		</>
	)
}
