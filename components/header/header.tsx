"use client"

import styles from '@/styles/header.module.css';
import { useEffect, useState } from 'react';
import AnimatedComponent from "../AnimatedComponent";
import { ralewaySemiBold } from '@/app/fonts';

export default function Header() {
	const [isVisible, setIsVisible] = useState(true);
	const [isTop, setIsTop] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	useEffect(() => {
		const controlHeader = () => {
			if (typeof window !== 'undefined') {
				const currentScrollY = window.scrollY;
				setIsVisible(currentScrollY <= lastScrollY || currentScrollY <= 50);
				setLastScrollY(currentScrollY);
				setIsTop(currentScrollY <= 50);
			}
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', controlHeader);
			return () => window.removeEventListener('scroll', controlHeader);
		}
	}, [lastScrollY]);

	const headerStyle = {
		transition: 'all 0.5s ease-in-out',
		transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
		backgroundColor: isTop ? 'transparent' : 'var(--fade_dark_blue)',
		backdropFilter: isTop ? 'unset' : 'blur(8px)',
		boxShadow: isTop ? 'unset' : 'rgba(0, 0, 0, 0.8) 0px 5px 20px',
	};

	const calculateDelay = (index: number) => index * 100;

	return (
		<div className={`${styles.content} ${ralewaySemiBold.className}`} style={headerStyle}>
			<header id="header" className={`${styles.header}`}>
				<nav className={styles.nav}>
					<div className={styles.logo}>
						<a className={``} href="https://ninhache.fr/">
							<img src="/svg/Logo.svg" alt="logo"></img>
						</a>
					</div>
					<AnimatedComponent delay={100}>
						<div className={styles.menu}>
							<ol>
								{['Home', 'About', 'Projects', 'Skills', 'Experience'].map((item, index) => (
									<AnimatedComponent key={item} delay={calculateDelay(index)}>
										<li className={styles[item.toLowerCase()]}>
											<a className={styles.not_button} href={`#${item.toLowerCase()}`}>
												{item}
											</a>
										</li>
									</AnimatedComponent>
								))}
								<li className={`${styles.contact} `}>
									<a className={`button ${styles.button} `} href="#contact">
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
					</AnimatedComponent>
				</nav>
			</header>
		</div>
	);
}