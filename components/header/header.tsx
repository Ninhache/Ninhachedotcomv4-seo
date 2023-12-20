"use client"

import styles from '@/styles/header.module.css'
import { ralewaySemiBold } from "@/app/fonts"
import { useEffect } from 'react';
import { sleep } from '@/utils';

async function inAnimation() {
	let elements = document.querySelectorAll("#header .in_animation");

	for (let i of elements) {
		const element = i as HTMLElement;
		element.style.opacity = "1";
		element.style.transform = "translateY(0)";
		await sleep(100);
	}
}

export default function Header() {

	useEffect(() => {
		inAnimation();
	}, []);

	return (
		<div className={`${styles.header_div}`}>
			<header id="header" className={`${styles.header} ${ralewaySemiBold.className}`}>
				<nav className={styles.nav}>
					<div className={styles.logo}>
						<a className={`in_animation ${styles.in_animation}`} href="https://ninhache.fr/">
							<img src="/svg/Logo.svg" alt="logo"></img>
						</a>
					</div>
					<div className={styles.menu}>
						<ol>
							<li className={`${styles.home} in_animation ${styles.in_animation}`}><a className={styles.not_button} href="#home">Home</a></li>
							<li className={`${styles.about} in_animation ${styles.in_animation}`}><a className={styles.not_button} href="#about">About</a></li>
							<li className={`${styles.projects} in_animation ${styles.in_animation}`}><a className={styles.not_button} href="#projects">Projects</a></li>
							<li className={`${styles.skills} in_animation ${styles.in_animation}`}><a className={styles.not_button} href="#skills">Skills</a></li>
							<li className={`${styles.experience} in_animation ${styles.in_animation}`}><a className={styles.not_button} href="#experience">Experience</a></li>
							<li className={`${styles.contact} in_animation ${styles.in_animation}`}>
								<a className={`button ${styles.button} in_animation ${styles.in_animation}`} href="#contact">
									<p>Contact</p>
									<svg className={`button_arrow ${styles.button_arrow}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.69 17.39">
										<g>
											<path className="path_1" d="M8.9 12.4 L8.9 12.4" />
											<path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
										</g>
									</svg>
								</a>
							</li>
						</ol>
					</div>
				</nav>
			</header>
		</div>
	)
}
