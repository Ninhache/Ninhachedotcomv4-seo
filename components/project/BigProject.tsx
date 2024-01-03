"use client";

import { calibreRegular, calibreSemibold, ralewayBold, ralewayMedium, ralewaySemiBold } from '@/app/fonts';
import useIsMobileView from '@/components/hooks/useMobileView';
import { Project } from '@/jsons/jsonUtils';
import styles from '@/styles/projects/bigproject.module.css';
import Link from 'next/link';

export interface BigProjectProps {
	project: Project;
	isInverted: boolean;
};



export const BigProject: React.FC<BigProjectProps> = ({ project, isInverted }) => {

	const isMobile = useIsMobileView();

	return (
		<>
			<div
				className={`project ${styles.project} ${isInverted ? `inverted ${styles.inverted}` : ""}`}
				style={{
					backgroundImage: isMobile ? `url(${project.image})` : 'unset'
				}}
			>
				<div className={`${styles.project_text}`}>
					<div className={`${styles.type} ${ralewayMedium.className}`}>
						<span>{project.date}</span>
						<span>•</span>
						<span>{project.type}</span>
					</div>
					<Link className={`${styles.title} ${calibreSemibold.className}`} href={`${project.links.redirect}`} target="_blank">{project.title}</Link>
					<div className={`${styles.text} ${calibreRegular.className}`}>
						<p>{project.description}</p>
					</div>
					<div className={`${styles.tags} ${ralewaySemiBold.className}`}>
						{project.tags.map(tag => <Link key={tag.name} href={`${tag.url}`} target="_blank">{tag.name}</Link>)}
					</div>
					<div className={`${styles.links}`}>
						{project.links.git &&
							<a className={`${styles.github}`} href={`${project.links.git}`} target='_blank'>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.05 20.31"><g><path d="M7.26 16.34c-4.11 1.23-4.11-2.06-5.76-2.47M13 18.81V15.62a2.78 2.78 0 0 0-.77-2.15c2.59-.28 5.3-1.26 5.3-5.76a4.46 4.46 0 0 0-1.23-3.08 4.18 4.18 0 0 0-.08-3.11s-1-.29-3.22 1.22a11 11 0 0 0-5.76 0C5 1.23 4 1.52 4 1.52A4.18 4.18 0 0 0 4 4.63 4.48 4.48 0 0 0 2.73 7.74c0 4.46 2.72 5.44 5.31 5.76a2.8 2.8 0 0 0-.78 2.12v3.19" /></g></svg>
								<span className={`${styles.bubble} ${ralewayBold.className}`}>See the code</span>
							</a>}
						{project.links.play !== "none" &&
							<a className={`${styles.test}`} href={`${project.links.play}`} target="_blank">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.09 18.64"><g><path d="M14.55 7.52 4.62 1.78A2.08 2.08 0 0 0 1.5 3.58V15.05a2.08 2.08 0 0 0 3.12 1.8l9.93-5.73A2.08 2.08 0 0 0 14.55 7.52Z" /></g></svg>
								<span className={`${styles.bubble} ${ralewayBold.className}`}>Test the program</span>
							</a>}
					</div>
				</div>
				{
					!isMobile && (
						<div className={`${styles.project_view}`}>
							<a href={`${project.links.redirect}`} target="_blank">
								<img src={project.image} alt={`Image of the project ${project.title}`} />
							</a>
						</div>
					)
				}
			</div>
		</>
	);
};
