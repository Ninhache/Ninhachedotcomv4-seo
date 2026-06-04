'use client';

import Image from 'next/image';
import React, { CSSProperties, Suspense, useEffect, useState } from 'react';
import { mediaSrc } from '@/lib/baseurl';
import styles from '@/styles/about.module.css';
import { isInViewport, sleep } from '@/utils';

const DEFAULT_PHOTO = '/images/Photo.webp';

interface AnimatedProfilePictureProps {
    src?: string | null;
    delay?: number;
    customCss?: CSSProperties;
}

const AnimatedProfilePicture: React.FC<AnimatedProfilePictureProps> = ({
    src,
    delay = 0,
    customCss = {},
}) => {
    const resolved = src ? mediaSrc(src) : DEFAULT_PHOTO;
    // Remote (backend /uploads) URLs aren't whitelisted for the next/image
    // optimizer, so serve them as-is.
    const unoptimized = /^https?:\/\//i.test(resolved);
    const [isAnimationDone, setAnimationDone] = useState(false);

    useEffect(() => {
        const inAnimationCheck = async () => {
            if (!isAnimationDone) {
                const photo = document.querySelector(
                    '#photo img'
                ) as HTMLElement;
                if (isInViewport(photo)) {
                    photo.style.clipPath = 'circle(49.7%)';
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

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);

        // Initial check
        inAnimationCheck();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, [isAnimationDone]);

    return (
        <div id="photo" className={styles.photo}>
            <Suspense fallback={<p>Loading photo...</p>}>
                <Image
                    className={styles.image}
                    src={resolved}
                    alt="picture of Neo"
                    width={380}
                    height={380}
                    style={{ width: '380px', height: '380px' }}
                    unoptimized={unoptimized}
                />
            </Suspense>
        </div>
    );
};

export default AnimatedProfilePicture;
