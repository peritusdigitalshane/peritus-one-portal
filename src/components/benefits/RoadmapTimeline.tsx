import { useMemo } from "react";
import { format, startOfQuarter, endOfQuarter, differenceInDays, addQuarters } from "date-fns";
import { cn } from "@/lib/utils";
import type { RoadmapItem } from "@/hooks/useBenefits";

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  className?: string;
}

export const RoadmapTimeline = ({ items, className }: RoadmapTimelineProps) => {
  const { quarters, timelineStart, timelineEnd } = useMemo(() => {
    const now = new Date();
    // Default to current year's quarters
    const year = now.getFullYear();
    const defaultStart = new Date(year, 0, 1); // Jan 1
    
    if (items.length === 0) {
      const end = endOfQuarter(addQuarters(defaultStart, 3));
      return {
        quarters: [
          { label: `Q1 ${year}`, start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
          { label: `Q2 ${year}`, start: new Date(year, 3, 1), end: new Date(year, 5, 30) },
          { label: `Q3 ${year}`, start: new Date(year, 6, 1), end: new Date(year, 8, 30) },
          { label: `Q4 ${year}`, start: new Date(year, 9, 1), end: new Date(year, 11, 31) },
        ],
        timelineStart: defaultStart,
        timelineEnd: end,
      };
    }

    const allDates = items.flatMap(item => [new Date(item.start_date), new Date(item.end_date)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    const start = startOfQuarter(minDate);
    const end = endOfQuarter(maxDate);
    
    const quartersList = [];
    let current = start;
    while (current <= end) {
      const quarterNum = Math.floor(current.getMonth() / 3) + 1;
      quartersList.push({
        label: `Q${quarterNum} ${format(current, 'yyyy')}`,
        start: startOfQuarter(current),
        end: endOfQuarter(current),
      });
      current = addQuarters(current, 1);
    }

    return { quarters: quartersList, timelineStart: start, timelineEnd: end };
  }, [items]);

  const totalDays = differenceInDays(timelineEnd, timelineStart) || 1;

  const getItemPosition = (item: RoadmapItem) => {
    const itemStart = new Date(item.start_date);
    const itemEnd = new Date(item.end_date);
    
    const startOffset = Math.max(0, differenceInDays(itemStart, timelineStart));
    const endOffset = Math.min(totalDays, differenceInDays(itemEnd, timelineStart));
    
    const left = (startOffset / totalDays) * 100;
    const width = ((endOffset - startOffset) / totalDays) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 3)}%` };
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Timeline track with integrated quarters */}
      <div className="relative bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-lg border overflow-hidden">
        {/* Quarter columns */}
        <div className="flex">
          {quarters.map((quarter, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1 border-r last:border-r-0 border-border/50",
                "py-2 px-2 text-center"
              )}
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {quarter.label}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline bar area */}
        <div className="relative h-12 mx-2 mb-2">
          {/* Quarter vertical dividers */}
          {quarters.map((_, idx) => (
            <div
              key={idx}
              className="absolute top-0 bottom-0 border-r border-dashed border-border/30"
              style={{ left: `${((idx + 1) / quarters.length) * 100}%` }}
            />
          ))}

          {/* Roadmap items as bars */}
          {items.map((item) => {
            const position = getItemPosition(item);
            return (
              <div
                key={item.id}
                className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md flex items-center justify-center px-2 text-xs font-semibold text-white shadow-md cursor-pointer hover:scale-[1.02] transition-transform overflow-hidden"
                style={{
                  left: position.left,
                  width: position.width,
                  backgroundColor: item.color || '#3B82F6',
                }}
                title={`${item.name}: ${format(new Date(item.start_date), 'MMM d')} - ${format(new Date(item.end_date), 'MMM d, yyyy')}`}
              >
                <span className="truncate text-[11px]">{item.name}</span>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No roadmap items added yet
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {items.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="w-4 h-3 rounded-sm shadow-sm"
                style={{ backgroundColor: item.color || '#3B82F6' }}
              />
              <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
