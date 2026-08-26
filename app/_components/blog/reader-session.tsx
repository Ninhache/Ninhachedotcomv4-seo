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
import { type PublicReader, ReaderApi } from '@/lib/reader/reader.api';

type ReaderSession = {
    reader: PublicReader | null;
    loading: boolean;
    logout: () => Promise<void>;
};

const Context = createContext<ReaderSession>({
    reader: null,
    loading: true,
    logout: async () => {},
});

/**
 * Resolves the API's reader cookie once for the whole article footer, so the
 * reactions and the comments do not each ask who is signed in.
 *
 * This identity is entirely separate from the back-office NextAuth session:
 * different cookie, different secret, different table. Being signed in here
 * grants nothing in `/admin`, and the reverse is just as true.
 */
export function ReaderSessionProvider({ children }: { children: ReactNode }) {
    const [reader, setReader] = useState<PublicReader | null>(null);
    const [loading, setLoading] = useState(true);

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

    const value = useMemo(
        () => ({ reader, loading, logout }),
        [reader, loading, logout]
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useReaderSession() {
    return useContext(Context);
}
