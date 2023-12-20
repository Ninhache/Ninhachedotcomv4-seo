"use client"

import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts'
import styles from '@/styles/projects.module.css'

export default function Projects() {
	return (
		<>
		<a id="projects"></a>
		<section className={`section ${styles.projects_section}`}>
			<div className={`content leaning ${styles.content}`}>
				<span className={`section_title ${proximaNovaBold.className}`}>Some of my Projects</span>
				<div className={styles.sort_choices}>
					<span className={`${styles.label} ${ralewaySemiBold.className}`}>Sort by</span>
					{/* <div className="choice">Default</div> */}
					<div className={`${styles.choice} ${styles.selected} ${ralewaySemiBold.className}`}>Date</div>
					<div className={`${styles.choice} ${ralewaySemiBold.className}`}>School</div>
					<div className={`${styles.choice} ${ralewaySemiBold.className}`}>Personal</div>
					<div className={`${styles.choice} ${ralewaySemiBold.className}`}>Web</div>
					<div className={`${styles.choice} ${ralewaySemiBold.className}`}>Simulations</div>
					<div className={`${styles.choice} ${ralewaySemiBold.className}`}>Random</div>
				</div>

				<div className={styles.projects_content}>
					{/* The 7th first projects  */}
				</div>

				<div className={styles.other_projects_content}>
					{/* Little projects */}
				</div>
			</div>
		</section>
		<div className={`section_end ${styles.projects_end}`}></div>
		</>
	)
}
