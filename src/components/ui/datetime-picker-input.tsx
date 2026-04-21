import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDateLocale } from '@/lib/date-locale';

interface DateTimePickerInputProps {
  /** Local datetime string in format yyyy-MM-ddTHH:mm */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Minute step (default 10) */
  minuteStep?: number;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function DateTimePickerInput({
  value,
  onChange,
  className,
  placeholder = 'Valitse päivä ja aika',
  minuteStep = 10,
}: DateTimePickerInputProps) {
  const dateLocale = useDateLocale();
  const [open, setOpen] = React.useState(false);

  const datePart = value ? value.slice(0, 10) : '';
  const timePart = value && value.length >= 16 ? value.slice(11, 16) : '';
  const [hh, mm] = timePart ? timePart.split(':') : ['', ''];

  const selected = datePart ? parseISO(datePart) : undefined;

  const update = (newDate: string, newHH: string, newMM: string) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const h = newHH || '00';
    const m = newMM || '00';
    onChange(`${newDate}T${h}:${m}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes: string[] = [];
  for (let i = 0; i < 60; i += minuteStep) minutes.push(pad(i));

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex-1 justify-start text-left font-normal h-9 text-sm',
              !value && 'text-muted-foreground'
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
                update(format(d, 'yyyy-MM-dd'), hh || '08', mm || '00');
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
      <Select value={hh} onValueChange={(v) => update(datePart || format(new Date(), 'yyyy-MM-dd'), v, mm || '00')}>
        <SelectTrigger className="w-[72px] h-9"><SelectValue placeholder="hh" /></SelectTrigger>
        <SelectContent className="max-h-60">
          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={mm} onValueChange={(v) => update(datePart || format(new Date(), 'yyyy-MM-dd'), hh || '08', v)}>
        <SelectTrigger className="w-[72px] h-9"><SelectValue placeholder="mm" /></SelectTrigger>
        <SelectContent className="max-h-60">
          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
