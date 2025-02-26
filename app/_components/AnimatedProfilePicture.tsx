"use client";

import styles from "@/styles/about.module.css";

import { isInViewport, sleep } from "@/utils";
import Image from "next/image";
import React, { CSSProperties, Suspense, useEffect, useState } from "react";

interface AnimatedProfilePictureProps {
  delay?: number;
  customCss?: CSSProperties;
}

const AnimatedProfilePicture: React.FC<AnimatedProfilePictureProps> = ({
  delay = 0,
  customCss = {},
}) => {
  const [isAnimationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    const inAnimationCheck = async () => {
      if (!isAnimationDone) {
        const photo = document.querySelector("#photo img") as HTMLElement;
        if (isInViewport(photo)) {
          photo.style.clipPath = "circle(49.7%)";
          setAnimationDone(true);
          await sleep(300);
        }
      }
    };

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
    <div id="photo" className={styles.photo}>
      <Suspense fallback={<p>Loading photo...</p>}>
        <Image
          className={styles.image}
          src="/images/Photo.webp"
          alt="picture of Neo"
          width={380}
          height={380}
          style={{ width: "380px", height: "380px" }}
        />
      </Suspense>
    </div>
  );
};

export default AnimatedProfilePicture;
