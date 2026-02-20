// components/live-classes/CreateClassForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Calendar, Clock, Video, Settings,Users, X } from 'lucide-react';

interface CreateClassFormProps {
  userId: string;
}

export default function CreateClassForm({ userId }: CreateClassFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledFor: '',
    duration: '60',
    maxParticipants: '50',
    settings: {
      enableChat: true,
      enableScreenSharing: true,
      muteOnStart: true,
      videoOnStart: false
    }
  });

  const generateRoomName = () => {
    const randomId = Math.random().toString(36).substring(2, 10);
    const titleSlug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);
    return `class-${titleSlug || 'live'}-${randomId}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const roomName = generateRoomName();
      
      const response = await fetch('/api/live-classes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          roomName,
          instructorId: userId,
          instructorName: user?.fullName,
          instructorAvatar: user?.imageUrl,
          duration: parseInt(formData.duration),
          maxParticipants: parseInt(formData.maxParticipants)
        })
      });

      if (response.ok) {
        router.refresh();
        // Reset form
        setFormData({
          title: '',
          description: '',
          scheduledFor: '',
          duration: '60',
          maxParticipants: '50',
          settings: {
            enableChat: true,
            enableScreenSharing: true,
            muteOnStart: true,
            videoOnStart: false
          }
        });
        setShowAdvanced(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Video className="w-5 h-5 text-blue-600" />
        Schedule New Class
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Class Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Introduction to Web Development"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What will this class cover?"
            maxLength={1000}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.scheduledFor}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration *
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Users className="w-4 h-4 inline mr-1" />
            Max Participants
          </label>
          <input
            type="number"
            value={formData.maxParticipants}
            onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Advanced Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <Settings className="w-4 h-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h3 className="font-medium mb-2">Class Settings</h3>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.enableChat}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, enableChat: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">Enable Chat</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.enableScreenSharing}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, enableScreenSharing: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">Enable Screen Sharing</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.muteOnStart}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, muteOnStart: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">Mute Microphone on Join</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.settings.videoOnStart}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, videoOnStart: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm">Enable Video on Join</span>
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Creating...' : 'Create Class'}
        </button>
      </form>
    </div>
  );
}