"use client"

import styles from '@/styles/home.module.css'

import { calibreSemibold, calibreRegular, ralewaySemiBold } from '@/app/fonts'
import { useEffect, useMemo, useState } from 'react';
import { isInViewport, sleep } from '@/utils';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { Container, ISourceOptions, MoveDirection, OutMode } from '@tsparticles/engine';
import { loadFull } from 'tsparticles';


export default function Home() {

	// aniations
	const [isAnimationDone, setAnimationDone] = useState(false);
	const inAnimationCheck = async () => {
		if (!isAnimationDone) {
			const elements = document.querySelectorAll("#home .in_animation") as NodeListOf<HTMLElement>;

			if (elements.length === 0) return;

			if (isInViewport(elements[0])) {
				for (let i of elements) {
					const element = i as HTMLElement;
					element.style.opacity = "1";
					element.style.transform = "translateY(0)";
					await sleep(100);
				}
				setAnimationDone(true);
			}
		}
	}
	useEffect(() => {
		const handleScroll = () => {
			inAnimationCheck();
		};

		const handleResize = () => {
			inAnimationCheck();
		};

		window.addEventListener("scroll", handleScroll);
		window.addEventListener("resize", handleResize);

		// Initial check
		inAnimationCheck();

		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleResize);
		};
	}, [isAnimationDone]);

	// particlesJS
	const [init, setInit] = useState(false);
	useEffect(() => {
		initParticlesEngine(async (engine) => {
			await loadFull(engine);
		}).then(() => {
			setInit(true);
		});
	}, []);

	const particlesLoaded = async (container?: Container): Promise<void> => {
		console.log(container);
	};

	

	const options: ISourceOptions = useMemo(
		() => ({
			particles: {
				number: {
					value: 400,
					density: {
						enable: true,
					},
				},
				color: {
					value: "#fff",
				},
				shape: {
					type: "circle",
				},
				opacity: {
					value: 1,
				},
				size: {
					value: 10,
				},
				move: {
					enable: true,
					speed: 2,
					direction: "bottom",
					straight: true,
				},
				wobble: {
					enable: true,
					distance: 10,
					speed: 10,
				},
				zIndex: {
					value: {
						min: 0,
						max: 100,
					},
					opacityRate: 10,
					sizeRate: 10,
					velocityRate: 10,
				},
			},
			
		}),
		[],
	);

	return (
		<>
			<section id="home" className={`section ${styles.home_section}`}>
				{
					init && <Particles
						id="tsparticles"
						particlesLoaded={particlesLoaded}
						className={styles.particles}
						// url='http://localhost:3000/particles.json'
						options={options}
					/>
				}
				<div className={`content ${styles.content}`}>
					<span className={`${styles.hi} ${ralewaySemiBold.className} in_animation ${styles.in_animation}`}>Hi, my name is</span>
					<span className={`${styles.name} ${calibreSemibold.className} in_animation ${styles.in_animation}`}>Almeida Neo.</span>
					<span className={`${styles.title} ${calibreSemibold.className} in_animation ${styles.in_animation}`}>I&apos;m a Software Developer.</span>
					<p className={`${styles.bio} ${calibreSemibold.className} in_animation ${styles.in_animation}`}>
						I&apos;m a 20 years old french student !
					</p>
					<div className={`${styles.home_button} in_animation ${styles.in_animation}`}>
						<a className={`button ${styles.button} ${ralewaySemiBold.className}`} href="#about">
							<p>Get Started</p>
							<svg className={`button_arrow ${styles.button_arrow}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.69 17.39">
								<g>
									<path className="path_1" d="M8.9 12.4 L8.9 12.4" />
									<path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
								</g>
							</svg>
						</a>
					</div>
				</div>
			</section>
		</>
	)
}
