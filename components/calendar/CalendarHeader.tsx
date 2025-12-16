 "use client";
 
 /**
  * Calendar header.
  *
  * Renders the calendar title + search input. Action buttons/dialogs are passed via children.
  */
 
 import type { ReactNode } from "react";
 import { Calendar as CalendarIcon, Search } from "lucide-react";
 import { Input } from "@/components/ui/input";
 
 export function CalendarHeader(props: {
   search: string;
   onSearchChange: (value: string) => void;
   children?: ReactNode;
 }) {
   const { search, onSearchChange, children } = props;
 
   return (
     <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
       <div className="space-y-1">
         <div className="flex items-center gap-2">
           <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background shadow-sm">
             <CalendarIcon className="h-5 w-5" />
           </div>
           <div>
             <h1 className="text-2xl font-bold">Calendar</h1>
             <p className="text-sm text-muted-foreground">Click a day to create an event.</p>
           </div>
         </div>
       </div>
 
       <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
         <div className="relative w-full sm:w-[280px]">
           <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
           <Input
             value={search}
             onChange={(e) => onSearchChange(e.target.value)}
             placeholder="Search events..."
             className="pl-9"
           />
         </div>
 
         {children}
       </div>
     </div>
   );
 }
