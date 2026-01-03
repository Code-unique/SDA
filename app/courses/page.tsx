'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/components/ui/use-toast"
import { 
  Star, 
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
  FileCheck,
  Building,
  MapPin,
  Phone,
  User,
  BookOpen,
  BarChart3,
  Target as TargetIcon
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import Image from 'next/image'

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
        formDataObj.append('courseId', course._id)
        
        const uploadResponse = await fetch('/api/upload/payment-proof', {
          method: 'POST',
          body: formDataObj
        })
        
        if (!uploadResponse.ok) {
          let errorMessage = 'Failed to upload payment proof'
          try {
            const errorData = await uploadResponse.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch {
            const errorText = await uploadResponse.text()
            errorMessage = errorText || errorMessage
          }
          throw new Error(errorMessage)
        }
        
        const uploadData = await uploadResponse.json()
        
        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Upload failed')
        }
        
        proofUrl = uploadData.fileUrl
        proofFileName = uploadData.fileName || formData.paymentProof.name
      }

      // Prepare payment request data
      const paymentRequestData: any = {
        paymentMethod: formData.paymentMethod,
        notes: formData.notes
      }

      if (formData.transactionId.trim()) {
        paymentRequestData.transactionId = formData.transactionId
      }

      if (proofUrl) {
        paymentRequestData.paymentProof = {
          url: proofUrl,
          fileName: proofFileName || formData.paymentProof?.name || 'payment_proof'
        }
      }
      
      const response = await fetch(`/api/courses/${course._id}/payment/initiate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(paymentRequestData)
      })

      let data
      try {
        data = await response.json()
      } catch (error) {
        throw new Error('Invalid response from server')
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment request submitted successfully!",
        })
        toast({
          title: "Info",
          description: "Admin will review your request within 24-48 hours. You'll be notified via email.",
        })
        
        const requestId = data.requestId || data._id || data.id
        if (requestId) {
          onSuccess(requestId)
        } else {
          onSuccess('temp-id-' + Date.now())
        }
        
        onClose()
      } else {
        let errorMessage = 'Failed to submit payment request'
        if (data.error) {
          errorMessage = data.error
        } else if (data.message) {
          errorMessage = data.message
        } else if (response.status === 400) {
          errorMessage = 'Invalid request data. Please check all fields.'
        } else if (response.status === 401) {
          errorMessage = 'Please log in to submit payment request'
        } else if (response.status === 403) {
          errorMessage = 'You are not authorized to submit payment request'
        } else if (response.status === 409) {
          errorMessage = 'You already have a pending payment request for this course'
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } catch (error) {
      let errorMessage = 'An error occurred. Please try again.'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-5 w-5" />
            Request Course Access
          </DialogTitle>
          <DialogDescription>
            Submit payment details for {course.title}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Payment Details Card */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details (NPR)
              </h3>
              
              {/* QR Code */}
              <div className="flex flex-col items-center mb-4">
                <div className="bg-white p-2 rounded-lg shadow-sm mb-3">
                  <div className="relative w-48 h-48">
                    <Image
                      src="/images/paymentqr.jpeg"
                      alt="Payment QR Code"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Scan QR code to pay</p>
                <p className="text-xs text-gray-500">(Use NPR currency only)</p>
              </div>

              {/* Bank Details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Bank Name</p>
                    <p className="font-semibold text-gray-900">NMB Bank Limited</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Account Number</p>
                    <p className="font-semibold text-gray-900">0260148342500016</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Account Name</p>
                    <p className="font-semibold text-gray-900">SUTRA Designing and Dwarka Clothing</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Branch</p>
                    <p className="font-semibold text-gray-900">Suryabinayak, Bhaktapur</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Contact Number</p>
                    <p className="font-semibold text-gray-900">9804304000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-semibold line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">Course Access Request</p>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  NPR {course.price.toLocaleString('ne-NP')}
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
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer (NMB)</SelectItem>
                  <SelectItem value="esewa">eSewa</SelectItem>
                  <SelectItem value="khalti">Khalti</SelectItem>
                  <SelectItem value="ime_pay">IME Pay</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID (Required for digital payments)</Label>
              <Input
                id="transaction-id"
                placeholder="Enter transaction/reference ID"
                value={formData.transactionId}
                onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                className="h-12"
              />
              <p className="text-xs text-gray-500">
                Required for eSewa, Khalti, IME Pay. For bank transfer, use your full name as reference.
              </p>
            </div>

            {/* Payment Proof */}
            <div className="space-y-2">
              <Label>Payment Proof *</Label>
              <div className="border-2 border-dashed rounded-xl p-4 sm:p-6 text-center">
                {formData.paymentProof ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="font-medium truncate">{formData.paymentProof.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(formData.paymentProof.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, paymentProof: null }))}
                      className="mt-2"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload payment receipt/screenshot
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      JPG, PNG, or PDF (max 10MB)
                    </p>
                    <Label htmlFor="payment-proof" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild className="h-10">
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

            {/* Important Notice */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl">
              <h4 className="font-semibold text-yellow-800 mb-2">Important Information</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Payment must be made in NPR (Nepalese Rupees) only</li>
                <li>• Include your full name in payment reference</li>
                <li>• Request reviewed within 24-48 hours</li>
                <li>• You'll receive email notification once approved</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.paymentMethod}
              className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
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
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null)
  const [favoriteCourses, setFavoriteCourses] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>('all')
  
  const observerTarget = useRef<HTMLDivElement>(null)
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
    { id: 'all', name: 'All', icon: Grid, color: 'from-gray-600 to-gray-800' },
    { id: 'fashion-design', name: 'Design', icon: Palette, color: 'from-purple-600 to-pink-600' },
    { id: 'pattern-making', name: 'Patterns', icon: TargetIcon, color: 'from-blue-600 to-cyan-600' },
    { id: 'sewing', name: 'Sewing', icon: Medal, color: 'from-amber-600 to-orange-600' },
    { id: 'textiles', name: 'Textiles', icon: Gauge, color: 'from-emerald-600 to-green-600' },
    { id: 'business', name: 'Business', icon: TrendingUp, color: 'from-indigo-600 to-purple-600' },
    { id: 'digital', name: 'Digital', icon: Code, color: 'from-cyan-600 to-blue-600' },
  ]

  const levelColors = {
    beginner: 'bg-gradient-to-r from-green-500 to-emerald-600',
    intermediate: 'bg-gradient-to-r from-yellow-500 to-amber-600',
    advanced: 'bg-gradient-to-r from-red-500 to-rose-600'
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

  const handlePaymentRequestSuccess = (requestId: string) => {
    if (enrollingCourse) {
      toast({
        title: '✅ Payment Request Submitted',
        description: 'Your request is under review. You\'ll be notified via email once approved.',
        variant: 'default',
      })
      
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
        className="group relative overflow-hidden rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-red-100"
        onClick={() => navigateToCourse(course)}
      >
        {/* Course Thumbnail */}
        <div className="relative h-56 sm:h-64 overflow-hidden rounded-t-3xl">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
          
          <img
            src={course.thumbnail?.url || '/api/placeholder/400/256'}
            alt={course.title}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          
          {/* Level Badge */}
          <div className="absolute top-4 left-4 z-20">
            <div className={`px-3 py-1.5 rounded-full ${levelColors[course.level]} text-white text-xs font-semibold shadow-lg backdrop-blur-sm bg-white/10`}>
              {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
            </div>
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
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-300 shadow-lg"
          >
            {isFavorite ? (
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            ) : (
              <Heart className="w-4 h-4 text-gray-600 group-hover:text-red-500 transition-colors" />
            )}
          </button>

          {/* Featured Badge */}
          {course.isFeatured && (
            <div className="absolute bottom-4 left-4 z-20">
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5 backdrop-blur-sm bg-white/10">
                <Flame className="w-3.5 h-3.5" />
                Featured
              </div>
            </div>
          )}
        </div>
        
        {/* Course Content */}
        <div className="p-5 sm:p-6">
          {/* Category and Price */}
          <div className="flex items-center justify-between mb-3">
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 text-sm font-medium text-gray-700">
              {course.category}
            </div>
            <div className="flex items-center space-x-1">
              {course.isFree ? (
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">FREE</span>
              ) : (
                <span className="text-xl font-bold text-gray-900">
                  NPR {course.price.toLocaleString('ne-NP')}
                </span>
              )}
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-lg font-bold mb-2 line-clamp-2 text-gray-900 group-hover:text-red-600 transition-colors duration-300">
            {course.title}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {course.shortDescription}
          </p>
          
          {/* Instructor */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-full ring-1 ring-white overflow-hidden bg-gradient-to-br from-red-100 to-pink-100">
              <img
                src={course.instructor.avatar || '/default-avatar.png'}
                alt={course.instructor.username}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {course.instructor.firstName} {course.instructor.lastName}
            </span>
          </div>
          
          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-5">
            <div className="flex items-center space-x-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
              <span className="text-gray-500">({course.totalReviews})</span>
            </div>
            <div className="flex items-center space-x-3">
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
          
          {/* Enrollment Button */}
          <div className="relative">
            {progressLoading.has(course._id) || isEnrolling === course._id ? (
              <Button className="w-full rounded-xl bg-gray-100 text-gray-700 h-11" disabled>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </Button>
            ) : isEnrolled ? (
              progress?.completed ? (
                <Button className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white h-11">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completed
                </Button>
              ) : (
                <Button 
                  className="w-full rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white h-11 hover:shadow-lg transition-all duration-300"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigateToCourse(course)
                  }}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Continue ({Math.round((progress?.progress || 0) * 100)}%)
                </Button>
              )
            ) : (
              <Button 
                className="w-full rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white h-11 hover:shadow-lg transition-all duration-300"
                onClick={(e) => enrollInCourse(course, e)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {course.isFree ? 'Enroll Free' : 'Request Access'}
              </Button>
            )}
          </div>

          {/* Manual Enrollment Info */}
          {!course.isFree && course.manualEnrollments > 0 && (
            <div className="mt-3 flex items-center justify-center">
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-3 py-1">
                <FileCheck className="w-3 h-3 mr-1.5" />
                {course.manualEnrollments}+ bank enrollments
              </Badge>
            </div>
          )}
        </div>
      </div>
    )
  }

  const CourseSkeleton = () => (
    <div className="overflow-hidden rounded-3xl bg-white shadow-lg border border-gray-200 animate-pulse">
      <div className="h-56 sm:h-64 bg-gradient-to-br from-gray-200 to-gray-300"></div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        </div>
        <div className="h-5 bg-gray-200 rounded mb-2 w-4/5"></div>
        <div className="h-4 bg-gray-200 rounded mb-4 w-full"></div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  )

  const FiltersSheet = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl border-gray-200 bg-white shadow-sm lg:hidden"
        >
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] sm:w-[400px] p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-2xl font-bold text-gray-900">Filters</SheetTitle>
        </SheetHeader>
        <div className="p-6 overflow-y-auto h-[calc(100vh-73px)]">
          <div className="space-y-6">
            {/* Sort Filter */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center text-lg">
                <TargetIcon className="w-5 h-5 mr-3 text-red-600" />
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
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center text-lg">
                <Crown className="w-5 h-5 mr-3 text-amber-600" />
                Price
              </h3>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Courses' },
                  { value: 'free', label: 'Free Only' },
                  { value: 'paid', label: 'Paid Only' }
                ].map((price) => (
                  <label key={price.value} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
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
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center text-lg">
                <Rocket className="w-5 h-5 mr-3 text-blue-600" />
                Level
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'beginner', label: 'Beginner', color: 'from-green-500 to-emerald-600' },
                  { name: 'intermediate', label: 'Intermediate', color: 'from-yellow-500 to-amber-600' },
                  { name: 'advanced', label: 'Advanced', color: 'from-red-500 to-rose-600' }
                ].map((level) => (
                  <label key={level.name} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
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
                    <span className={`px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${level.color}`}>
                      {level.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => setFilters({
                category: [],
                level: [],
                price: 'all',
                rating: 0,
                sort: 'popular'
              })}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear all filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
        const batchSize = 3
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-red-50/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-red-50/50 to-white">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-red-500 to-orange-500 mb-6 sm:mb-8 shadow-2xl animate-float">
              <Palette className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-8 bg-gradient-to-r from-gray-900 via-red-600 to-gray-900 bg-clip-text text-transparent">
              Master Fashion Design
            </h1>
            <p className="text-base sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
              Learn from industry experts with hands-on projects and personalized feedback
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8 sm:mb-16 px-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
                <div className="relative">
                  <Search className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-6 sm:h-6" />
                  <Input
                    type="text"
                    placeholder="Search courses, topics, or instructors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-4 rounded-2xl border-2 border-white bg-white/80 backdrop-blur-sm text-base sm:text-lg shadow-xl focus:border-red-300 focus:ring-2 focus:ring-red-200 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 sm:right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick Categories */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 sm:px-5 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 backdrop-blur-sm text-sm sm:text-base ${
                    activeCategory === category.id
                      ? `bg-gradient-to-r ${category.color} text-white shadow-xl transform scale-105`
                      : 'bg-white/80 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <category.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:w-72 xl:w-80 space-y-6">
            <div className="sticky top-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
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
              <div className="space-y-6">
                {/* Sort Filter */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center text-lg">
                    <TargetIcon className="w-5 h-5 mr-3 text-red-600" />
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
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center text-lg">
                    <Crown className="w-5 h-5 mr-3 text-amber-600" />
                    Price
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: 'all', label: 'All Courses' },
                      { value: 'free', label: 'Free Only' },
                      { value: 'paid', label: 'Paid Only' }
                    ].map((price) => (
                      <label key={price.value} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
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
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center text-lg">
                    <Rocket className="w-5 h-5 mr-3 text-blue-600" />
                    Level
                  </h3>
                  <div className="space-y-2">
                    {[
                      { name: 'beginner', label: 'Beginner', color: 'from-green-500 to-emerald-600' },
                      { name: 'intermediate', label: 'Intermediate', color: 'from-yellow-500 to-amber-600' },
                      { name: 'advanced', label: 'Advanced', color: 'from-red-500 to-rose-600' }
                    ].map((level) => (
                      <label key={level.name} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
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
                        <span className={`px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r ${level.color}`}>
                          {level.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Grid Section */}
          <div className="flex-1">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-12">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 text-gray-900">
                  {debouncedSearch ? `"${debouncedSearch}"` : 'All Courses'}
                </h2>
                <p className="text-gray-500 text-sm sm:text-lg">
                  {sortedCourses.length} courses available
                </p>
              </div>
              
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                {/* Mobile Filters Button */}
                <FiltersSheet />

                {/* Desktop Clear Filters Button */}
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => {
                    setSearchQuery('')
                    setFilters({
                      category: [],
                      level: [],
                      price: 'all',
                      rating: 0,
                      sort: 'popular'
                    })
                    setActiveCategory('all')
                  }}
                  className="hidden lg:flex text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear filters
                </Button>
              </div>
            </div>

            {/* Courses Grid */}
            {loading && courses.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {Array.from({ length: 6 }).map((_, index) => (
                  <CourseSkeleton key={index} />
                ))}
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="text-center py-12 sm:py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-red-50 to-pink-50 mb-6 sm:mb-8">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 text-red-600" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">No courses found</h3>
                <p className="text-gray-500 mb-6 sm:mb-8 max-w-sm mx-auto px-4">
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
                    setActiveCategory('all')
                  }}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white"
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {sortedCourses.map((course) => (
                    <CourseCard key={course._id} course={course} />
                  ))}
                </div>

                {/* Load More */}
                {pagination.hasMore && (
                  <div ref={observerTarget} className="flex justify-center mt-12 sm:mt-20">
                    {loadingMore ? (
                      <div className="flex items-center space-x-3 px-6 py-3 sm:px-8 sm:py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200">
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-gray-500" />
                        <span className="text-base sm:text-lg text-gray-500">Loading more...</span>
                      </div>
                    ) : (
                      <Button 
                        onClick={loadMoreCourses}
                        className="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white px-8 py-4 sm:px-10 sm:py-6 text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all"
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
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