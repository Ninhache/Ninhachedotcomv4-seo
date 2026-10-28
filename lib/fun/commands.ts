/**
 * The fake shell behind the terminal overlay. Pure: a command line in, lines
 * and effects out, no DOM and no network, so every command is predictable and
 * the overlay only has to print and react. See `docs/specs/fun-layer.md` § 4.
 *
 * The output lives here per locale rather than in the translation files: it is
 * the shell's own voice, dozens of lines that only this module reads.
 */
import { SAFE_CODE, type SecretId } from '@/lib/secrets/registry';

export type Locale = 'fr' | 'en';

export type Line = {
    text: string;
    tone?: 'muted' | 'accent' | 'error';
    /** Renders the line as a link. */
    href?: string;
    /** Wait before printing this line, ms. Only the fake wipe uses it. */
    delay?: number;
};

export type Effect =
    | { type: 'clear' }
    | { type: 'exit' }
    | { type: 'secrets' }
    | { type: 'matrix' }
    | { type: 'navigate'; href: string };

export type CommandResult = {
    lines: Line[];
    effects: Effect[];
    unlock: SecretId[];
};

export type CommandContext = {
    locale: Locale;
    /** Every secret found: the visitor is root. */
    rooted: boolean;
    found: readonly SecretId[];
    total: number;
    now: Date;
};

/** Section anchors of the home page, from `app/_translations/*.json`. */
const ANCHORS: Record<Locale, { projects: string; contact: string }> = {
    fr: { projects: 'projets', contact: 'contact' },
    en: { projects: 'projects', contact: 'contact' },
};

const GITHUB = 'https://github.com/Ninhache';

/** Listed by `help` and offered by Tab, in this order. */
export const COMMANDS = [
    'help',
    'whoami',
    'ls',
    'cat',
    'projects',
    'blog',
    'github',
    'secrets',
    'play',
    'echo',
    'date',
    'clear',
    'exit',
] as const;

/** Files `cat` knows, for completion. */
export const FILES = ['about.txt', 'contact.txt', '.secrets', '.env'] as const;

/**
 * The shell's prompt. Finding every secret is the only way to become root:
 * the prompt, `whoami` and `sudo` change with it.
 */
export function promptFor(locale: Locale, rooted: boolean): string {
    if (rooted) return 'root@ninhache:~#';
    return locale === 'fr' ? 'visiteur@ninhache:~$' : 'guest@ninhache:~$';
}

