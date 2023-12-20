"use client"

import Image from "next/image"
import styles from '@/styles/about.module.css'

import { calibreRegular, proximaNovaBold, ralewaySemiBold } from '@/app/fonts'
import { useEffect, useState } from "react";
import { isInViewport, sleep } from "@/utils";

export default function About() {

	const [isAnimationDone, setAnimationDone] = useState(false);

	const inAnimationCheck = async () => {
		if (!isAnimationDone) {
			const photo = document.querySelector("#photo img") as HTMLElement;
			if (isInViewport(photo)) {
				photo.style.clipPath = "circle(49.7%)";
				await sleep(300);
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
	


	return (
		<>
			<a id="about"></a>
			<section className={`section ${styles.about_section}`}>
				<div className={`content ${styles.content}`}>
					<span className={`section_title ${proximaNovaBold.className}`}>Who am I?</span>
					<div className={styles.about_content}>
						<div className={styles.left_content}>
							<p className={`${styles.p_1} ${calibreRegular.className}`}>
								Hello! My name is Almeida Neo, and I am 20 years old. I enjoy working on personal projects during my free time, which you can find in the <a className="link" href="#projects">projects</a> section of this website.
								<br /><br />
								Currently, I am a student at the University of Lille, studying to pursue my academic goals.
								<br /><br />
								Although my website is still a work in progress, I am continuously working to add more content.
								Thank you for taking the time to visit my website.
								<br /><br />
								Want more informations about me ?
							</p>

							<a className={`${ralewaySemiBold.className} ${styles.download_resume}`} href="/Resume" target="_blank">
								<span>Open my resume</span>
								<img src="/svg/OpenLink.svg" />
							</a>
						</div>

						<div id="photo" className={styles.photo}>
							<img src="/images/Photo.jpg" />
						</div>
					</div>
				</div>
			</section>
			<div className={`section_end ${styles.about_end}`}></div>
		</>
	)
}
