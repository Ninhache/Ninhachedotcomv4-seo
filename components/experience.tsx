"use client"

import { proximaNovaBold } from '@/app/fonts'
import styles from '@/styles/experience.module.css'

import rawData from '@/jsons/experiences.json'
import { Experience } from '@/jsons/jsonUtils';
import { isInViewport, sleep } from '@/utils';
import { useEffect, useState } from 'react';
import { useIntersectionObserver } from './hooks/useIntersectionObserver';
import AnimatedComponent from './AnimatedComponent';

interface ExperienceItemProps {
	inverted: Boolean;
	experience: Experience;
};

const ExperienceItem: React.FC<ExperienceItemProps> = ({ inverted, experience }) => {

	return (
		<div className={`job ${inverted ? styles.inverted : ""}`}>
          <div className={`${styles.job_text}`}>
            <div className={`${styles.type}`}>
              <span>${experience.date}</span>
              ${experience.type ? `<span><i>${experience.type}</i></span>` : ""}
            </div>
            <a className={`${styles.job_title}`} href="${job.link}" target="_blank">${experience.title}</a>
            <div className={`text ${styles.text}`}><p>${experience.description}</p></div>
            <div className={`tags ${styles.tags}`}>` +
              tags +
            `</div>
          </div>
          <div className={`${styles.job_view}`}>
            <a href={`${experience.link}`} target="_blank">
              <img src={`${experience.image}`}/>
              {
				// experience.videoUrl !== "none" && 
				// (<video loop muted preload="metadata">
                //   <source src={`${experience.videoUrl}`} type="video/mp4"/>
                // </video>)
			  }
            </a>
          </div>
        </div>)
};


export default function Experience() {

	return (
		<>
		<section id="experience" className={`section ${styles.experience_section}`}>
			<div className={`content leaning`}>
				<span className={`section_title ${styles.section_title} ${proximaNovaBold.className}`}>Where I&apos;ve Worked</span>
				<div className={styles.experience_content}>
					{
						rawData.map((item, index) => {
							return (
								<AnimatedComponent delay={100}>
									<ExperienceItem key={index} experience={item} inverted={index % 2 === 0} />
								</AnimatedComponent>
							)
						})
					}
				</div>
			</div>
		</section>
		<div className={`section_end ${styles.experience_end}`}></div>
		</>
	)
}
