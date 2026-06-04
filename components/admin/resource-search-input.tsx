'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function ResourceSearchInput({
    value,
    onChange,
    placeholder = 'Recherche…',
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <div className={cn('relative', className)}>
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                aria-label="Rechercher"
                placeholder={placeholder}
                className="pl-8"
                value={value}
                onChange={event => onChange(event.target.value)}
            />
        </div>
    );
}
