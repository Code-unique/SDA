'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  Filter,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  ChevronLeft,
  Users,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from "@/components/ui/textarea"

interface Enrollment {
  _id: string
  user: {
    _id: string
    username: string
    firstName: string
    lastName: string
    email: string
    avatar?: string
  }
  status: 'pending' | 'approved' | 'rejected'
  paymentMethod?: string
  transactionId?: string
  paymentProof?: string
  notes?: string
  approvedBy?: {
    _id: string
    username: string
    firstName: string
    lastName: string
  }
  approvedAt?: string
  createdAt: string
  updatedAt: string
}

interface Course {
  _id: string
  title: string
  price: number
  isFree: boolean
  manualEnrollmentEnabled: boolean
  slug?: string
}

export default function CourseEnrollmentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    }>
      <CourseEnrollmentsContent />
    </Suspense>
  )
}

function CourseEnrollmentsContent() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [filteredEnrollments, setFilteredEnrollments] = useState<Enrollment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })
  const [error, setError] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState<{[key: string]: string}>({})
  const [showRejectNotes, setShowRejectNotes] = useState<{[key: string]: boolean}>({})

  // Get courseId from params - handle properly for Next.js 13+
  const courseId = params.id as string
  
  console.log('Course ID from params:', courseId)

  useEffect(() => {
    if (courseId) {
      fetchEnrollments()
    } else {
      setError('Course ID is missing from URL')
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    filterEnrollments()
  }, [enrollments, searchQuery, statusFilter])

  const fetchEnrollments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching enrollments for courseId:', courseId)
      
      if (!courseId || courseId.trim() === '') {
        setError('Invalid course ID')
        setLoading(false)
        return
      }
      
      // Fetch enrollments with the course ID
      const enrollmentsResponse = await fetch(`/api/admin/youtube-courses/${courseId}/enrollments`)
      
      if (!enrollmentsResponse.ok) {
        const enrollmentsError = await enrollmentsResponse.json()
        console.log('Enrollments fetch error:', enrollmentsError)
        
        // If no enrollments, set empty array
        if (enrollmentsResponse.status === 404) {
          console.log('No enrollments found, setting empty array')
          setEnrollments([])
          setStats({ pending: 0, approved: 0, rejected: 0, total: 0 })
          
          // Try to get course details anyway
          try {
            const courseResponse = await fetch(`/api/admin/youtube-courses/${courseId}`)
            if (courseResponse.ok) {
              const courseData = await courseResponse.json()
              setCourse(courseData)
            }
          } catch (courseError) {
            console.error('Error fetching course:', courseError)
          }
          
          setLoading(false)
          return
        }
        
        throw new Error(enrollmentsError.error || 'Failed to load enrollments')
      }
      
      const enrollmentsData = await enrollmentsResponse.json()
      console.log('Enrollments data loaded:', enrollmentsData)
      
      processEnrollmentsData(enrollmentsData)
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
      toast({
        title: 'Error',
        description: 'Failed to load enrollments',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const processEnrollmentsData = (data: any) => {
    if (data.course) {
      setCourse(data.course)
    }
    
    const enrollmentsList = data.enrollments || []
    setEnrollments(enrollmentsList)
    
    // Calculate stats
    const pending = enrollmentsList.filter((e: Enrollment) => e.status === 'pending').length
    const approved = enrollmentsList.filter((e: Enrollment) => e.status === 'approved').length
    const rejected = enrollmentsList.filter((e: Enrollment) => e.status === 'rejected').length
    
    setStats({
      pending,
      approved,
      rejected,
      total: enrollmentsList.length
    })
  }

  const filterEnrollments = () => {
    let filtered = [...enrollments]
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(enrollment =>
        enrollment.user.firstName.toLowerCase().includes(query) ||
        enrollment.user.lastName.toLowerCase().includes(query) ||
        enrollment.user.email.toLowerCase().includes(query) ||
        enrollment.user.username.toLowerCase().includes(query) ||
        enrollment.paymentMethod?.toLowerCase().includes(query) ||
        enrollment.transactionId?.toLowerCase().includes(query)
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(enrollment => enrollment.status === statusFilter)
    }
    
    setFilteredEnrollments(filtered)
  }

  const updateEnrollmentStatus = async (enrollmentId: string, status: 'approved' | 'rejected', notes?: string) => {
    if (!course) {
      toast({
        title: 'Error',
        description: 'Course not loaded',
        variant: 'destructive'
      })
      return
    }
    
    try {
      console.log('Updating enrollment:', { enrollmentId, status, notes, courseId: course._id })
      
      setUpdating(enrollmentId)
      
      const requestBody: any = { status }
      if (notes !== undefined && notes !== null && notes.trim() !== '') {
        requestBody.notes = notes.trim()
      }
      
      console.log('Sending request body:', requestBody)
      
      const response = await fetch(`/api/admin/youtube-courses/${course._id}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status:', response.status)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to update enrollment`)
      }
      
      // Update local state
      setEnrollments(prev => prev.map(enrollment => {
        if (enrollment._id === enrollmentId) {
          return {
            ...enrollment,
            status: data.enrollment.status,
            approvedBy: data.enrollment.approvedBy,
            approvedAt: data.enrollment.approvedAt,
            notes: data.enrollment.notes || notes || enrollment.notes,
            updatedAt: new Date().toISOString()
          }
        }
        return enrollment
      }))
      
      // Clear reject notes if any
      if (showRejectNotes[enrollmentId]) {
        setShowRejectNotes(prev => ({...prev, [enrollmentId]: false}))
        setRejectNotes(prev => ({...prev, [enrollmentId]: ''}))
      }
      
      toast({
        title: status === 'approved' ? 'Enrollment Approved' : 'Enrollment Rejected',
        description: data.message || `Enrollment ${status} successfully`,
        variant: 'default'
      })
      
      // Refresh the data to get updated stats
      setTimeout(() => {
        fetchEnrollments()
      }, 500)
      
    } catch (error) {
      console.error('Error updating enrollment:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update enrollment',
        variant: 'destructive'
      })
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading enrollments...</p>
          {courseId && (
            <p className="text-sm text-gray-500 mt-2">Course ID: {courseId}</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/youtube-courses')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error}</p>
              <div className="mt-4 p-3 bg-gray-100 rounded">
                <p className="text-sm font-medium mb-1">Debug Information:</p>
                <p className="text-sm">Course ID from URL: <code className="bg-gray-200 px-2 py-1 rounded">{courseId}</code></p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/admin/youtube-courses')}
                >
                  View All Courses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchEnrollments}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/youtube-courses')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Enrollment Requests</h1>
              {course ? (
                <>
                  <p className="text-gray-600">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={
                      course.isFree ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                    }>
                      {course.isFree ? 'FREE' : `NPR ${course.price}`}
                    </Badge>
                    <Badge variant="outline" className={
                      course.manualEnrollmentEnabled ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }>
                      {course.manualEnrollmentEnabled ? 'Manual Enrollment' : 'Auto Enrollment'}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-gray-600">Loading course details...</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg">
                <Users className="w-5 h-5 mr-2" />
                {stats.total} Total Requests
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchEnrollments}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-800">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
                <div className="text-sm text-green-800">Approved</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-red-800">Rejected</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-800">Total</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by name, email, or transaction..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
                <Button
                  variant="outline"
                  onClick={filterEnrollments}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Apply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Enrollment Requests ({filteredEnrollments.length})</CardTitle>
              <div className="text-sm text-gray-500">
                Showing {filteredEnrollments.length} of {enrollments.length}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredEnrollments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {enrollments.length === 0 ? (
                  <div className="space-y-4">
                    <FileText className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="text-lg font-medium">No Enrollment Requests</h3>
                    <p>There are no enrollment requests for this course yet.</p>
                    <Button
                      variant="outline"
                      onClick={() => course && router.push(`/admin/youtube-courses/${course._id}`)}
                    >
                      View Course Details
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Search className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="text-lg font-medium">No Matching Requests</h3>
                    <p>No enrollment requests match your current filters.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setStatusFilter('all')
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEnrollments.map((enrollment) => (
                  <div key={enrollment._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {enrollment.user.avatar ? (
                            <img
                              src={enrollment.user.avatar}
                              alt={enrollment.user.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {enrollment.user.firstName} {enrollment.user.lastName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <a 
                              href={`mailto:${enrollment.user.email}`}
                              className="text-sm text-gray-600 hover:text-blue-600"
                            >
                              {enrollment.user.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">@{enrollment.user.username}</span>
                          </div>
                          
                          {/* Payment Info */}
                          {(enrollment.paymentMethod || enrollment.transactionId) && (
                            <div className="mt-3 space-y-1">
                              {enrollment.paymentMethod && (
                                <p className="text-sm">
                                  <span className="font-medium">Payment Method:</span>{' '}
                                  <Badge variant="outline" className="ml-2">
                                    {enrollment.paymentMethod}
                                  </Badge>
                                </p>
                              )}
                              {enrollment.transactionId && (
                                <p className="text-sm">
                                  <span className="font-medium">Transaction ID:</span>{' '}
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs ml-2">
                                    {enrollment.transactionId}
                                  </code>
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Notes */}
                          {enrollment.notes && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-1">Admin Notes:</p>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {enrollment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status & Actions */}
                      <div className="flex flex-col gap-3 min-w-[250px]">
                        <div className="flex items-center justify-between">
                          {getStatusBadge(enrollment.status)}
                          <div className="text-sm text-gray-600 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(enrollment.createdAt)}
                          </div>
                        </div>
                        
                        {enrollment.approvedBy && enrollment.approvedAt && (
                          <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="font-medium">
                              {enrollment.status === 'approved' ? 'Approved' : 'Rejected'} by:
                            </div>
                            <div>{enrollment.approvedBy.firstName} {enrollment.approvedBy.lastName}</div>
                            <div className="text-xs">
                              on {formatDate(enrollment.approvedAt)}
                            </div>
                          </div>
                        )}
                        
                        {enrollment.status === 'pending' && (
                          <div className="space-y-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateEnrollmentStatus(enrollment._id, 'approved')}
                              disabled={updating === enrollment._id}
                              className="w-full"
                            >
                              {updating === enrollment._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            
                            {!showRejectNotes[enrollment._id] ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowRejectNotes(prev => ({...prev, [enrollment._id]: true}))}
                                disabled={updating === enrollment._id}
                                className="w-full"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Reason for rejection (optional)"
                                  value={rejectNotes[enrollment._id] || ''}
                                  onChange={(e) => setRejectNotes(prev => ({...prev, [enrollment._id]: e.target.value}))}
                                  className="text-sm min-h-[60px]"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateEnrollmentStatus(enrollment._id, 'rejected', rejectNotes[enrollment._id])}
                                    disabled={updating === enrollment._id}
                                    className="flex-1"
                                  >
                                    {updating === enrollment._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      'Confirm Reject'
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowRejectNotes(prev => ({...prev, [enrollment._id]: false}))
                                      setRejectNotes(prev => ({...prev, [enrollment._id]: ''}))
                                    }}
                                    disabled={updating === enrollment._id}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Payment Proof */}
                    {enrollment.paymentProof && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Payment Proof</h4>
                          <Badge variant="outline" className="text-xs">
                            {enrollment.paymentProof.split('.').pop()?.toUpperCase() || 'File'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(enrollment.paymentProof, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Proof
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = enrollment.paymentProof!
                              link.download = `payment-proof-${enrollment.user.username}-${enrollment._id}.jpg`
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}