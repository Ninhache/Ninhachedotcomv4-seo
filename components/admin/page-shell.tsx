'use client';

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminPageShell({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <section className={cn('space-y-6', className)}>{children}</section>;
}

export function AdminHeader({
    title,
    description,
    actions,
    meta,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    meta?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
                {meta}
                {actions && (
                    <div className="flex flex-wrap items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}

export function AdminToolbar({
    children,
    className,
}: {
    children?: ReactNode;
    className?: string;
}) {
    if (!children) return null;
    return (
        <div className={cn('flex flex-wrap items-center gap-3', className)}>
            {children}
        </div>
    );
}

export function AdminCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <Card className={cn('shadow-sm', className)}>{children}</Card>;
}

export function AdminEmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            {icon && (
                <div className="rounded-full bg-muted p-3 text-muted-foreground">
                    {icon}
                </div>
            )}
            <p className="text-base font-medium">{title}</p>
            {description && (
                <p className="max-w-sm text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
