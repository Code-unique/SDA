// components/live-classes/JitsiMeet.tsx
'use client';

import { JitsiMeeting } from '@jitsi/react-sdk';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface JitsiMeetProps {
  roomName: string;
  onLeave?: () => void;
  displayName?: string;
  email?: string;
  config?: Record<string, any>;
}

export default function JitsiMeet({ 
  roomName, 
  onLeave, 
  displayName, 
  email,
  config = {} 
}: JitsiMeetProps) {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleApiReady = (api: any) => {
    setLoading(false);
    
    // Add event listeners
    api.addEventListener('participantJoined', (participant: any) => {
      console.log('Participant joined:', participant);
    });

    api.addEventListener('participantLeft', (participant: any) => {
      console.log('Participant left:', participant);
    });

    api.addEventListener('readyToClose', () => {
      if (onLeave) {
        onLeave();
      } else {
        router.push('/live-classes');
      }
    });

    // Handle errors through the API events instead of onError prop
    api.addEventListener('error', (err: any) => {
      console.error('Jitsi meeting error:', err);
      setError('Failed to join the meeting. Please try again.');
      setLoading(false);
    });
  };

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white">Connecting to live class...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-red-500">
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => router.push('/live-classes')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Classes
            </button>
          </div>
        </div>
      )}

      {!error && (
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: config.muteOnStart ?? true,
            startWithVideoMuted: config.videoOnStart ?? false,
            disableModeratorIndicator: true,
            enableEmailInStats: false,
            disableDeepLinking: true,
            ...config
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            MOBILE_APP_PROMO: false,
            TILE_VIEW_MAX_COLUMNS: 4,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_BACKGROUND: '#111827',
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
          }}
          userInfo={{
            displayName: displayName || user?.fullName || 'Guest',
            email: email || user?.primaryEmailAddress?.emailAddress || '',
          }}
          onApiReady={handleApiReady}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
            iframeRef.style.border = 'none';
          }}
        />
      )}
    </div>
  );
}