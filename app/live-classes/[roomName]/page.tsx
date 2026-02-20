import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import LiveClass from '@/lib/models/LiveClass';
import JitsiMeet from '@/components/live-classes/JitsiMeet';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { serializeLiveClass } from '@/lib/serialize';
import { SerializedLiveClass } from '@/types/live-class';

interface ClassRoomPageProps {
  params: Promise<{
    roomName: string;
  }>;
}

export default async function ClassRoomPage({ params }: ClassRoomPageProps) {
  const { roomName } = await params;
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  await connectToDatabase();
  
  // Find the class by roomName
  const classDataRaw = await LiveClass.findOne({ 
    roomName: roomName,
    status: { $in: ['scheduled', 'live'] }
  }).lean();

  if (!classDataRaw) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Class Not Found</h1>
        <p className="text-gray-600 mb-8">
          This class may have ended or doesn't exist.
        </p>
        <Link 
          href="/live-classes"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Classes
        </Link>
      </div>
    );
  }

  // Serialize the data
  const classData: SerializedLiveClass = serializeLiveClass(classDataRaw);

  // Update class status to 'live' if it's time
  const now = new Date();
  const classTime = new Date(classData.scheduledFor);
  const timeDiff = classTime.getTime() - now.getTime();
  const minutesUntil = Math.floor(timeDiff / (1000 * 60));

  if (minutesUntil <= 0 && classData.status === 'scheduled') {
    await LiveClass.updateOne(
      { _id: classData._id },
      { $set: { status: 'live' } }
    );
    // Update local status after DB update
    classData.status = 'live';
  }

  // Check if user is authorized (instructor or participant)
  const isInstructor = classData.instructorId === userId;
  const isParticipant = classData.participants?.some(p => p.userId === userId);

  if (!isInstructor && !isParticipant) {
    // Add user as participant when they join
    await LiveClass.updateOne(
      { _id: classData._id },
      { 
        $addToSet: { 
          participants: {
            userId,
            name: 'User',
            joinedAt: new Date()
          }
        }
      }
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link 
            href="/live-classes"
            className="flex items-center gap-2 text-gray-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Classes</span>
          </Link>
          
          <div className="text-center">
            <h1 className="font-semibold">{classData.title}</h1>
            <p className="text-sm text-gray-400">
              Instructor: {classData.instructorName}
            </p>
          </div>
          
          <div className="w-20">{/* Spacer */}</div>
        </div>
      </div>

      {/* Jitsi Meet Container */}
      <div className="flex-1">
        <JitsiMeet 
          roomName={roomName}
          displayName={isInstructor ? classData.instructorName : 'Participant'}
          config={classData.settings || {}}
        />
      </div>
    </div>
  );
}