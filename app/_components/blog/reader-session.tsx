'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    type PublicReader,
    type ReactionKind,
    ReaderApi,
} from '@/lib/reader/reader.api';

type ReaderSession = {
    reader: PublicReader | null;
    loading: boolean;
    logout: () => Promise<void>;
    /** True while the sign-in panel is asking the visitor to pick a provider. */
    prompting: boolean;
    /** The reaction that triggered the prompt, replayed after the round-trip. */
    pendingReaction: ReactionKind | null;
    promptLogin: (reaction?: ReactionKind) => void;
    dismissPrompt: () => void;
};

const Context = createContext<ReaderSession>({
    reader: null,
    loading: true,
    logout: async () => {},
    prompting: false,
    pendingReaction: null,
    promptLogin: () => {},
    dismissPrompt: () => {},
});

/**
 * Resolves the API's reader cookie once for the whole article footer, so the
 * reactions and the comments do not each ask who is signed in, and owns the
 * sign-in prompt they both open.
 *
 * This identity is entirely separate from the back-office NextAuth session:
 * different cookie, different secret, different table. Being signed in here
 * grants nothing in `/admin`, and the reverse is just as true.
 */
export function ReaderSessionProvider({ children }: { children: ReactNode }) {
    const [reader, setReader] = useState<PublicReader | null>(null);
    const [loading, setLoading] = useState(true);
    const [prompting, setPrompting] = useState(false);
    const [pendingReaction, setPendingReaction] = useState<ReactionKind | null>(
        null
    );

    useEffect(() => {
        let cancelled = false;
        ReaderApi.me()
            .then(({ reader: current }) => {
                if (!cancelled) setReader(current);
            })
            // A failed lookup is indistinguishable from "nobody is signed in"
            // as far as the UI is concerned: both mean "offer the login".
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const logout = useCallback(async () => {
        await ReaderApi.logout().catch(() => {});
        setReader(null);
    }, []);

    const promptLogin = useCallback((reaction?: ReactionKind) => {
        setPendingReaction(reaction ?? null);
        setPrompting(true);
    }, []);

    const dismissPrompt = useCallback(() => {
        setPrompting(false);
        setPendingReaction(null);
    }, []);

    const value = useMemo(
        () => ({
            reader,
            loading,
            logout,
            prompting,
            pendingReaction,
            promptLogin,
            dismissPrompt,
        }),
        [
            reader,
            loading,
            logout,
            prompting,
            pendingReaction,
            promptLogin,
            dismissPrompt,
        ]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useReaderSession() {
    return useContext(Context);
}