const COPY = {
    fr: {
        help: [
            'help       ce que vous lisez',
            'whoami     vous',
            'ls         ce qu’il y a ici',
            'cat <f>    lire un fichier',
            'projects   les projets',
            'blog       le blog',
            'github     le code',
            'secrets    où vous en êtes',
            'play       la page 404, qui est un jeu',
            'echo, date, clear, exit',
        ],
        helpTail: 'help ne liste pas tout.',
        whoami: ['visiteur', 'Pour l’instant.'],
        whoamiRoot: ['root', 'Vous l’avez mérité.'],
        about: [
            'Neo Almeida. ninhache sur internet.',
            'Du back, du front, et ce terminal.',
            'Ce site : Next.js devant, NestJS derrière.',
        ],
        env: [
            `# 2/4 : ${SAFE_CODE[1]}`,
            'DATABASE_URL=bien essayé',
            'API_KEY=toujours pas',
        ],
        contact: 'Le formulaire est en bas de l’accueil :',
        secretsLine: (n: number, total: number) =>
            `${n}/${total}. Tapez secrets pour la liste.`,
        noFile: (f: string) => `cat: ${f}: fichier introuvable`,
        catUsage: 'cat: quel fichier ? ls, d’abord.',
        going: (where: string) => `Direction ${where}`,
        sudo: [
            '[sudo] mot de passe pour visiteur :',
            'visiteur n’est pas dans le fichier sudoers.',
            'Cet incident sera signalé. À qui, on ne sait pas.',
        ],
        sudoRoot: 'Vous êtes déjà root. Ça ne change rien, mais c’est joli.',
        wipe: [
            'rm: suppression de /home',
            'rm: suppression de /usr',
            'rm: suppression de /etc',
            'rm: suppression de /portfolio',
        ],
        wipeEnd: 'Rien n’a bougé. Ce shell n’a accès à rien.',
        matrix: 'Le lapin est passé par ici.',
        bluePill:
            'Vous vous réveillez dans votre lit. Le site est toujours là.',
        xyzzy: 'Rien ne se passe. Enfin, presque.',
        hire: 'Pas ici. La vraie console : F12.',
        unlockUsage: 'unlock : il faut un code. Quatre chiffres.',
        unlockWrong: (n: number) => `Refusé. ${n}/4 à la bonne place.`,
        unlockOpen: [
            'Clic.',
            'Le coffre est vide. L’ouvrir, c’était le secret.',
        ],
        exit: 'À plus.',
        unknown: (cmd: string) => `${cmd} : commande inconnue. help ?`,
    },
    en: {
        help: [
            'help       what you are reading',
            'whoami     you',
            'ls         what is here',
            'cat <f>    read a file',
            'projects   the projects',
            'blog       the blog',
            'github     the code',
            'secrets    how far you got',
            'play       the 404 page, which is a game',
            'echo, date, clear, exit',
        ],
        helpTail: 'help doesn’t list everything.',
        whoami: ['guest', 'For now.'],
        whoamiRoot: ['root', 'You earned it.'],
        about: [
            'Neo Almeida. ninhache online.',
            'Back end, front end, and this terminal.',
            'This site: Next.js in front, NestJS behind.',
        ],
        env: [
            `# 2/4: ${SAFE_CODE[1]}`,
            'DATABASE_URL=nice try',
            'API_KEY=still no',
        ],
        contact: 'The form is at the bottom of the home page:',
        secretsLine: (n: number, total: number) =>
            `${n}/${total}. Type secrets for the list.`,
        noFile: (f: string) => `cat: ${f}: no such file`,
        catUsage: 'cat: which file? ls first.',
        going: (where: string) => `Going to ${where}`,
        sudo: [
            '[sudo] password for guest:',
            'guest is not in the sudoers file.',
            'This incident will be reported. To whom, unclear.',
        ],
        sudoRoot: 'You are already root. Changes nothing, looks nice.',
        wipe: [
            'rm: removing /home',
            'rm: removing /usr',
            'rm: removing /etc',
            'rm: removing /portfolio',
        ],
        wipeEnd: 'Nothing moved. This shell has access to nothing.',
        matrix: 'The rabbit went this way.',
        bluePill: 'You wake up in your bed. The site is still here.',
        xyzzy: 'Nothing happens. Almost.',
        hire: 'Not here. The real console: F12.',
        unlockUsage: 'unlock: needs a code. Four digits.',
        unlockWrong: (n: number) => `Denied. ${n}/4 in the right place.`,
        unlockOpen: ['Click.', 'The safe is empty. Opening it was the secret.'],
        exit: 'Later.',
        unknown: (cmd: string) => `${cmd}: command not found. help?`,
    },
} as const;

const RED_PILL = ['matrix', 'red pill', 'redpill', 'follow the white rabbit'];

/** The pause between two lines of the fake wipe, ms. */
const WIPE_STEP = 450;

type Copy = (typeof COPY)[Locale];

function result(
    lines: Line[],
    effects: Effect[] = [],
    unlock: SecretId[] = []
): CommandResult {
    return { lines, effects, unlock };
}

const text = (lines: readonly string[], tone?: Line['tone']): Line[] =>
    lines.map(t => ({ text: t, tone }));

function isWipe(line: string): boolean {
    return /^(sudo\s+)?rm\s+-(rf|fr)\s+\/\*?$/.test(line);
}

/** Digits of `guess` that match the safe's code at the same position. */
function wellPlaced(guess: string): number {
    return [...guess].filter((d, i) => d === SAFE_CODE[i]).length;
}

function tryCode(guess: string | undefined, c: Copy): CommandResult {
    if (!guess || !/^\d{4}$/.test(guess)) {
        return result(text([c.unlockUsage], 'error'));
    }
    if (guess !== SAFE_CODE) {
        return result(text([c.unlockWrong(wellPlaced(guess))], 'error'));
    }
    return result(text(c.unlockOpen, 'accent'), [], ['safe']);
}

