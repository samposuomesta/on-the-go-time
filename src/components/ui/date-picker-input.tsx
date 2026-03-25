import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDateLocale } from '@/lib/date-locale';

interface DatePickerInputProps {
  value: string; // ISO date string yyyy-MM-dd
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DatePickerInput({ value, onChange, className, placeholder = 'Valitse päivä' }: DatePickerInputProps) {
  const dateLocale = useDateLocale();
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[150px] justify-start text-left font-normal h-9 text-sm",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, 'd.M.yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, 'yyyy-MM-dd'));
            } else {
              onChange('');
            }
            setOpen(false);
          }}
          locale={dateLocale}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
