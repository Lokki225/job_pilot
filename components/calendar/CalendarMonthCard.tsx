 "use client";
 
 /**
  * Month wrapper card.
  *
  * Contains month title and navigation controls; renders children inside the card body.
  */
 
 import type { ReactNode } from "react";
 import { ChevronLeft, ChevronRight } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 
 export function CalendarMonthCard(props: {
   title: string;
   onToday: () => void;
   onPrevMonth: () => void;
   onNextMonth: () => void;
   children: ReactNode;
 }) {
   const { title, onToday, onPrevMonth, onNextMonth, children } = props;
 
   return (
     <Card className="overflow-hidden">
       <CardHeader className="border-b">
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
           <CardTitle className="text-base">{title}</CardTitle>
           <div className="flex flex-wrap items-center gap-2">
             <Button variant="outline" size="sm" onClick={onToday}>
               Today
             </Button>
             <Button variant="outline" size="icon" onClick={onPrevMonth}>
               <ChevronLeft className="h-4 w-4" />
             </Button>
             <Button variant="outline" size="icon" onClick={onNextMonth}>
               <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
         </div>
       </CardHeader>
 
       <CardContent className="p-0">{children}</CardContent>
     </Card>
   );
 }
