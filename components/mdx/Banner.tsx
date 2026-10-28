import { proximaNovaBold, ralewaySemiBold } from '@/app/fonts';
import { mediaSrc } from '@/lib/baseurl';

/**
 * MDX `<Banner>` - a full-width hero block to open a major part of an article:
 * a background (an `image` under a dark gradient for legibility, or a subtle
 * navy/cyan DA gradient when none), with a centered title (ProximaNova) and an
 * optional kicker/subtitle. Breaks out wider than the text column on `xl`+ (same
 * constraint as `<Wide>`).
 */
export function Banner({
    image,
    kicker,
    title,
    subtitle,
}: {
    image?: string;
    kicker?: string;
    title: string;
    subtitle?: string;
}) {
    return (
        <section className="not-prose relative my-12 overflow-hidden rounded-2xl border border-border xl:-mx-16">
            {image && (
                // Purely decorative: the title and subtitle beside it are real
                // text, so an alt would make a screen reader announce the same
                // thing twice. `aria-hidden` states that on purpose rather than
                // leaving an empty alt to look like an oversight.
                <img
                    src={mediaSrc(image)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
            <div
                className="absolute inset-0"
                style={{
                    background: image
                        ? 'linear-gradient(to top, rgba(11,20,34,0.92), rgba(11,20,34,0.55))'
                        : 'linear-gradient(135deg, #0b1422, #101d30 55%, rgba(25,125,255,0.28))',
                }}
            />
            <div className="relative flex min-h-[16rem] flex-col items-center justify-center px-6 py-12 text-center">
                {kicker && (
                    <p
                        className={`mb-2 text-sm uppercase tracking-wide text-primary ${ralewaySemiBold.className}`}
                    >
                        {kicker}
                    </p>
                )}
                <p
                    className={`text-3xl text-white sm:text-4xl ${proximaNovaBold.className}`}
                >
                    {title}
                </p>
                {subtitle && (
                    <p className="mt-3 max-w-2xl text-white/80">{subtitle}</p>
                )}
            </div>
        </section>
    );
}
