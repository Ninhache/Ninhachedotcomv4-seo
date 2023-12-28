"use client"

import { proximaNovaBold } from "@/app/fonts";
import styles from '@/styles/contact.module.css';
import React from 'react';

interface SocialProps {
	text: string;
	imageUrl: string;
	redirectLink: string;
	cssSize: string; // This could probably be improved
}

export default function Contact() {

	const socialArray: SocialProps[] = [
		{
			text: "in/néo-almeida",
			imageUrl: "svg/contact/Linkedin.svg",
			redirectLink: "https://www.linkedin.com/in/n%C3%A9o-almeida/",
			cssSize: "135px"
		},
		{
			text: "Ninhache",
			imageUrl: "svg/contact/GitHub.svg",
			redirectLink: "https://github.com/ninhache",
			cssSize: "90px"
		},
		{
			text: "neo.almeida2706@gmail.com",
			imageUrl: "svg/contact/Mail.svg",
			redirectLink: "mailto: neo.almeida2706@gmail.com",
			cssSize: "268px"
		}
	];

	return (
		<>
			<section id="contact" className={`section ${styles.section} ${styles.contact_section} ${proximaNovaBold.className}`}>
				<div className={`content leaning ${styles.content} ${styles.leaning}`}>
					<span className={`section_title ${styles.section_title}`}>How to contact me?</span>

					<div className={styles.contact_content}>
						{
							socialArray.map((test, index) => {
								const key = `${index}${test.text}`;

								const style = {
									'--size': test.cssSize,
								} as React.CSSProperties;

								const renderSocialLink = (item: SocialProps) => {

									return (
										<a
											className={styles.social_link}
											href={item.redirectLink}
											target="_blank"
											rel="noopener noreferrer"
											style={style}
										>
											<img src={item.imageUrl} alt={`Social media link to ${item.text}`} />
											<div className={styles.social_text}>
												<span>{item.text}</span>
											</div>
										</a>
									);
								};

								return (
									<div key={key} className={styles.social_line}>
										{renderSocialLink(test)}
									</div>
								);
							})
						}
					</div>
				</div>
			</section>
		</>
	)
}
