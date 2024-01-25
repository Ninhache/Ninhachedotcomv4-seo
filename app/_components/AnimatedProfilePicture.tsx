"use client";

import React, { CSSProperties, useEffect, useState } from 'react';
import { useIntersectionObserver } from '@/app/_components/hooks/useIntersectionObserver';

interface AnimatedComponentProps {
    children: React.ReactNode;
    delay?: number;
    customCss?: CSSProperties
}

const AnimatedComponent: React.FC<AnimatedComponentProps> = ({ children, delay = 0, customCss = {} }) => {
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
        <div ref={ref} style={{
            clipPath: "circle(49.7%)",
            opacity: shouldAnimate ? 1 : 0,
            transform: shouldAnimate ? 'translateY(0)' : `translateY(30px)`,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            ...customCss
        }}>
            {children}
        </div>
    );
};

export default AnimatedComponent;
