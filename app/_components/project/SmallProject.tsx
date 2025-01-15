"use client";

import { calibreRegular, calibreSemibold, ralewaySemiBold } from "@/app/fonts";
import { Project } from "@/jsons/jsonUtils";
import Link from "next/link";

import styles from "@/styles/projects/smallproject.module.css";
import { Locale } from "@/config";
import { useLocale } from "next-intl";
import Image from "next/image";

export interface SmallProjectProps {
  project: Project;
}

export const SmallProject: React.FC<SmallProjectProps> = ({ project }) => {
  const locale = useLocale() as Locale;

  return (
    <>
      <div className={`${styles.content}`}>
        <div className={`${styles.header}`}>
          <div className={`${styles.logos}`}>
            <Image
              src={project.logo}
              alt={`Icon for the project ${project.title}`}
              width={45}
              height={60}
              style={{ width: "45px", height: "60px" }}
            />
            <div className={`${styles.links}`}>
              {project.links.git !== "none" && (
                <Link
                  aria-label="Access the code on github"
                  className={`${styles.github}`}
                  href={`${project.links.git}`}
                  target="_blank"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 19.05 20.31"
                  >
                    <g>
                      <path d="M7.26 16.34c-4.11 1.23-4.11-2.06-5.76-2.47M13 18.81V15.62a2.78 2.78 0 0 0-.77-2.15c2.59-.28 5.3-1.26 5.3-5.76a4.46 4.46 0 0 0-1.23-3.08 4.18 4.18 0 0 0-.08-3.11s-1-.29-3.22 1.22a11 11 0 0 0-5.76 0C5 1.23 4 1.52 4 1.52A4.18 4.18 0 0 0 4 4.63 4.48 4.48 0 0 0 2.73 7.74c0 4.46 2.72 5.44 5.31 5.76a2.8 2.8 0 0 0-.78 2.12v3.19" />
                    </g>
                  </svg>
                </Link>
              )}
              {project.links.play !== "none" && (
                <Link
                  aria-label="Test the code"
                  className={`${styles.play}`}
                  href={`${project.links.play}`}
                  target="_blank"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 17.09 18.64"
                  >
                    <g>
                      <path d="M14.55 7.52 4.62 1.78A2.08 2.08 0 0 0 1.5 3.58V15.05a2.08 2.08 0 0 0 3.12 1.8l9.93-5.73A2.08 2.08 0 0 0 14.55 7.52Z" />
                    </g>
                  </svg>
                </Link>
              )}
            </div>
          </div>
          <Link
            href={`${project.links.redirect}`}
            target="_blank"
            className={`${styles.title} ${calibreSemibold.className}`}
          >
            {project.title}
          </Link>
          <p className={`${styles.text} ${calibreRegular.className}`}>
            {project.translations[locale].description}
          </p>
        </div>
        <div className={`${styles.tags} ${ralewaySemiBold.className}`}>
          {project.tags.map((tag) => (
            <Link
              key={tag.name}
              className={`${styles.tag}`}
              href={`${tag.url}`}
              target="_blank"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};
