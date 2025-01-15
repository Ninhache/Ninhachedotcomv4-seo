"use client";

import React, { CSSProperties, useEffect, useState } from "react";
import { useIntersectionObserver } from "@/app/_hooks/useIntersectionObserver";

interface AnimatedComponentProps {
  children: React.ReactNode;
  delay?: number;
  translateY?: string;
  customCss?: CSSProperties;
}

const AnimatedComponent: React.FC<AnimatedComponentProps> = ({
  children,
  delay = 0,
  translateY = "30px",
  customCss = {},
}) => {
  const [isVisible, ref] = useIntersectionObserver();
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isVisible && !shouldAnimate) {
      timeout = setTimeout(() => setShouldAnimate(true), delay);
    }
    return () => clearTimeout(timeout);
  }, [isVisible, delay, shouldAnimate]);

  return (
    <div
      ref={ref}
      style={{
        opacity: shouldAnimate ? 1 : 0,
        transform: shouldAnimate ? "translateY(0)" : `translateY(30px)`,
        transition: "opacity 0.3s ease, transform 0.3s ease",
        ...customCss,
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedComponent;
