// AnimatedComponent.tsx
import React, { useEffect, useState } from 'react';
import { useIntersectionObserver } from './hooks/useIntersectionObserver';

interface AnimatedComponentProps {
    children: React.ReactNode;
    delay?: number;
    translateY?: string;
}

const AnimatedComponent: React.FC<AnimatedComponentProps> = ({ children, delay = 0, translateY = '30px' }) => {
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
            opacity: shouldAnimate ? 1 : 0,
            transform: shouldAnimate ? 'translateY(0)' : `translateY(30px)`,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            // Add any additional styles you need here
        }}>
            {children}
        </div>
    );
};

export default AnimatedComponent;
