import { COMMIT_DATA } from './commit-data';
import {
    bucketColor,
    EMPTY_CELL,
    LEVELS,
    quantileThresholds,
} from './commit-scale';

const MONTHS = [
    'jan',
    'fév',
    'mar',
    'avr',
    'mai',
    'juin',
    'juil',
    'août',
    'sep',
    'oct',
    'nov',
    'déc',
];
const DAY_ROWS = ['Lun', '', 'Mer', '', 'Ven', '', ''];

/** Local YYYY-MM-DD (matches git's local dates; avoids UTC shifts from toISOString). */
function iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Cell = { date: string; count: number; month: number };

function buildWeeks(
    from: string,
    to: string,
    byDay: Record<string, number>
): Cell[][] {
    const start = new Date(`${from}T00:00:00`);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back up to Monday
    const end = new Date(`${to}T00:00:00`);
    const cells: Cell[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = iso(d);
        cells.push({ date: key, count: byDay[key] ?? 0, month: d.getMonth() });
    }
    const weeks: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
}

/**
 * MDX `<CommitHeatmap project>` — a GitHub-style calendar of daily commits
 * (weeks as columns x 7 weekday rows), cyan intensity = commits that day. Reads
 * a pre-aggregated, non-sensitive dataset from the `commit-data` registry. Wide,
 * so it scrolls horizontally. Reusable per project via `project`. No API, static
 * in prod.
 */
export function CommitHeatmap({
    project = 'wakfuli-builder',
}: {
    project?: string;
}) {
    const activity = COMMIT_DATA[project];
    if (!activity) return null;
    const { byDay, span } = activity;
    const weeks = buildWeeks(span.from, span.to, byDay);
    const thresholds = quantileThresholds(Object.values(byDay));

    return (
        <figure className="not-prose my-8">
            <div className="overflow-x-auto pb-1">
                <div className="inline-block">
                    <div className="flex gap-[3px]">
                        <div className="w-7 shrink-0" />
                        {weeks.map((w, i) => {
                            const newMonth =
                                i === 0 || w[0].month !== weeks[i - 1][0].month;
                            return (
                                <div
                                    key={w[0].date}
                                    className="w-[11px] shrink-0 text-[10px] text-muted-foreground leading-none"
                                >
                                    {newMonth ? MONTHS[w[0].month] : ''}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-1 flex gap-[3px]">
                        <div className="flex w-7 shrink-0 flex-col gap-[3px] pr-1 text-right text-[9px] text-muted-foreground">
                            {DAY_ROWS.map((d, i) => (
                                <div
                                    key={i}
                                    className="h-[11px] leading-[11px]"
                                >
                                    {d}
                                </div>
                            ))}
                        </div>
                        {weeks.map(w => (
                            <div
                                key={w[0].date}
                                className="flex shrink-0 flex-col gap-[3px]"
                            >
                                {w.map(cell => (
                                    <div
                                        key={cell.date}
                                        className="h-[11px] w-[11px] rounded-[2px]"
                                        style={{
                                            background: bucketColor(
                                                cell.count,
                                                thresholds
                                            ),
                                        }}
                                        title={`${cell.date} : ${cell.count} commit${cell.count > 1 ? 's' : ''}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted-foreground text-xs">
                <span>
                    Un carré = un jour, du premier commit à aujourd'hui.
                </span>
                <span className="flex items-center gap-1.5">
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
