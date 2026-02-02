import { useMemo } from "react";
import { format, startOfQuarter, endOfQuarter, differenceInDays, isWithinInterval, addQuarters } from "date-fns";
import { cn } from "@/lib/utils";
import type { RoadmapItem } from "@/hooks/useBenefits";

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  className?: string;
}

export const RoadmapTimeline = ({ items, className }: RoadmapTimelineProps) => {
  const { quarters, timelineStart, timelineEnd } = useMemo(() => {
    if (items.length === 0) {
      const now = new Date();
      const start = startOfQuarter(now);
      const end = endOfQuarter(addQuarters(now, 3));
      return {
        quarters: [
          { label: `Q1 ${format(start, 'yyyy')}`, start: startOfQuarter(start), end: endOfQuarter(start) },
          { label: `Q2 ${format(addQuarters(start, 1), 'yyyy')}`, start: startOfQuarter(addQuarters(start, 1)), end: endOfQuarter(addQuarters(start, 1)) },
          { label: `Q3 ${format(addQuarters(start, 2), 'yyyy')}`, start: startOfQuarter(addQuarters(start, 2)), end: endOfQuarter(addQuarters(start, 2)) },
          { label: `Q4 ${format(addQuarters(start, 3), 'yyyy')}`, start: startOfQuarter(addQuarters(start, 3)), end: endOfQuarter(addQuarters(start, 3)) },
        ],
        timelineStart: start,
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
    
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quarter headers */}
      <div className="flex border-b border-border">
        {quarters.map((quarter, idx) => (
          <div
            key={idx}
            className="flex-1 py-2 px-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
          >
            {quarter.label}
          </div>
        ))}
      </div>

      {/* Timeline track */}
      <div className="relative h-16 bg-muted/30 rounded-lg overflow-hidden">
        {/* Quarter dividers */}
        {quarters.map((quarter, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 border-r border-border/50"
            style={{ left: `${((idx + 1) / quarters.length) * 100}%` }}
          />
        ))}

        {/* Roadmap items */}
        {items.map((item) => {
          const position = getItemPosition(item);
          return (
            <div
              key={item.id}
              className="absolute top-1/2 -translate-y-1/2 h-8 rounded-md flex items-center justify-center px-2 text-xs font-medium text-white shadow-sm overflow-hidden whitespace-nowrap"
              style={{
                left: position.left,
                width: position.width,
                backgroundColor: item.color || '#3B82F6',
              }}
              title={`${item.name}: ${format(new Date(item.start_date), 'MMM d')} - ${format(new Date(item.end_date), 'MMM d, yyyy')}`}
            >
              <span className="truncate">{item.name}</span>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No roadmap items added yet
          </div>
        )}
      </div>

      {/* Legend */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color || '#3B82F6' }}
              />
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
