'use client';

import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, Briefcase, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { driveService, Drive } from '@/services/drive.service';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch drives
  const { data: drivesData, isLoading } = useQuery({
    queryKey: ['drives'],
    queryFn: driveService.getAdminDrives,
  });

  // Handle data structure variance (if API returns { drives: [] } or just [])
  const drives: Drive[] = Array.isArray(drivesData) 
    ? drivesData 
    // @ts-ignore - handling potential {drives: []} response wrapper
    : (drivesData?.drives || []);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between py-6 px-6 bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-[#002147] flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Calendar
            </h1>
            <div className="flex items-center bg-gray-100 rounded-md p-1 ml-4 border">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 hover:bg-white hover:shadow-sm text-gray-600">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-4 font-semibold text-gray-700 min-w-[140px] text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 hover:bg-white hover:shadow-sm text-gray-600">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
                Today
            </Button>
        </div>
        
        <div className="flex gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 mr-4">
                <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#002147]"></span> Regular
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Dream
                </div>
            </div>
             <Button className="bg-[#002147] text-white hover:bg-[#003366]">
                + Schedule Drive
            </Button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEE";
    const days = [];
    let startDate = startOfWeek(currentMonth);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center text-sm font-semibold text-gray-500 py-3 bg-gray-50 border-r last:border-r-0 border-b">
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }

    return <div className="grid grid-cols-7 border-l border-t bg-gray-50">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        
        // Find drives for this day
        // Safely parse date or handle potential invalid dates
        const dayDrives = drives.filter(drive => {
            try {
                return drive.drive_date && isSameDay(parseISO(drive.drive_date), cloneDay);
            } catch (e) {
                return false;
            }
        });

        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isToday(day);

        days.push(
          <div
            key={day.toString()}
            className={cn(
                "min-h-[140px] border-b border-r p-2 transition-colors relative group bg-white",
                !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                isCurrentDay && "bg-blue-50/30",
                "hover:bg-gray-50"
            )}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex justify-between items-start mb-2">
                <span className={cn(
                    "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full transition-all",
                    isCurrentDay ? "bg-[#002147] text-white shadow-md" : "text-gray-700 group-hover:bg-gray-200"
                )}>
                {formattedDate}
                </span>
                {dayDrives.length > 0 && (
                    <span className="text-xs font-bold text-[#002147] bg-blue-100 px-2 py-0.5 rounded-full">
                        {dayDrives.length}
                    </span>
                )}
            </div>
            
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                {dayDrives.map(drive => (
                    <DriveEvent key={drive.id} drive={drive} />
                ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 border-l" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white shadow-sm rounded-b-lg border-b border-r overflow-hidden">{rows}</div>;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
      {renderHeader()}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="rounded-lg border shadow-sm overflow-hidden">
            {renderDays()}
            {renderCells()}
        </div>
      </div>
    </div>
  );
}

function DriveEvent({ drive }: { drive: Drive }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div 
                    className="text-xs p-1.5 rounded-md bg-[#002147]/5 border border-[#002147]/10 text-[#002147] cursor-pointer hover:bg-[#002147] hover:text-white transition-all truncate group/event flex items-center gap-1.5 shadow-sm hover:shadow-md"
                    onClick={(e) => e.stopPropagation()} // Prevent bubble to cell click
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></div>
                    <span className="font-medium truncate">{drive.company_name}</span>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-[#002147]">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        {drive.company_name}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Hiring for <span className="font-semibold text-gray-900">{drive.job_role}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border">
                            <span className="text-xs text-gray-500 uppercase font-semibold">Drive Date</span>
                            <div className="flex items-center gap-2 font-medium text-[#002147]">
                                <CalendarIcon className="h-4 w-4" />
                                {format(parseISO(drive.drive_date), 'MMM d, yyyy')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border">
                             <span className="text-xs text-gray-500 uppercase font-semibold">Location</span>
                            <div className="flex items-center gap-2 font-medium text-[#002147]">
                                <MapPin className="h-4 w-4" />
                                {drive.location || 'On Campus'}
                            </div>
                        </div>
                    </div>

                    {drive.deadline_date && (
                         <div className="flex items-center gap-2 text-sm bg-red-50 text-red-700 p-2 rounded-md border border-red-100">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Application Deadline:</span>
                            <span>{format(parseISO(drive.deadline_date), 'MMMM d, yyyy • h:mm a')}</span>
                        </div>
                    )}
                   
                    <div className="mt-2 flex gap-2">
                        <Badge variant="outline" className="border-[#002147] text-[#002147] px-3 py-1">
                            CTC: {drive.ctc_display || 'Disclosed later'}
                        </Badge>
                        <Badge className={cn(
                            "px-3 py-1",
                            drive.status === 'open' ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"
                        )}>
                            {drive.status.toUpperCase()}
                        </Badge>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline">View Students</Button>
                    <Button className="bg-[#002147] hover:bg-[#003366]">Manage Drive</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
