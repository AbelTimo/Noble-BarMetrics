'use client';

import { Badge } from '@/components/ui/badge';
import { getLabelEventColor, type LabelEventType } from '@/lib/labels';
import { Clock, MapPin, User } from 'lucide-react';

interface LabelEvent {
  id: string;
  eventType: string;
  description: string | null;
  location: string | null;
  performedBy: string | null;
  createdAt: string;
}

interface LabelHistoryTimelineProps {
  events: LabelEvent[];
}

export function LabelHistoryTimeline({ events }: LabelHistoryTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No events recorded
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id} className="relative pl-10">
            <div
              className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
                index === 0 ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge
                  className={getLabelEventColor(event.eventType as LabelEventType)}
                  variant="outline"
                >
                  {event.eventType}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              {event.description && (
                <p className="text-sm">{event.description}</p>
              )}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                )}
                {event.performedBy && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {event.performedBy}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
