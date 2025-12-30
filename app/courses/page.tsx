'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/components/ui/use-toast"
import { 
  Star, 
  Play, 
  Search,
  Filter,
  Upload,
  Grid, 
  List,
  Award,
  Clock,
  Users,
  Heart,
  X,
  Loader2,
  Palette,
  Target,
  Medal,
  TrendingUp,
  Globe,
  Code,
  Camera,
  Zap,
  Rocket,
  CloudLightning,
  Gauge,
  Sparkles,
  Flame,
  Crown,
  CheckCircle,
  Brain,
  ChevronRight,
  CreditCard,
  AlertTriangle,
  FileCheck
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface S3Asset {
  key: string
  url: string
}

interface Course {
  _id: string
  title: string
  description: string
  shortDescription: string
  slug: string
  instructor: {
    _id: string
    firstName: string
    lastName: string
    username: string
    avatar?: string
  }
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: S3Asset
  totalStudents: number
  averageRating: number
  totalReviews: number
  totalDuration: number
  totalLessons: number
  isFeatured: boolean
  createdAt: string
  manualEnrollments: number
}

interface UserProgress {
  _id: string
  courseId: string
  enrolled: boolean
  progress: number
  completed: boolean
  currentLesson?: string
  completedLessons: string[]
}

interface FilterState {
  category: string[]
  level: string[]
  price: 'all' | 'free' | 'paid'
  rating: number
  sort: 'popular' | 'newest' | 'rating' | 'price-low' | 'price-high'
}

// Payment Request Modal Component
const PaymentRequestModal = ({
  course,
  isOpen,
  onClose,
  onSuccess
}: {
  course: Course
  isOpen: boolean
  onClose: () => void
  onSuccess: (requestId: string) => void
}) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    paymentMethod: '',
    transactionId: '',
    notes: '',
    paymentProof: null as File | null
  })
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
  title: "Error",
  description: "File size must be less than 10MB",
  variant: "destructive"
})
        return
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        toast({
  title: "Error",
  description: "Please upload a JPEG, PNG, or PDF file",
  variant: "destructive"
})
        return
      }
      setFormData(prev => ({ ...prev, paymentProof: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.paymentMethod) {
      toast({
  title: "Error",
  description: "Please select a payment method",
  variant: "destructive"
})

      return
    }

    setLoading(true)

    try {
      let proofUrl = ''
      let proofFileName = ''
      
      if (formData.paymentProof) {
        const formDataObj = new FormData()
        formDataObj.append('file', formData.paymentProof)
        formDataObj.append('courseId', course._id) // CORRECTED: courseId, not type
        
        console.log('📤 Uploading payment proof:')
        console.log('FormData entries:')
        for (let [key, value] of formDataObj.entries()) {
          console.log(key, value instanceof File ? `${value.name} (${value.size} bytes)` : value)
        }
        
        const uploadResponse = await fetch('/api/upload/payment-proof', {
          method: 'POST',
          body: formDataObj
        })
        
        console.log('📥 Upload response status:', uploadResponse.status)
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('❌ Upload error:', errorText)
          throw new Error('Failed to upload payment proof')
        }
        
        const uploadData = await uploadResponse.json()
        console.log('✅ Upload success:', uploadData)
        
        proofUrl = uploadData.fileUrl
        proofFileName = uploadData.fileName || formData.paymentProof.name
      }

      const response = await fetch(`/api/courses/${course._id}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: formData.paymentMethod,
          transactionId: formData.transactionId,
          paymentProof: proofUrl ? {
            url: proofUrl,
            fileName: proofFileName || formData.paymentProof?.name || 'payment_proof'
          } : undefined,
          notes: formData.notes
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
  title: "Success",
  description: "Payment request submitted successfully!",
})
        toast({
  title: "Info",
  description: "Admin will review your request within 24-48 hours. You'll be notified via email.",
})
        onSuccess(data.requestId || data._id)
        onClose()
      } else {
        
toast({
  title: "Error",
  description: data.error || 'Failed to submit payment request',
  variant: "destructive"
})
      }
    } catch (error) {
      console.error('❌ Error submitting payment request:', error)
      toast({
  title: "Error",
  description: "An error occurred. Please try again.",
  variant: "destructive"
})

    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Request Course Access
          </DialogTitle>
          <DialogDescription>
            Submit payment details for {course.title}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Course Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">Course Access Request</p>
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${course.price.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
              <Input
                id="transaction-id"
                placeholder="Enter transaction/reference ID"
                value={formData.transactionId}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
              />
            </div>

            {/* Payment Proof */}
            <div className="space-y-2">
              <Label>Payment Proof (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {formData.paymentProof ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="font-medium">{formData.paymentProof.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(formData.paymentProof.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, paymentProof: null }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Upload payment receipt/screenshot
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      JPG, PNG, or PDF (max 10MB)
                    </p>
                    <Label htmlFor="payment-proof" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>Choose File</span>
                      </Button>
                    </Label>
                    <Input
                      id="payment-proof"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <ShadcnTextarea
                id="notes"
                placeholder="Any additional information about your payment..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Important Notice */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Important Information</h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                <li>• Your request will be reviewed by an admin within 24-48 hours</li>
                <li>• You will receive an email notification once approved</li>
                <li>• Keep your payment proof ready for verification if needed</li>
                <li>• Contact support for any questions</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.paymentMethod}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Payment Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CoursesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null)
  const [favoriteCourses, setFavoriteCourses] = useState<Set<string>>(new Set())
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  
  const observerTarget = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
    hasMore: true
  })

  const [userProgress, setUserProgress] = useState<Record<string, UserProgress>>({})
  const [progressLoading, setProgressLoading] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<FilterState>({
    category: [],
    level: [],
    price: 'all',
    rating: 0,
    sort: 'popular'
  })

  const categories = [
    { id: 'all', name: 'All Courses', icon: Grid, color: 'from-gray-600 to-gray-800' },
    { id: 'fashion-design', name: 'Design', icon: Palette, color: 'from-purple-600 to-pink-600' },
    { id: 'pattern-making', name: 'Patterns', icon: Target, color: 'from-blue-600 to-cyan-600' },
    { id: 'sewing', name: 'Sewing', icon: Medal, color: 'from-amber-600 to-orange-600' },
    { id: 'textiles', name: 'Textiles', icon: Gauge, color: 'from-emerald-600 to-green-600' },
    { id: 'business', name: 'Business', icon: TrendingUp, color: 'from-indigo-600 to-purple-600' },
    { id: 'digital', name: 'Digital', icon: Code, color: 'from-cyan-600 to-blue-600' },
    { id: '3d-design', name: '3D Design', icon: Camera, color: 'from-pink-600 to-rose-600' },
  ]

  const filterOptions = {
    categories: [
      { name: 'Fashion Design', icon: Palette, color: 'bg-gradient-to-r from-purple-600 to-pink-600' },
      { name: 'Pattern Making', icon: Target, color: 'bg-gradient-to-r from-blue-600 to-cyan-600' },
      { name: 'Sewing', icon: Medal, color: 'bg-gradient-to-r from-amber-600 to-orange-600' },
      { name: 'Textiles', icon: Gauge, color: 'bg-gradient-to-r from-emerald-600 to-green-600' },
      { name: 'Fashion Business', icon: TrendingUp, color: 'bg-gradient-to-r from-indigo-600 to-purple-600' },
    ],
    levels: [
      { name: 'beginner', icon: Rocket, color: 'bg-gradient-to-r from-green-600 to-emerald-600' },
      { name: 'intermediate', icon: Target, color: 'bg-gradient-to-r from-yellow-600 to-amber-600' },
      { name: 'advanced', icon: CloudLightning, color: 'bg-gradient-to-r from-red-600 to-rose-600' }
    ]
  }

  const getCourseUrl = useCallback((course: Course): string => {
    if (course.slug && typeof course.slug === 'string' && course.slug.trim() !== '') {
      return `/courses/${course.slug}`
    }
    return `/courses/id/${course._id}`
  }, [])

  const navigateToCourse = useCallback((course: Course) => {
    const url = getCourseUrl(course)
    router.push(url)
  }, [getCourseUrl, router])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setMobileFiltersOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase()
        const matchesSearch = 
          course.title.toLowerCase().includes(searchLower) ||
          course.shortDescription.toLowerCase().includes(searchLower) ||
          course.instructor.firstName.toLowerCase().includes(searchLower) ||
          course.instructor.lastName.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }

      if (activeCategory !== 'all') {
        const category = categories.find(c => c.id === activeCategory)
        if (category && course.category !== category.name) {
          return false
        }
      }

      if (filters.category.length > 0 && !filters.category.includes(course.category)) {
        return false
      }

      if (filters.level.length > 0 && !filters.level.includes(course.level)) {
        return false
      }

      if (filters.price === 'free' && !course.isFree) return false
      if (filters.price === 'paid' && course.isFree) return false

      if (filters.rating > 0 && course.averageRating < filters.rating) {
        return false
      }

      return true
    })
  }, [courses, debouncedSearch, filters, activeCategory])

  const sortedCourses = useMemo(() => {
    const sorted = [...filteredCourses]
    
    switch (filters.sort) {
      case 'popular':
        return sorted.sort((a, b) => b.totalStudents - a.totalStudents)
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      case 'rating':
        return sorted.sort((a, b) => b.averageRating - a.averageRating)
      case 'price-low':
        return sorted.sort((a, b) => (a.isFree ? 0 : a.price) - (b.isFree ? 0 : b.price))
      case 'price-high':
        return sorted.sort((a, b) => (b.isFree ? 0 : b.price) - (a.isFree ? 0 : a.price))
      default:
        return sorted
    }
  }, [filteredCourses, filters.sort])

  const fetchCourseProgress = async (courseId: string) => {
    if (progressLoading.has(courseId)) return
    
    setProgressLoading(prev => new Set([...prev, courseId]))
    
    try {
      const response = await fetch(`/api/courses/${courseId}/progress`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const progress = await response.json()
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            ...progress,
            enrolled: true
          }
        }))
      } else if (response.status === 403 || response.status === 404) {
        setUserProgress(prev => ({
          ...prev,
          [courseId]: {
            _id: `temp-${courseId}`,
            courseId,
            enrolled: false,
            progress: 0,
            completed: false,
            completedLessons: []
          }
        }))
      }
    } catch (error) {
      console.error(`Error fetching progress for course ${courseId}:`, error)
    } finally {
      setProgressLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(courseId)
        return newSet
      })
    }
  }

  // UPDATED: Enrollment handler with manual payment flow
  // In your CoursesPage component, update the enrollInCourse function:

const enrollInCourse = async (course: Course, e: React.MouseEvent) => {
  e.stopPropagation()
  if (isEnrolling) return
  
  setIsEnrolling(course._id)
  
  try {
    // First, ensure user is synced
    const syncResponse = await fetch('/api/users/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!syncResponse.ok) {
      const syncError = await syncResponse.json();
      throw new Error(syncError.error || 'Failed to sync user');
    }

    const syncData = await syncResponse.json();
    console.log('User sync result:', syncData);

    // Now proceed with enrollment
    const response = await fetch(`/api/courses/${course._id}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })

    const result = await response.json()

    if (response.status === 402 && result.requiresPayment) {
      setEnrollingCourse(course)
      setShowPaymentModal(true)
      setIsEnrolling(null)
      return
    }

    if (response.ok) {
      if (result.enrolled) {
        setCourses(prev => prev.map(c => 
          c._id === course._id 
            ? { 
                ...c, 
                totalStudents: result.course?.totalStudents || c.totalStudents + 1,
                manualEnrollments: result.course?.manualEnrollments || c.manualEnrollments
              }
            : c
        ))
        
        setUserProgress(prev => ({
          ...prev,
          [course._id]: {
            _id: `temp-${course._id}`,
            courseId: course._id,
            enrolled: true,
            progress: 0,
            completed: false,
            completedLessons: []
          }
        }))
        
        toast({
          title: '🎉 Successfully Enrolled!',
          description: 'You can now start learning immediately',
        })

        setTimeout(() => {
          navigateToCourse(course)
        }, 1500)
      } 
      else if (result.alreadyEnrolled) {
        toast({
          title: 'Already Enrolled!',
          description: 'You are already enrolled in this course',
        })
      }
      else {
        throw new Error('Unexpected response from server')
      }
    } else {
      throw new Error(result.error || `Failed to enroll (${response.status})`)
    }

  } catch (err: any) {
    console.error('Error enrolling:', err)
    
    if (err.message && !err.message.includes('402')) {
      if (err.message.includes('Unauthorized') || err.message.includes('401')) {
        toast({
          title: 'Login Required',
          description: 'Please log in to enroll in courses',
          variant: 'destructive',
        })
        const currentUrl = encodeURIComponent(window.location.pathname + window.location.search)
        router.push(`/login?redirect=${currentUrl}`)
      } else {
        toast({
          title: 'Enrollment Failed',
          description: err.message || 'Failed to enroll in course. Please try again.',
          variant: 'destructive',
        })
      }
    }
  } finally {
    setIsEnrolling(null)
  }
}

  // UPDATED: Payment request success handler
  const handlePaymentRequestSuccess = (requestId: string) => {
    if (enrollingCourse) {
      toast({
        title: '✅ Payment Request Submitted',
        description: 'Your request is under review. You\'ll be notified via email once approved.',
        variant: 'default',
      })
      
      // Update course stats to show pending request
      setCourses(prev => prev.map(c => 
        c._id === enrollingCourse._id 
          ? { 
              ...c,
              manualEnrollments: c.manualEnrollments + 1
            }
          : c
      ))
    }
    
    setShowPaymentModal(false)
    setEnrollingCourse(null)
  }

  const isUserEnrolled = (courseId: string) => {
    return userProgress[courseId]?.enrolled === true
  }

  const CourseCard = ({ course }: { course: Course }) => {
    const progress = userProgress[course._id]
    const isEnrolled = isUserEnrolled(course._id)
    const isFavorite = favoriteCourses.has(course._id)
    
    return (
      <div 
        className="group relative overflow-hidden rounded-3xl bg-white shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer border border-white hover:border-red-100"
        onMouseEnter={() => setHoveredCourse(course._id)}
        onMouseLeave={() => setHoveredCourse(null)}
        onClick={() => navigateToCourse(course)}
      >
        {/* Background Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-red-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Course Thumbnail */}
        <div className="relative h-64 overflow-hidden rounded-t-3xl">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
          <img
            src={course.thumbnail?.url || '/api/placeholder/400/256'}
            alt={course.title}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
          
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-500">
            <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-orange-500 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
          
          {/* Badges */}
          <div className="absolute top-4 left-4 z-30 space-y-2">
            <div className={`px-4 py-2 rounded-full backdrop-blur-sm bg-white/90 text-sm font-semibold shadow-lg ${
              course.level === 'beginner' ? 'text-green-700' :
              course.level === 'intermediate' ? 'text-amber-700' : 'text-red-700'
            }`}>
              {course.level}
            </div>
            {course.isFeatured && (
              <div className="px-4 py-2 rounded-full backdrop-blur-sm bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white text-sm font-semibold shadow-lg flex items-center gap-1">
                <Flame className="w-4 h-4" />
                Featured
              </div>
            )}
          </div>
          
          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setFavoriteCourses(prev => {
                const newSet = new Set(prev)
                if (newSet.has(course._id)) {
                  newSet.delete(course._id)
                  toast({
                    title: 'Removed from favorites',
                    description: 'Course removed from your favorites',
                  })
                } else {
                  newSet.add(course._id)
                  toast({
                    title: 'Added to favorites',
                    description: 'Course added to your favorites',
                  })
                }
                return newSet
              })
            }}
            className="absolute top-4 right-4 z-30 p-3 backdrop-blur-sm bg-white/90 rounded-full hover:bg-white transition-all duration-300 shadow-lg"
          >
            {isFavorite ? (
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            ) : (
              <Heart className="w-5 h-5 text-gray-600 group-hover:text-red-500 transition-colors" />
            )}
          </button>
        </div>
        
        {/* Course Content */}
        <div className="p-6 relative z-20">
          {/* Category and Price */}
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 text-sm font-medium text-gray-700">
              {course.category}
            </div>
            <div className="flex items-center space-x-1">
              {course.isFree ? (
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">FREE</span>
              ) : (
                <span className="text-2xl font-bold text-gray-900">${course.price}</span>
              )}
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold mb-3 line-clamp-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-red-600 group-hover:to-orange-500 transition-all duration-300">
            {course.title}
          </h3>
          
          {/* Instructor */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-10 h-10 rounded-full ring-2 ring-white ring-offset-2 bg-gradient-to-br from-red-100 to-pink-100 overflow-hidden">
              <img
                src={course.instructor.avatar || '/default-avatar.png'}
                alt={course.instructor.username}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {course.instructor.firstName} {course.instructor.lastName}
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{course.averageRating.toFixed(1)}</span>
              <span className="text-gray-500">({course.totalReviews})</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{course.totalStudents.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{Math.floor(course.totalDuration / 60)}h</span>
              </div>
            </div>
          </div>
          
          {/* UPDATED: Enrollment Button with manual payment text */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            {progressLoading.has(course._id) || isEnrolling === course._id ? (
              <Button className="w-full rounded-2xl bg-gray-100 text-gray-700 relative z-10 h-12" disabled>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </Button>
            ) : isEnrolled ? (
              progress?.completed ? (
                <Button className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 text-white relative z-10 h-12">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completed
                </Button>
              ) : (
                <Button 
                  className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white relative z-10 h-12 hover:shadow-xl transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToCourse(course)
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continue ({Math.round((progress?.progress || 0) * 100)}%)
                </Button>
              )
            ) : (
              <Button 
                className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white relative z-10 h-12 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                onClick={(e) => enrollInCourse(course, e)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {course.isFree ? 'Enroll Free' : 'Request Access'}
              </Button>
            )}
          </div>

          {/* Manual Enrollment Info for Paid Courses */}
          {!course.isFree && course.manualEnrollments > 0 && (
            <div className="mt-3 flex items-center justify-center">
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-3 py-1.5">
                <FileCheck className="w-3 h-3 mr-1.5" />
                {course.manualEnrollments}+ students enrolled
              </Badge>
            </div>
          )}
        </div>
      </div>
    )
  }

  const CourseSkeleton = () => (
    <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-200 animate-pulse">
      <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300"></div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded-full w-24"></div>
          <div className="h-8 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded mb-3 w-4/5"></div>
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-12 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  )

  const FiltersSidebar = () => (
    <div className="space-y-6">
      {/* Sort Filter */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h3 className="font-bold mb-4 text-gray-900 flex items-center text-lg">
          <Target className="w-5 h-5 mr-3 text-red-600" />
          Sort by
        </h3>
        <select
          value={filters.sort}
          onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest First</option>
          <option value="rating">Highest Rated</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {/* Price Filter */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h3 className="font-bold mb-4 text-gray-900 flex items-center text-lg">
          <Crown className="w-5 h-5 mr-3 text-amber-600" />
          Price
        </h3>
        <div className="space-y-3">
          {[
            { value: 'all', label: 'All Courses' },
            { value: 'free', label: 'Free Only' },
            { value: 'paid', label: 'Paid Only' }
          ].map((price) => (
            <label key={price.value} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-white/50 transition-colors">
              <div className="relative">
                <input
                  type="radio"
                  name="price"
                  value={price.value}
                  checked={filters.price === price.value}
                  onChange={() => setFilters(prev => ({ ...prev, price: price.value as any }))}
                  className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500"
                />
              </div>
              <span className="text-sm font-medium text-gray-700">{price.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Level Filter */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
        <h3 className="font-bold mb-4 text-gray-900 flex items-center text-lg">
          <Rocket className="w-5 h-5 mr-3 text-blue-600" />
          Level
        </h3>
        <div className="space-y-3">
          {filterOptions.levels.map((level) => (
            <label key={level.name} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-white/50 transition-colors">
              <input
                type="checkbox"
                checked={filters.level.includes(level.name)}
                onChange={() => {
                  setFilters(prev => ({
                    ...prev,
                    level: prev.level.includes(level.name)
                      ? prev.level.filter(l => l !== level.name)
                      : [...prev.level, level.name]
                  }))
                }}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${level.color}`}>
                {level.name.charAt(0).toUpperCase() + level.name.slice(1)}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const fetchCourses = useCallback(async (page = 1, isLoadMore = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    if (!isLoadMore) {
      setLoading(true)
      if (page === 1) {
        setCourses([])
      }
    } else {
      setLoadingMore(true)
    }
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sort: filters.sort,
        price: filters.price,
        rating: filters.rating.toString(),
      })

      if (debouncedSearch) {
        params.append('search', debouncedSearch)
      }
      if (filters.category.length > 0) {
        params.append('categories', filters.category.join(','))
      }
      if (filters.level.length > 0) {
        params.append('levels', filters.level.join(','))
      }

      const response = await fetch(`/api/courses?${params}`, {
        credentials: 'include',
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch courses`)
      }

      const data = await response.json()
      
      const normalizeCourse = (course: any): Course => {
        let slug = course.slug
        if (slug && typeof slug === 'object') {
          slug = String(slug)
        } else if (!slug || typeof slug !== 'string') {
          slug = course._id
        }
        
        return {
          ...course,
          slug: slug,
          manualEnrollments: course.manualEnrollments || 0
        }
      }

      let coursesData: Course[] = []
      let paginationData = {
        page: page,
        total: 0,
        totalPages: 1
      }

      if (Array.isArray(data)) {
        coursesData = data.map(normalizeCourse)
        paginationData.total = data.length
      } else if (data.courses && Array.isArray(data.courses)) {
        coursesData = data.courses.map(normalizeCourse)
        paginationData = {
          page: data.pagination?.page || page,
          total: data.pagination?.total || data.courses.length,
          totalPages: data.pagination?.totalPages || 1
        }
      } else if (data.data && Array.isArray(data.data)) {
        coursesData = data.data.map(normalizeCourse)
        paginationData.total = data.data.length
      }

      if (isLoadMore) {
        setCourses(prev => {
          const existingIds = new Set(prev.map(c => c._id))
          const newCourses = coursesData.filter(c => !existingIds.has(c._id))
          return [...prev, ...newCourses]
        })
      } else {
        setCourses(coursesData)
      }
      
      setPagination({
        ...pagination,
        page: paginationData.page,
        total: paginationData.total,
        totalPages: paginationData.totalPages,
        hasMore: paginationData.page < paginationData.totalPages
      })

      if (coursesData.length > 0) {
        const batchSize = 5
        for (let i = 0; i < coursesData.length; i += batchSize) {
          const batch = coursesData.slice(i, i + batchSize).map(c => c._id)
          await Promise.all(batch.map(courseId => fetchCourseProgress(courseId)))
        }
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') return
      
      console.error('Error fetching courses:', err)
      toast({
        title: 'Error Loading Courses',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
      abortControllerRef.current = null
    }
  }, [debouncedSearch, filters, pagination.limit, toast])

  const loadMoreCourses = useCallback(async () => {
    if (!pagination.hasMore || loading || loadingMore) return
    
    const nextPage = pagination.page + 1
    await fetchCourses(nextPage, true)
  }, [pagination, loading, loadingMore, fetchCourses])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loading && !loadingMore) {
          loadMoreCourses()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [pagination.hasMore, loading, loadingMore, loadMoreCourses])

  useEffect(() => {
    fetchCourses(1, false)
  }, [])

  useEffect(() => {
    fetchCourses(1, false)
  }, [debouncedSearch, filters.sort, filters.price, filters.rating])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCourses(1, false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filters.category, filters.level])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-red-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-red-50/50 to-white">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"></div>
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 mb-8 shadow-2xl animate-float">
              <Palette className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-gray-900 via-red-600 to-gray-900 bg-clip-text text-transparent">
              Master Fashion Design
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Learn from industry experts with hands-on projects and personalized feedback
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-16">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                  <Input
                    type="text"
                    placeholder="Search for courses, topics, or instructors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-16 pr-12 py-5 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-sm text-lg shadow-2xl focus:border-red-300 focus:ring-2 focus:ring-red-200 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick Categories */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-5 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 backdrop-blur-sm ${
                    activeCategory === category.id
                      ? `bg-gradient-to-r ${category.color} text-white shadow-xl transform scale-105`
                      : 'bg-white/80 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <category.icon className="w-5 h-5" />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:w-80 space-y-6">
            <div className="sticky top-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilters({
                    category: [],
                    level: [],
                    price: 'all',
                    rating: 0,
                    sort: 'popular'
                  })}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear all
                </Button>
              </div>
              <FiltersSidebar />
            </div>
          </div>

          {/* Mobile Filters Overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden">
              <div 
                ref={filtersRef}
                className="absolute left-0 top-0 h-full w-80 max-w-[90vw] bg-white/95 backdrop-blur-sm shadow-2xl overflow-y-auto"
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-xl"
                    >
                      <X className="w-5 h-5 text-gray-700" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <FiltersSidebar />
                </div>
              </div>
            </div>
          )}

          {/* Courses Grid */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
              <div>
                <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {debouncedSearch ? `"${debouncedSearch}"` : 'All Courses'}
                </h2>
                <p className="text-gray-500 text-lg">
                  {sortedCourses.length} courses available
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Mobile Filters Button */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="rounded-xl border-white/30 bg-white/50 backdrop-blur-sm lg:hidden hover:bg-white"
                >
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </Button>

                {/* View Toggle */}
                <div className="flex bg-white/50 backdrop-blur-sm rounded-xl p-1 border border-white/30">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-lg h-10 px-4"
                  >
                    <Grid className="w-5 h-5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-lg h-10 px-4"
                  >
                    <List className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Courses Grid */}
            {loading && courses.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-red-50 to-pink-50 mb-8">
                  <Search className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">No courses found</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                  Try adjusting your search or filters
                </p>
                <Button 
                  onClick={() => {
                    setSearchQuery('')
                    setFilters({
                      category: [],
                      level: [],
                      price: 'all',
                      rating: 0,
                      sort: 'popular'
                    })
                  }}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedCourses.map((course) => (
                    <CourseCard key={course._id} course={course} />
                  ))}
                </div>

                {/* Load More */}
                {pagination.hasMore && (
                  <div ref={observerTarget} className="flex justify-center mt-20">
                    {loadingMore ? (
                      <div className="flex items-center space-x-3 px-8 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/30">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        <span className="text-lg text-gray-500">Loading more...</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={loadMoreCourses}
                        className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white px-10 py-6 text-lg shadow-xl hover:shadow-2xl transition-all"
                      >
                        <Sparkles className="w-6 h-6 mr-3" />
                        Load More Courses
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Request Modal */}
      {enrollingCourse && (
        <PaymentRequestModal
          course={enrollingCourse}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setEnrollingCourse(null)
          }}
          onSuccess={handlePaymentRequestSuccess}
        />
      )}

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}