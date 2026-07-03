import wakfuliBuilder from '@/data/commits/wakfuli-builder.json';

/**
 * Registry of pre-aggregated commit-activity datasets (generated locally by
 * `scripts/wakfuli-activity.mjs`, one JSON per project). To add a project: run
 * the script for it, then add one `import` + one entry here. The `<Punchcard>`
 * and `<CommitHeatmap>` components look up by `project`.
 */
export type CommitActivity = typeof wakfuliBuilder;

export const COMMIT_DATA: Record<string, CommitActivity> = {
    'wakfuli-builder': wakfuliBuilder,
};
