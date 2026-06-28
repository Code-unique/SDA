'use client';

import { SerializedLiveClass } from '@/types/live-class';
import Link from 'next/link';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { format } from 'date-fns';

interface LiveClassesListProps {
  classes: SerializedLiveClass[];
  title: string;
  userId: string;
  showActions?: boolean;
}

export default function LiveClassesList({ 
  classes, 
  title, 
  userId,
  showActions = false 
}: LiveClassesListProps) {
  if (!classes || classes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-8">No classes found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-800 animate-pulse';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isInstructor = (classItem: SerializedLiveClass) => classItem.instructorId === userId;

  const canJoin = (classItem: SerializedLiveClass) => {
    if (classItem.status === 'live') return true;
    if (classItem.status === 'scheduled') {
      const classTime = new Date(classItem.scheduledFor).getTime();
      const now = new Date().getTime();
      const minutesUntil = Math.floor((classTime - now) / (1000 * 60));
      return minutesUntil <= 5; // Can join 5 minutes before
    }
    return false;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="divide-y">
        {classes.map((classItem) => (
          <div key={classItem._id} className="p-6 hover:bg-gray-50 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-lg font-semibold">{classItem.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(classItem.status)}`}>
                    {classItem.status.toUpperCase()}
                  </span>
                  {isInstructor(classItem) && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                      Instructor
                    </span>
                  )}
                </div>
                
                {classItem.description && (
                  <p className="text-gray-600 mb-3 line-clamp-2">{classItem.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{format(new Date(classItem.scheduledFor), 'MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{format(new Date(classItem.scheduledFor), 'h:mm a')} ({classItem.duration} min)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Instructor: {classItem.instructorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 flex-shrink-0" />
                    <span className="font-mono text-xs truncate">{classItem.roomName}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {canJoin(classItem) && (
                <Link
                  href={`/live-classes/${classItem.roomName}`}
                  className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                    classItem.status === 'live'
                      ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {classItem.status === 'live' ? 'Join Live Now' : 'Join Class'}
                </Link>
              )}
              {showActions && isInstructor(classItem) && classItem.status === 'scheduled' && (
                <button
                  onClick={() => {
                    // Handle edit class
                    console.log('Edit class:', classItem._id);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Edit
                </button>
              )}
              {showActions && isInstructor(classItem) && classItem.status === 'live' && (
                <button
                  onClick={() => {
                    // Handle end class
                    console.log('End class:', classItem._id);
                  }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                >
                  End Class
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}