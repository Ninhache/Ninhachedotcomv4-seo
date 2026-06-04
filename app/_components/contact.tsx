import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';
import { proximaNovaBold } from '@/app/fonts';
import styles from '@/styles/contact.module.css';

interface SocialProps {
    text: string;
    imageUrl: string;
    redirectLink: string;
    cssSize: string; // This could probably be improved
}

interface ContactProps {
    data: SocialProps[];
}

export default function Contact({ data }: ContactProps) {
    const socialArray = data;

    const t = useTranslations('contact');

    return (
        <>
            <section
                id={t('anchor')}
                className={`section ${styles.contact_section} ${proximaNovaBold.className}`}
            >
                <div
                    className={`content leaning ${styles.content} ${styles.leaning}`}
                >
                    <span className={`section_title ${styles.section_title}`}>
                        How to contact me?
                    </span>

                    <div className={styles.contact_content}>
                        {socialArray.map((test, index) => {
                            const key = `${index}${test.text}`;

                            const style = {
                                '--size': test.cssSize,
                            } as React.CSSProperties;

                            const renderSocialLink = (item: SocialProps) => {
                                return (
                                    <Link
                                        className={styles.social_link}
                                        href={item.redirectLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={style}
                                    >
                                        <Image
                                            src={item.imageUrl}
                                            alt={`Social media link to ${item.text}`}
                                            width={50}
                                            height={50}
                                            style={{
                                                width: '50px',
                                                height: '50px',
                                            }}
                                        />
                                        <div className={styles.social_text}>
                                            <span>{item.text}</span>
                                        </div>
                                    </Link>
                                );
                            };

                            return (
                                <div key={key} className={styles.social_line}>
                                    {renderSocialLink(test)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </>
    );
}
