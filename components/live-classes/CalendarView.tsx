'use client';

import { useState, useCallback } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { SerializedLiveClass } from '@/types/live-class';
import Link from 'next/link';

// Setup the localizer
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  classes: SerializedLiveClass[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: SerializedLiveClass;
}

export default function CalendarView({ classes }: CalendarViewProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Transform classes into calendar events
  const events: CalendarEvent[] = classes.map(cls => ({
    id: cls._id,
    title: cls.title,
    start: new Date(cls.scheduledFor),
    end: new Date(new Date(cls.scheduledFor).getTime() + cls.duration * 60000),
    resource: cls
  }));

  // Handle navigation
  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => (
    <div className="p-1 overflow-hidden">
      <div className="font-semibold text-sm truncate">{event.title}</div>
      <div className="text-xs truncate">
        {moment(event.start).format('h:mm A')} - {moment(event.end).format('h:mm A')}
      </div>
      <div className="text-xs truncate">Instructor: {event.resource.instructorName}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="space-x-2">
          <button
            onClick={() => handleViewChange('month')}
            className={`px-3 py-1 rounded transition ${
              view === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => handleViewChange('week')}
            className={`px-3 py-1 rounded transition ${
              view === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => handleViewChange('day')}
            className={`px-3 py-1 rounded transition ${
              view === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Day
          </button>
        </div>
        <div className="text-lg font-semibold">
          {moment(date).format('MMMM YYYY')}
        </div>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        style={{ height: 600 }}
        components={{
          event: EventComponent
        }}
        popup
        tooltipAccessor={(event: CalendarEvent) => 
          `${event.title}\nInstructor: ${event.resource.instructorName}\nDuration: ${event.resource.duration} minutes\nStatus: ${event.resource.status}`
        }
        eventPropGetter={(event: CalendarEvent) => {
          let backgroundColor = '#3b82f6'; // blue for scheduled
          if (event.resource.status === 'live') {
            backgroundColor = '#22c55e'; // green for live
          } else if (event.resource.status === 'ended') {
            backgroundColor = '#6b7280'; // gray for ended
          } else if (event.resource.status === 'cancelled') {
            backgroundColor = '#ef4444'; // red for cancelled
          }
          return {
            style: {
              backgroundColor,
              borderRadius: '4px',
              opacity: 0.8,
              color: 'white',
              border: 'none'
            }
          };
        }}
      />
    </div>
  );
}