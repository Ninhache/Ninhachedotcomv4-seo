/**
 * Aggregates commit *timing* from local Wakfuli git clone(s) into a small,
 * non-sensitive JSON for the blog visuals (punchcard + calendar heatmap).
 *
 * Privacy: reads ONLY commit dates/hours (via `git log`), never messages, hashes,
 * authors or branch names into the output. Hashes are read solely to dedup across
 * clones. No network, no GitHub API, no token. Run locally (the repo must be
 * present); the output JSON is committed and read statically in prod.
 *
 * Usage:  node scripts/wakfuli-activity.mjs <slug> [repoPath ...]
 *   e.g.   node scripts/wakfuli-activity.mjs wakfuli-builder
 *          node scripts/wakfuli-activity.mjs my-project ~/projects/my-project
 *   defaults: slug "wakfuli-builder", repo ~/projects/<slug>
 * Output: data/commits/<slug>.json  (then register it in components/mdx/commit-data.ts)
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const US = '\x1f'; // unit separator: safe field delimiter (never in commit text)
const [slugArg, ...repoArgs] = process.argv.slice(2);
const slug = slugArg || 'wakfuli-builder';
const repos = repoArgs.length
    ? repoArgs
    : [`${process.env.HOME}/projects/${slug}`];

const seen = new Set();
const punchcard = Array.from({ length: 7 }, () => new Array(24).fill(0));
const byDay = {};
let total = 0;
// Automated release commits carry the CI's timestamp, not a real coding moment.
const releaseRe = /\[skip ci\]|chore\(release\)/i;

for (const repo of repos) {
    let out = '';
    try {
        out = execSync(
            `git -C ${JSON.stringify(repo)} log --all --no-merges --pretty=format:'%H${US}%ad${US}%s' --date=format:'%Y-%m-%d${US}%u${US}%H'`,
            { encoding: 'utf8', maxBuffer: 1 << 28 }
        );
    } catch (e) {
        console.error('git failed for', repo, e.message);
        continue;
    }
    for (const line of out.split('\n')) {
        if (!line) continue;
        const [hash, date, weekday, hour, subject = ''] = line.split(US);
        if (!hash || seen.has(hash)) continue;
        seen.add(hash);
        if (releaseRe.test(subject)) continue;
        const wd = Number.parseInt(weekday, 10) - 1; // %u 1=Mon..7=Sun -> 0..6
        const hr = Number.parseInt(hour, 10);
        if (wd < 0 || wd > 6 || hr < 0 || hr > 23) continue;
        punchcard[wd][hr] += 1;
        byDay[date] = (byDay[date] || 0) + 1;
        total += 1;
    }
}

const days = Object.keys(byDay).sort();
const span = { from: days[0], to: days[days.length - 1] };
let peak = { weekday: 0, hour: 0, count: 0 };
for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
        if (punchcard[d][h] > peak.count) {
            peak = { weekday: d, hour: h, count: punchcard[d][h] };
        }
    }
}

mkdirSync('data/commits', { recursive: true });
writeFileSync(
    `data/commits/${slug}.json`,
    `${JSON.stringify({ total, activeDays: days.length, span, peak, punchcard, byDay })}\n`
);
console.log(
    `[${slug}] total=${total} activeDays=${days.length} span=${span.from}..${span.to} ` +
        `peak=day${peak.weekday}@${peak.hour}h(${peak.count}) -> data/commits/${slug}.json`
);
