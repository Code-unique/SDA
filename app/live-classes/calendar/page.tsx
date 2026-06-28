import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import LiveClass from '@/lib/models/LiveClass';
import CalendarView from '@/components/live-classes/CalendarView';
import { SerializedLiveClass } from '@/types/live-class';
import { serializeLiveClasses } from '@/lib/serialize';

export default async function CalendarPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  await connectToDatabase();

  // Fetch classes for the next 30 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const classesRaw = await LiveClass.find({
    scheduledFor: { $gte: startDate, $lte: endDate },
    status: { $ne: 'cancelled' }
  })
  .sort({ scheduledFor: 1 })
  .lean();

  // Serialize the data
  const classes: SerializedLiveClass[] = serializeLiveClasses(classesRaw);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Class Calendar</h1>
      <CalendarView classes={classes} />
    </div>
  );
}