/** Runs one command line. Never throws: unknown input is an error line. */
export function run(input: string, ctx: CommandContext): CommandResult {
    const c = COPY[ctx.locale];
    const line = input.trim().replace(/\s+/g, ' ');
    const lower = line.toLowerCase();
    const [cmd = '', ...args] = line.split(' ');
    const home = `/${ctx.locale}`;

    if (!line) return result([]);

    if (isWipe(lower)) {
        return result(
            [
                ...c.wipe.map(t => ({
                    text: t,
                    tone: 'error' as const,
                    delay: WIPE_STEP,
                })),
                { text: c.wipeEnd, tone: 'accent', delay: WIPE_STEP * 2 },
            ],
            [],
            ['root']
        );
    }
    if (lower === 'sudo' || lower.startsWith('sudo ') || lower === 'su') {
        if (ctx.rooted) return result(text([c.sudoRoot], 'accent'));
        return result(text(c.sudo, 'error'), [], ['root']);
    }
    // The code alone works too: someone who found four digits types four
    // digits.
    if (/^\d{4}$/.test(line)) return tryCode(line, c);
    if (RED_PILL.includes(lower)) {
        return result(
            text([c.matrix], 'accent'),
            [{ type: 'matrix' }],
            ['red-pill']
        );
    }
    if (lower === 'blue pill' || lower === 'bluepill') {
        return result(text([c.bluePill], 'muted'));
    }

    switch (cmd.toLowerCase()) {
        case 'help':
        case '?':
            return result([...text(c.help), ...text([c.helpTail], 'muted')]);
        case 'whoami':
            return result(text(ctx.rooted ? c.whoamiRoot : c.whoami));
        case 'ls': {
            const all = args.some(a => /^-\w*a/.test(a));
            const files = all ? ['.', '..', '.env', '.secrets'] : [];
            return result(
                text([[...files, 'about.txt', 'contact.txt'].join('  ')])
            );
        }
        case 'cat': {
            const file = args[0];
            if (!file) return result(text([c.catUsage], 'error'));
            if (file === 'about.txt') return result(text(c.about));
            if (file === '.env') return result(text(c.env, 'muted'));
            if (file === 'contact.txt') {
                const href = `${home}#${ANCHORS[ctx.locale].contact}`;
                return result([
                    { text: c.contact },
                    { text: href, href, tone: 'accent' },
                ]);
            }
            if (file === '.secrets') {
                return result([
                    ...text(ctx.found.length ? [ctx.found.join(', ')] : []),
                    {
                        text: c.secretsLine(ctx.found.length, ctx.total),
                        tone: 'muted',
                    },
                ]);
            }
            return result(text([c.noFile(file)], 'error'));
        }
        case 'projects': {
            const href = `${home}#${ANCHORS[ctx.locale].projects}`;
            return result(text([c.going(href)], 'muted'), [
                { type: 'navigate', href },
            ]);
        }
        case 'blog': {
            const href = `${home}/blog`;
            return result(text([c.going(href)], 'muted'), [
                { type: 'navigate', href },
            ]);
        }
        case 'github':
            return result([{ text: GITHUB, href: GITHUB, tone: 'accent' }]);
        case 'secrets':
            return result([], [{ type: 'secrets' }]);
        case 'play': {
            // Any unknown path is the game.
            const href = `${home}/404`;
            return result(text([c.going(href)], 'muted'), [
                { type: 'navigate', href },
            ]);
        }
        case 'echo':
            return result(text([args.join(' ')]));
        case 'date':
            return result(
                text([
                    ctx.now.toLocaleString(
                        ctx.locale === 'fr' ? 'fr-FR' : 'en-GB'
                    ),
                ])
            );
        case 'clear':
            return result([], [{ type: 'clear' }]);
        case 'exit':
        case 'logout':
            return result(text([c.exit], 'muted'), [{ type: 'exit' }]);
        case 'xyzzy':
            return result(text([c.xyzzy], 'muted'), [], ['xyzzy']);
        case 'hire':
            return result(text([c.hire], 'muted'));
        case 'unlock':
        case 'code':
            return tryCode(args[0], c);
        default:
            return result(text([c.unknown(cmd)], 'error'));
    }
}

/**
 * Tab completion: the single candidate that extends `input`, or null when
 * there is none or more than one.
 */
export function complete(input: string): string | null {
    const parts = input.split(' ');
    if (parts.length === 1) {
        const hits = COMMANDS.filter(c => c.startsWith(parts[0]));
        return hits.length === 1 ? `${hits[0]} ` : null;
    }
    if (parts.length === 2 && parts[0] === 'cat') {
        const hits = FILES.filter(f => f.startsWith(parts[1]));
        return hits.length === 1 ? `cat ${hits[0]}` : null;
    }
    return null;
}
