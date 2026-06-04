'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function SummaryCard({
    label,
    value,
    helper,
    action,
    className,
}: {
    label: string;
    value: string | number;
    helper?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <Card className={cn('shadow-sm', className)}>
            <CardContent className="space-y-1 pt-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                    {label}
                </p>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                {helper && (
                    <p className="text-xs text-muted-foreground">{helper}</p>
                )}
                {action}
            </CardContent>
        </Card>
    );
}
