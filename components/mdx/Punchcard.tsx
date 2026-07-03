import { ralewaySemiBold } from '@/app/fonts';
import { COMMIT_DATA } from './commit-data';
import {
    bucketColor,
    EMPTY_CELL,
    LEVELS,
    quantileThresholds,
} from './commit-scale';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL = [
    'lundi',
    'mardi',
    'mercredi',
    'jeudi',
    'vendredi',
    'samedi',
    'dimanche',
];
const HOUR_LABELS = new Set([0, 6, 12, 18]);
const COLS = '2.2rem repeat(24, minmax(0, 1fr))';

/**
 * MDX `<Punchcard project>` — a commit "when do I code" matrix: 7 weekdays x 24
 * hours, cyan intensity = commit density. Reads a pre-aggregated, non-sensitive
 * dataset (counts + dates only) from the `commit-data` registry, generated
 * locally by `scripts/wakfuli-activity.mjs`. Reusable per project via `project`.
 * No API, no network, static in prod.
 */
export function Punchcard({
    project = 'wakfuli-builder',
}: {
    project?: string;
}) {
    const activity = COMMIT_DATA[project];
    if (!activity) return null;
    const { punchcard, total, activeDays, peak } = activity;
    const thresholds = quantileThresholds(punchcard.flat());
    return (
        <figure className="not-prose my-8">
            <div className="overflow-x-auto">
                <div
                    className="grid min-w-[560px] gap-[3px]"
                    style={{ gridTemplateColumns: COLS }}
                >
                    <div />
                    {Array.from({ length: 24 }, (_, h) => (
                        <div
                            key={`h${h}`}
                            className="text-center text-[10px] text-muted-foreground leading-none"
                        >
                            {HOUR_LABELS.has(h) ? `${h}h` : ''}
                        </div>
                    ))}
                    {DAYS.map((day, d) => [
                        <div
                            key={`d${d}`}
                            className="self-center pr-1 text-right text-[11px] text-muted-foreground leading-none"
                        >
                            {day}
                        </div>,
                        ...punchcard[d].map((count, h) => (
                            <div
                                key={`c${d}-${h}`}
                                className="aspect-square rounded-[3px]"
                                style={{
                                    background: bucketColor(count, thresholds),
                                }}
                                title={`${day} ${h}h : ${count} commit${count > 1 ? 's' : ''}`}
                            />
                        )),
                    ])}
                </div>
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted-foreground text-sm">
                <span>
                    <span
                        className={`text-foreground ${ralewaySemiBold.className}`}
                    >
                        {total.toLocaleString('fr-FR')} commits
                    </span>{' '}
                    sur {activeDays} jours actifs. Créneau le plus chargé :{' '}
                    {DAYS_FULL[peak.weekday]} vers {peak.hour}h.
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                    <span>Moins</span>
                    <span className="flex gap-0.5">
                        {[EMPTY_CELL, ...LEVELS].map((c, i) => (
                            <span
                                key={i}
                                className="h-3 w-3 rounded-[2px]"
                                style={{ background: c }}
                            />
                        ))}
                    </span>
                    <span>plus de commits</span>
                </span>
            </figcaption>
        </figure>
    );
}
