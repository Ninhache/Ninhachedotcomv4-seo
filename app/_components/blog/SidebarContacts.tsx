import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import { getContacts } from '@/lib/portfolio';

/**
 * Contact links pinned under the table of contents.
 *
 * Reads the same `/contact` resource as the home page, so adding or renaming a
 * link in the back-office moves it here too with nothing to redeploy. Rendered
 * server-side and cached with the article's ISR window, which is why it can be
 * an async component rather than another client island in the sidebar.
 */
export async function SidebarContacts({ locale }: { locale: Locale }) {
    const t = await getTranslations('blog');
    const contacts = (await getContacts()).filter(c => c.isVisible);
    if (!contacts.length) return null;

    return (
        <nav aria-label={t('contactLabel')} className="mt-8 text-sm">
            <p className="mb-3 border-border/70 border-t pt-6 font-semibold text-foreground/80">
                {t('contactLabel')}
            </p>
            <ul className="space-y-2">
                {contacts.map(contact => {
                    const name =
                        contact.nameByLocale[locale] ??
                        contact.nameByLocale.en ??
                        '';
                    return (
                        <li key={contact.id}>
                            <a
                                href={contact.contactUrl}
                                target="_blank"
                                rel="noopener noreferrer me"
                                title={name}
                                className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <Image
                                    src={mediaSrc(contact.imageUrl)}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="shrink-0"
                                />
                                <span className="truncate">{name}</span>
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
