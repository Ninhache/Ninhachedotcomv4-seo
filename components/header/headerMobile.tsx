"use client"

import ButtonArrow from "@/public/svg/ButtonArrow.svg"

import styles from '@/styles/headerMobile.module.css'


export default function HeaderMobile() {
	return (
		<div className={styles.menu_div}>
			<svg className={styles.menu_icon} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
				<line x1="10" y1="10" x2="90" y2="90" />
				<line x1="10" y1="90" x2="90" y2="10" />
			</svg>
			<div className={styles.menu}>
				<ol>
					<li className={styles.home}><a className={styles.not_button} href="#home">Home</a></li>
					<li className={styles.about}><a className={styles.not_button} href="#about">About</a></li>
					<li className={styles.projects}><a className={styles.not_button} href="#projects">Projects</a></li>
					<li className={styles.skills}><a className={styles.not_button} href="#skills">Skills</a></li>
					<li className={styles.experience}><a className={styles.not_button} href="#experience">Experience</a></li>
					<li className={styles.contact}>
						<a className="button" href="#contact">
							<p>Contact</p>
							<svg className={`button_arrow ${styles.button_arrow}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.69 17.39"><g>
								<path className="path_1" d="M8.9 12.4 L8.9 12.4" />
								<path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" /></g>
							</svg>
						</a>
					</li>
				</ol>
			</div>
		</div>
	)
}



