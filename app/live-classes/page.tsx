import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import LiveClass from '@/lib/models/LiveClass';
import User from '@/lib/models/User';
import LiveClassesList from '@/components/live-classes/LiveClassesList';
import CreateClassForm from '@/components/live-classes/CreateClassForm';
import Link from 'next/link';
import { SerializedLiveClass } from '@/types/live-class';
import { serializeLiveClasses } from '@/lib/serialize';

export default async function LiveClassesPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  await connectToDatabase();
  
  // Get user from MongoDB to check role
  const user = await User.findOne({ clerkId: userId }).lean();
  
  // Ensure user exists and has a role
  const userRole = user ? (user as any).role : null;
  const isInstructor = userRole === 'designer' || userRole === 'admin';

  // Fetch upcoming classes
  const upcomingClassesRaw = await LiveClass.find({
    status: { $in: ['scheduled', 'live'] },
    scheduledFor: { $gte: new Date() }
  })
  .sort({ scheduledFor: 1 })
  .limit(10)
  .lean();

  // Fetch classes the user is participating in
  const myClassesRaw = await LiveClass.find({
    $or: [
      { instructorId: userId },
      { 'participants.userId': userId }
    ],
    status: { $in: ['scheduled', 'live'] }
  })
  .sort({ scheduledFor: 1 })
  .lean();

  // Serialize the data
  const upcomingClasses: SerializedLiveClass[] = serializeLiveClasses(upcomingClassesRaw);
  const myClasses: SerializedLiveClass[] = serializeLiveClasses(myClassesRaw);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Live Classes
          </h1>
          <p className="text-gray-600 mt-2">
            Join interactive live sessions with instructors
          </p>
        </div>
        <Link 
          href="/live-classes/calendar"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          View Calendar
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Classes List */}
        <div className="lg:col-span-2 space-y-8">
          {isInstructor && myClasses.length > 0 && (
            <LiveClassesList 
              classes={myClasses} 
              title="Your Classes" 
              userId={userId}
              showActions={true}
            />
          )}
          
          <LiveClassesList 
            classes={upcomingClasses} 
            title="Upcoming Classes" 
            userId={userId}
          />
        </div>

        {/* Sidebar - Create Class (only for instructors/designers) */}
        {isInstructor && (
          <div className="lg:col-span-1">
            <CreateClassForm userId={userId} />
          </div>
        )}
      </div>
    </div>
  );
}