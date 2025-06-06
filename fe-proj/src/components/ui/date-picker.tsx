
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  date: Date;
  setDate: (date: Date) => void;
}

export function DatePicker({ date, setDate }: DatePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState(date ? date.getHours().toString().padStart(2, '0') : "12");
  const [selectedMinute, setSelectedMinute] = React.useState(date ? date.getMinutes().toString().padStart(2, '0') : "00");

  // Generate hours and minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Handle date selection from calendar
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    const newDate = new Date(selectedDate);
    newDate.setHours(parseInt(selectedHour, 10));
    newDate.setMinutes(parseInt(selectedMinute, 10));
    
    setDate(newDate);
  };

  // Handle time selection
  const handleTimeChange = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    
    const newDate = new Date(date);
    newDate.setHours(parseInt(hour, 10));
    newDate.setMinutes(parseInt(minute, 10));
    
    setDate(newDate);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP p") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              handleDateSelect(selectedDate);
              setIsCalendarOpen(false);
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
          <div className="p-3 border-t">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">Time:</span>
              
              <Select value={selectedHour} onValueChange={(hour) => handleTimeChange(hour, selectedMinute)}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span>:</span>
              
              <Select value={selectedMinute} onValueChange={(minute) => handleTimeChange(selectedHour, minute)}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
