"use client";

import AnimatedComponent from "@/app/_components/AnimatedComponent";
import { ralewaySemiBold } from "@/app/fonts";
import styles from "@/styles/header.module.css";
import { useEffect, useRef, useState } from "react";

import useLocaleNames from "@/app/_hooks/useLocaleNames";
import useMobileView from "@/app/_hooks/useMobileView";
import throttle from "lodash.throttle"; // lodash throttle function
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import LocaleSwitcher from "../LocaleSwitcher";

import dynamic from "next/dynamic";

const HeaderItem = dynamic(() => import("./headerItem"), { ssr: false });

interface menuItemObject {
  name: string;
  anchor: string;
}

export default function Header() {
  const t = useTranslations("header");
  const localeNames = useLocaleNames();

  const menuItems: menuItemObject[] = [
    {
      name: t("home"),
      anchor: t("homeAnchor"),
    },
    {
      name: t("about"),
      anchor: t("aboutAnchor"),
    },
    {
      name: t("projects"),
      anchor: t("projectsAnchor"),
    },
    {
      name: t("skills"),
      anchor: t("skillsAnchor"),
    },
    {
      name: t("experience"),
      anchor: t("experienceAnchor"),
    },
  ];

  const isMobile = useMobileView();
  const menuDivRef = useRef<HTMLDivElement>(null);

  const openMobileMenu = () => {
    if (menuDivRef.current) {
      menuDivRef.current.style.transform = "translateX(0px)";
      menuDivRef.current.style.boxShadow = "-10px 0px 30px rgba(0, 0, 0, 0.7)";
    }
  };

  const closeMobileMenu = () => {
    if (menuDivRef.current) {
      menuDivRef.current.style.transform =
        "translateX(clamp(0px, 100%, 400px))";
      menuDivRef.current.style.boxShadow = "none";
    }
  };

  const [isVisible, setIsVisible] = useState(true);
  const [isTop, setIsTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const controlHeader = throttle(() => {
      if (typeof window !== "undefined") {
        const currentScrollY = window.scrollY;
        setIsVisible(
          currentScrollY <= lastScrollY.current || currentScrollY <= 50
        );
        lastScrollY.current = currentScrollY;
        setIsTop(currentScrollY <= 50);
      }
    }, 100);

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", controlHeader);
      return () => {
        controlHeader.cancel();
        window.removeEventListener("scroll", controlHeader);
      };
    }
  }, []);

  const headerStyle = {
    transition: "all 0.5s ease-in-out",
    transform: isVisible ? "translateY(0)" : "translateY(-100%)",
    backgroundColor: isTop ? "transparent" : "var(--fade_dark_blue)",
    backdropFilter: isTop ? "unset" : "blur(8px)",
    boxShadow: isTop ? "unset" : "rgba(0, 0, 0, 0.8) 0px 5px 20px",
    height: "100px",
  };

  const calculateDelay = (index: number) => index * 100;

  return (
    <>
      <div
        className={`${styles.content} ${ralewaySemiBold.className}`}
        style={headerStyle}
      >
        <header id="header" className={`${styles.header}`}>
          <nav className={styles.nav}>
            <div className={styles.logo}>
              <Link
                href="https://ninhache.fr/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/svg/Logo.svg"
                  alt="logo"
                  width={190}
                  height={35}
                  priority
                />
              </Link>
            </div>
            {!isMobile && (
              <AnimatedComponent delay={100}>
                <div className={styles.menu}>
                  <ol>
                    {menuItems.map((item, index) => (
                      <li key={`${item.name}-${item.anchor}`}>
                        <HeaderItem
                          name={item.name}
                          anchor={item.anchor}
                          delay={calculateDelay(index)}
                        />
                      </li>
                    ))}
                    <li>
                      <Link
                        className={`button ${styles.button}`}
                        href={`#contact`}
                      >
                        <p>{t("contact")}</p>
                        <svg
                          role="button"
                          aria-label="Open header"
                          className={`button_arrow ${styles.button_arrow}`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 17.69 17.39"
                        >
                          <g>
                            <path className="path_1" d="M8.9 12.4 L8.9 12.4" />
                            <path
                              className="path_2"
                              d="M16.2 5 8.9 12.4 1.5 5"
                            />
                          </g>
                        </svg>
                      </Link>
                    </li>
                    <li>
                      <LocaleSwitcher localeNames={localeNames} />
                    </li>
                  </ol>
                </div>
              </AnimatedComponent>
            )}

            {isMobile && (
              <svg
                onClick={openMobileMenu}
                className={`${styles.hamburger_icon}`}
                viewBox="0 0 140 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="10" y1="10" x2="130" y2="10" />
                <line x1="30" y1="50" x2="130" y2="50" />
                <line x1="50" y1="90" x2="130" y2="90" />
              </svg>
            )}
          </nav>
        </header>
      </div>

      <div
        id="menu_div"
        className={`${styles.menu_div} ${ralewaySemiBold.className}`}
        ref={menuDivRef}
      >
        <svg
          role="button"
          aria-label="close header"
          onClick={closeMobileMenu}
          className={`${styles.menu_icon}`}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="10" y1="10" x2="90" y2="90" />
          <line x1="10" y1="90" x2="90" y2="10" />
        </svg>
        <div className={`${styles.menu}`}>
          <ol>
            {menuItems.map((item, index) => (
              <li key={`${item.name}-${item.anchor}`}>
                <HeaderItem
                  key={item.name}
                  name={item.name}
                  anchor={item.anchor}
                  delay={calculateDelay(index)}
                  onClick={closeMobileMenu}
                />
              </li>
            ))}
            <li>
              <Link className={`button ${styles.button} `} href="#contact">
                <p>{t("contact")}</p>
                <svg
                  className={`button_arrow ${styles.button_arrow}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 17.69 17.39"
                >
                  <g>
                    <path className="path_1" d="M8.9 12.4 L8.9 12.4" />
                    <path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
                  </g>
                </svg>
              </Link>
            </li>
            <li>
              <LocaleSwitcher localeNames={localeNames} />
            </li>
          </ol>
        </div>
      </div>
    </>
  );
}
