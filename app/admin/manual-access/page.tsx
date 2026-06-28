'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarIcon,
  Search,
  UserPlus,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  avatar: string;
};

type Course = {
  _id: string;
  title: string;
  slug: string;
  price: number;
  isPublished: boolean;
};

export default function ManualAccessPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses?limit=100');
      const data = await response.json();
      if (response.ok) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/manual-access?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedUser || !selectedCourse) {
      toast.error('Please select both user and course');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/manual-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser._id,
          courseId: selectedCourse,
          reason,
          expiresAt: expiresAt?.toISOString()
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Access granted successfully');
        setDialogOpen(false);
        resetForm();
      } else {
        toast.error(data.error || 'Failed to grant access');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedCourse('');
    setReason('');
    setExpiresAt(undefined);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manual Access Management</h1>
        <p className="text-muted-foreground">
          Grant course access to users manually
        </p>
      </div>

      <div className="grid gap-6">
        {/* Grant Access Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Grant Manual Access
            </CardTitle>
            <CardDescription>
              Search for a user and grant them access to a course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="user-search">Search User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="user-search"
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg mt-2 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                        selectedUser?._id === user._id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
                        setSearchResults([]);
                      }}
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.firstName}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User Display */}
              {selectedUser && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedUser.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery('');
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Course Selection */}
            <div className="space-y-2">
              <Label htmlFor="course-select">Select Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses
                    .filter(course => course.isPublished)
                    .map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        <div className="flex items-center justify-between">
                          <span>{course.title}</span>
                          <Badge variant={course.price > 0 ? "default" : "secondary"}>
                            ${course.price}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for granting access..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP") : "Set expiration date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleGrantAccess}
              disabled={!selectedUser || !selectedCourse || loading}
              className="w-full"
            >
              {loading ? 'Granting Access...' : 'Grant Access'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}