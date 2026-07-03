'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import styles from '@/styles/header.module.css';
import AnimatedComponent from '../AnimatedComponent';

interface HeaderItemProps {
    name: string;
    anchor: string;
    delay: number;
    onClick?: () => void;
}

const HeaderItem: React.FC<HeaderItemProps> = ({
    name,
    anchor,
    delay,
    onClick,
}) => {
    const lowerName = name.toLocaleLowerCase();
    const locale = useLocale();
    const pathname = usePathname();
    // On the single-page home the anchors scroll in-page. From any other route
    // (e.g. the blog) they jump back to the home + anchor — with a hard load,
    // since that crosses the CSS-modules ↔ Tailwind boundary.
    const onHome = pathname === `/${locale}` || pathname === '/';

    return (
        <AnimatedComponent delay={delay}>
            <div onClick={onClick} className={styles[lowerName]}>
                {onHome ? (
                    <Link className={styles.not_button} href={`#${anchor}`}>
                        {name}
                    </Link>
                ) : (
                    <a
                        className={styles.not_button}
                        href={`/${locale}#${anchor}`}
                    >
                        {name}
                    </a>
                )}
            </div>
        </AnimatedComponent>
    );
};

export default HeaderItem;
