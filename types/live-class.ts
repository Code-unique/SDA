import { Types } from 'mongoose';

export interface Participant {
  userId: string;
  name: string;
  joinedAt: Date | string;
}

export interface ILiveClass {
  _id: Types.ObjectId | string;
  title: string;
  description?: string;
  instructorId: string;
  instructorName: string;
  roomName: string;
  scheduledFor: Date;
  duration: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  participants?: Participant[];
  settings?: {
    startAudioOnly?: boolean;
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// This is the serialized version we'll use in components
export interface SerializedLiveClass {
  _id: string;
  title: string;
  description?: string;
  instructorId: string;
  instructorName: string;
  roomName: string;
  scheduledFor: string; // ISO string
  duration: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  participants?: Array<{
    userId: string;
    name: string;
    joinedAt: string; // ISO string
  }>;
  settings?: {
    startAudioOnly?: boolean;
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}