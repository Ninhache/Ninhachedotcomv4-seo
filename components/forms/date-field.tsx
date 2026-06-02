'use client';

import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Earliest year offered in the year dropdown.
const FROM_YEAR = 2000;

/**
 * Date picker with month + year dropdowns (no more clicking the arrow 12× to go
 * back a year), a "Today" shortcut, and an optional "clear" (for an open-ended
 * range). The popover opens on the current value, or on `defaultMonth` when the
 * field is empty (e.g. an end date opens on its project's start month).
 */
export function DateField({
    label,
    value,
    onChange,
    clearable = false,
    defaultMonth,
    emptyLabel = 'Choisir une date',
}: {
    label: string;
    value?: Date;
    onChange: (date?: Date) => void;
    clearable?: boolean;
    defaultMonth?: Date;
    emptyLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState<Date>(
        value ?? defaultMonth ?? new Date()
    );

    const endMonth = new Date(new Date().getFullYear(), 11);

    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Popover
                open={open}
                onOpenChange={next => {
                    setOpen(next);
                    // Re-anchor the view each time we open.
                    if (next) setMonth(value ?? defaultMonth ?? new Date());
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            'justify-start text-left font-normal',
                            !value && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value
                            ? format(value, 'PPP', { locale: frLocale })
                            : emptyLabel}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                    <Calendar
                        mode="single"
                        selected={value}
                        month={month}
                        onMonthChange={setMonth}
                        captionLayout="dropdown"
                        startMonth={new Date(FROM_YEAR, 0)}
                        endMonth={endMonth}
                        defaultMonth={value ?? defaultMonth}
                        onSelect={date => {
                            onChange(date);
                            if (date) setOpen(false);
                        }}
                        autoFocus
                    />
                    <div className="flex items-center justify-between gap-2 border-t p-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const now = new Date();
                                setMonth(now);
                                onChange(now);
                            }}
                        >
                            Aujourd’hui
                        </Button>
                        {clearable && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onChange(undefined);
                                    setOpen(false);
                                }}
                            >
                                Effacer (en cours)
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
