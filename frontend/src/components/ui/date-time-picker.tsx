"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  className?: string
  placeholder?: string
  disablePastDates?: boolean
  minDate?: Date
}

export function DateTimePicker({ date, setDate, className, placeholder = "Pick a date & time", disablePastDates, minDate }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)

  const disabledDays = React.useMemo(() => {
    if (minDate) {
      const d = new Date(minDate);
      d.setHours(0, 0, 0, 0);
      return { before: d };
    }
    if (disablePastDates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { before: today };
    }
    return undefined;
  }, [minDate, disablePastDates]);

  React.useEffect(() => {
    setSelectedDate(date)
  }, [date])

  React.useEffect(() => {
    if (date && minDate) {
      const dMin = new Date(minDate)
      dMin.setHours(0, 0, 0, 0)
      const dCur = new Date(date)
      dCur.setHours(0, 0, 0, 0)

      if (dCur.getTime() < dMin.getTime()) {
        const newDate = new Date(minDate)
        newDate.setHours(date.getHours(), date.getMinutes(), 0, 0)
        setDate(newDate)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date?.getTime(), minDate?.getTime()])

  const handleDateSelect = (d?: Date) => {
    if (!d) {
      setDate(undefined)
      return
    }
    const newDate = new Date(d)
    if (selectedDate) {
      newDate.setHours(selectedDate.getHours())
      newDate.setMinutes(selectedDate.getMinutes())
    } else {
      // Default to 10:30 AM if no previous selection
      newDate.setHours(10)
      newDate.setMinutes(30)
    }
    setDate(newDate)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value
    if (!timeStr) return

    const [hours, minutes] = timeStr.split(':').map(Number)
    const newDate = new Date(selectedDate || new Date()) // Use today if date not picked yet
    newDate.setHours(hours)
    newDate.setMinutes(minutes)
    setDate(newDate)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP p") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          disabled={disabledDays}
        />
        <div className="p-3 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <Clock className="h-4 w-4 text-gray-500" />
          <Input
            type="time"
            value={selectedDate ? format(selectedDate, 'HH:mm') : ''}
            onChange={handleTimeChange}
            className="w-full bg-white h-8"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
