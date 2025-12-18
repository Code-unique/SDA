// components/layout/navbar.tsx
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Menu, 
  X, 
  Search, 
  Sparkles, 
  Plus,
  TrendingUp,
  Home,
  Compass,
  BookOpen,
  Bot,
  Users,
  Crown,
  Zap,
  Filter,
  ShoppingBag,
  BarChart3,
  Settings,
  User as UserIcon,
  Bookmark,
  Palette,
  ChevronDown,
  MessageCircle,
  Camera,
  Shirt,
  Bell,
  MoreHorizontal,
  GraduationCap,
  Star,
  Target,
  Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'

// Types
interface UserData {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  role: 'user' | 'admin' | 'designer'
  isVerified: boolean
  email?: string
}

type UserRole = 'user' | 'admin' | 'designer'

interface NavItem {
  readonly name: string
  readonly href: string
  readonly icon: React.ComponentType<{ className?: string }>
  readonly description: string
  readonly roles: readonly UserRole[]
  readonly showInDesktop: boolean
  readonly showInMobileMain: boolean
  readonly showInMobileMenu: boolean
  readonly mobileOrder?: number
  readonly badge?: string
}

// Type for quick categories to avoid circular reference
type QuickCategory = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

// Navigation configuration - ENHANCED: Removed Community, AI Coach, Explore from side nav
const navigationConfig = {
  main: [
    { 
      name: 'Home', 
      href: '/', 
      icon: Home,
      description: 'Welcome back',
      roles: ['user', 'admin', 'designer'] as readonly UserRole[],
      showInDesktop: true,
      showInMobileMain: true,
      showInMobileMenu: false,
      mobileOrder: 1
    },
    { 
      name: 'Courses', 
      href: '/courses', 
      icon: BookOpen,
      description: 'Learn fashion',
      roles: ['user', 'admin', 'designer'] as readonly UserRole[],
      showInDesktop: true,
      showInMobileMain: true,
      showInMobileMenu: false,
      mobileOrder: 2,
      badge: 'New'
    },
    { 
      name: 'Shop', 
      href: '/shop', 
      icon: ShoppingBag,
      description: 'Marketplace',
      roles: ['user', 'admin', 'designer'] as readonly UserRole[],
      showInDesktop: true,
      showInMobileMain: true,
      showInMobileMenu: false,
      mobileOrder: 3
    },
    { 
      name: 'AI Coach', 
      href: '/ai-coach', 
      icon: Bot,
      description: 'AI assistance',
      roles: ['user', 'admin', 'designer'] as readonly UserRole[],
      showInDesktop: false,
      showInMobileMain: true,
      showInMobileMenu: false,
      mobileOrder: 4,
      badge: 'AI'
    },
  ],
  discovery: [
    { 
      name: 'Trending', 
      href: '/trending', 
      icon: Flame,
      description: 'Hot designs',
      roles: ['user', 'admin', 'designer'] as readonly UserRole[],
      showInDesktop: false,
      showInMobileMain: false,
      showInMobileMenu: true,
      mobileOrder: 5
    },
    { 
      name: 'Explore', 
      href: '/explore', 
      icon: Compass,
      description: 'Discover designs',
      roles: ['user', 'admin', 'designer'] as readonly UserRole[],
      showInDesktop: false,
      showInMobileMain: false,
      showInMobileMenu: true,
      mobileOrder: 6
    },
  ],
  admin: [
    { 
      name: 'Admin Dashboard', 
      href: '/admin', 
      icon: Crown,
      description: 'Admin overview',
      roles: ['admin'] as readonly UserRole[],
      showInDesktop: false,
      showInMobileMain: false,
      showInMobileMenu: true,
      mobileOrder: 7
    },
  ],
  designer: [
    { 
      name: 'Portfolio', 
      href: '/designer/portfolio', 
      icon: Palette,
      description: 'My designs',
      roles: ['designer', 'admin'] as readonly UserRole[],
      showInDesktop: false,
      showInMobileMain: false,
      showInMobileMenu: true,
      mobileOrder: 8
    },
    { 
      name: 'Create Design', 
      href: '/designer/create', 
      icon: Plus,
      description: 'New design',
      roles: ['designer', 'admin'] as readonly UserRole[],
      showInDesktop: false,
      showInMobileMain: false,
      showInMobileMenu: true,
      mobileOrder: 9
    },
  ]
} as const

const userNavigationItems = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: BarChart3,
    description: 'Your dashboard',
  },
  { 
    name: 'Profile', 
    href: '/profile', 
    icon: UserIcon,
    description: 'Your profile',
  },
  { 
    name: 'My Courses', 
    href: '/my-courses', 
    icon: GraduationCap,
    description: 'Learning progress',
  },
  { 
    name: 'Saved Items', 
    href: '/saved', 
    icon: Bookmark,
    description: 'Your saved items',
  },
  { 
    name: 'Messages', 
    href: '/messages', 
    icon: MessageCircle,
    description: 'Your conversations',
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    description: 'Account settings',
  },
] as const

const trendingSearches = [
  'Summer 2024',
  'Sustainable Fashion',
  'Streetwear',
  'Vintage Style',
  'Pattern Design',
  'Fabric Types'
] as const

const quickCategoriesData: QuickCategory[] = [
  { name: 'Designs', href: '/explore?type=design', icon: Shirt },
  { name: 'Designers', href: '/explore?type=designer', icon: Users },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Tutorials', href: '/explore?type=tutorial', icon: Camera },
]

// Custom hook for navbar logic
function useNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notificationsCount] = useState(3)
  
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close all modals on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
        setSearchOpen(false)
        setMoreMenuOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (user && isLoaded) {
        try {
          setLoading(true)
          // In a real app, this would be an API call
          const mockUserData: UserData = {
            _id: user.id,
            username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
            firstName: user.firstName || 'User',
            lastName: user.lastName || '',
            avatar: user.imageUrl,
            role: (user.publicMetadata?.role as UserRole) || 'user',
            isVerified: Boolean(user.publicMetadata?.isVerified),
            email: user.emailAddresses[0]?.emailAddress
          }
          
          setUserData(mockUserData)
        } catch (error) {
          console.error('Error fetching user data:', error)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user, isLoaded])

  // Memoized navigation items for different contexts
  const getAllNavigationItems = useCallback((role: UserRole = 'user'): NavItem[] => {
    const allItems = [
      ...navigationConfig.main,
      ...navigationConfig.discovery,
      ...(role === 'admin' ? navigationConfig.admin : []),
      ...(role === 'designer' || role === 'admin' ? navigationConfig.designer : [])
    ] as NavItem[]
    
    return allItems.filter(item => item.roles.includes(role))
  }, [])

  const navigationItems = useMemo(() => 
    getAllNavigationItems(userData?.role), [userData?.role, getAllNavigationItems]
  )

  const desktopMainItems = useMemo(() => 
    navigationItems.filter(item => item.showInDesktop), [navigationItems]
  )

  const mobileMainItems = useMemo(() => 
    navigationItems
      .filter(item => item.showInMobileMain)
      .sort((a, b) => (a.mobileOrder || 99) - (b.mobileOrder || 99))
      .slice(0, 4),
    [navigationItems]
  )

  const mobileMenuItems = useMemo(() => 
    navigationItems.filter(item => item.showInMobileMenu), [navigationItems]
  )

  const moreMenuItems = useMemo(() => 
    navigationItems.filter(item => !item.showInDesktop && item.showInMobileMenu), [navigationItems]
  )

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQuery)}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }, [searchQuery, router])

  const handleQuickSearch = useCallback((query: string) => {
    setSearchQuery(query)
    router.push(`/explore?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
  }, [router])

  const getRoleBadge = useCallback((role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-0.5 rounded-full"
            aria-label="Administrator"
          >
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case 'designer':
        return (
          <Badge 
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-2 py-0.5 rounded-full"
            aria-label="Verified Designer"
          >
            <Palette className="w-3 h-3 mr-1" />
            Designer
          </Badge>
        )
      default:
        return null
    }
  }, [])

  const isActive = useCallback((href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }, [pathname])

  return {
    states: {
      mobileMenuOpen,
      searchOpen,
      searchQuery,
      moreMenuOpen,
      userData,
      loading,
      notificationsCount,
      isDesktop
    },
    actions: {
      setMobileMenuOpen,
      setSearchOpen,
      setSearchQuery,
      setMoreMenuOpen,
      handleSearch,
      handleQuickSearch,
    },
    refs: {
      searchInputRef,
      moreMenuRef
    },
    data: {
      desktopMainItems,
      mobileMainItems,
      mobileMenuItems,
      moreMenuItems,
      userNavigationItems,
      trendingSearches,
      quickCategoriesData
    },
    utils: {
      getRoleBadge,
      isActive,
    }
  }
}

// Loading skeleton component
function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <nav className="mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="w-24 h-6 rounded" />
          </div>
          <div className="hidden lg:flex items-center space-x-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-16 h-8 rounded-xl" />
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="w-24 h-8 rounded-xl" />
          </div>
        </div>
      </nav>
    </header>
  )
}

// Search Modal Component
interface SearchModalProps {
  open: boolean
  onClose: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleSearch: (e: React.FormEvent) => void
  handleQuickSearch: (query: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  quickCategories: QuickCategory[]
  trendingSearches: readonly string[]
}

function SearchModal({
  open,
  onClose,
  searchQuery,
  setSearchQuery,
  handleSearch,
  handleQuickSearch,
  searchInputRef,
  quickCategories,
  trendingSearches
}: SearchModalProps) {
  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        role="dialog"
        aria-modal="true"
        aria-label="Search dialog"
      >
        <div className="flex items-start justify-center pt-4 sm:pt-20 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in slide-in-from-top-5 duration-300">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <Search className="w-5 h-5 text-rose-500 shrink-0" aria-hidden="true" />
                <form onSubmit={handleSearch} className="flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search designs, courses, designers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-0 text-base sm:text-lg focus:outline-none placeholder-slate-400 bg-transparent"
                    aria-label="Search input"
                    autoComplete="off"
                  />
                </form>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 shrink-0 transition-all duration-200"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Content */}
            <div className="max-h-[calc(85vh-80px)] sm:max-h-96 overflow-y-auto p-4 space-y-6">
              {/* Quick Categories */}
              <section aria-labelledby="quick-categories-heading">
                <div className="flex items-center space-x-2 mb-3">
                  <Filter className="w-4 h-4 text-rose-500" aria-hidden="true" />
                  <span id="quick-categories-heading" className="text-sm font-medium text-slate-600">
                    Quick Categories
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {quickCategories.map((category) => {
                    const Icon = category.icon
                    return (
                      <Link
                        key={category.name}
                        href={category.href}
                        onClick={onClose}
                        className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-rose-50 hover:to-pink-50 rounded-xl text-sm text-slate-700 transition-all duration-200 text-center group focus:outline-none focus:ring-2 focus:ring-rose-500"
                        aria-label={`Browse ${category.name}`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-2 text-rose-500 group-hover:scale-110 transition-transform" aria-hidden="true" />
                        <div className="font-medium">{category.name}</div>
                      </Link>
                    )
                  })}
                </div>
              </section>

              {/* Trending Searches */}
              <section aria-labelledby="trending-searches-heading">
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-rose-500" aria-hidden="true" />
                  <span id="trending-searches-heading" className="text-sm font-medium text-slate-600">
                    Trending Searches
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickSearch(search)}
                      className="px-3 py-2 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-rose-100 hover:to-pink-100 rounded-lg text-sm text-slate-700 transition-all duration-200 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      aria-label={`Search for ${search}`}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      <div 
        className="fixed inset-0 z-[99]" 
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  )
}

// Mobile Bottom Navigation Component
interface MobileBottomNavProps {
  items: NavItem[]
  isActive: (href: string) => boolean
}

function MobileBottomNav({
  items,
  isActive,
}: MobileBottomNavProps) {
  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl safe-bottom"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all min-w-[56px] relative",
                active
                  ? "text-rose-600"
                  : "text-slate-500 hover:text-slate-900"
              )}
              aria-label={item.name}
              aria-current={active ? 'page' : undefined}
            >
              <div className={cn(
                "p-2 rounded-lg mb-1 transition-all relative",
                active
                  ? "bg-gradient-to-r from-rose-50 to-pink-50"
                  : "hover:bg-slate-100"
              )}>
                <Icon className="w-5 h-5" aria-hidden="true" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}

        {/* Plus Button - Replaces Search and More buttons */}
        <Link
          href="/dashboard/posts/create"
          className="flex flex-col items-center p-2 rounded-xl text-rose-600 hover:text-rose-700 min-w-[56px]"
          aria-label="Create post"
        >
          <div className="p-2 rounded-lg mb-1 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100">
            <Plus className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium">Create</span>
        </Link>
      </div>
    </nav>
  )
}

// Mobile Menu Component
interface MobileMenuProps {
  open: boolean
  onClose: () => void
  userData: UserData | null
  loading: boolean
  mobileMenuItems: NavItem[]
  userNavigationItems: typeof userNavigationItems
  isActive: (href: string) => boolean
  getRoleBadge: (role: UserRole) => React.ReactNode | null
  notificationsCount: number
}

function MobileMenu({
  open,
  onClose,
  userData,
  loading,
  mobileMenuItems,
  userNavigationItems,
  isActive,
  getRoleBadge,
  notificationsCount
}: MobileMenuProps) {
  if (!open) return null

  return (
    <>
      <div 
        className="lg:hidden fixed inset-0 top-0 z-[90] bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="lg:hidden fixed inset-y-0 left-0 z-[91] w-full max-w-sm bg-white overflow-y-auto animate-in slide-in-from-left-5 duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        <div className="p-4 pb-32 space-y-2">
          {/* User Info */}
          <SignedIn>
            {loading ? (
              <div className="px-4 py-3 bg-slate-50 rounded-xl mb-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              </div>
            ) : userData && (
              <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl mb-2">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10 rounded-xl shadow-sm">
                    <AvatarImage src={userData.avatar} alt={userData.username} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600">
                      {userData.firstName?.[0]}{userData.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-slate-900 truncate">
                        {userData.firstName} {userData.lastName}
                      </p>
                      {getRoleBadge(userData.role)}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      @{userData.username}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </SignedIn>

          {/* Discovery Section */}
          {mobileMenuItems.length > 0 && (
            <section aria-labelledby="discovery-heading">
              <h3 
                id="discovery-heading"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2"
              >
                Discover
              </h3>
              <div className="space-y-1">
                {mobileMenuItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-rose-500",
                        active
                          ? "bg-gradient-to-r from-rose-50 to-pink-50 text-rose-600 border border-rose-100 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4 transition-transform group-hover:scale-110" aria-hidden="true" />
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.description}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
          
          {/* User Navigation */}
          <SignedIn>
            <section aria-labelledby="account-navigation-heading">
              <h3 
                id="account-navigation-heading"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2"
              >
                Account
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {userNavigationItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-rose-500",
                        active
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      )}
                      onClick={onClose}
                    >
                      <Icon className="w-4 h-4 transition-transform group-hover:scale-110" aria-hidden="true" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link 
                  href="/dashboard/posts/create"
                  className="block"
                  onClick={onClose}
                >
                  <Button className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </Link>
                
                <Link 
                  href="/notifications" 
                  className="block relative"
                  onClick={onClose}
                >
                  <Button variant="outline" className="w-full rounded-xl transition-all duration-200">
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                    {notificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notificationsCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            </section>
          </SignedIn>

          {/* Mobile Auth */}
          <SignedOut>
            <section aria-labelledby="mobile-auth-heading">
              <h3 id="mobile-auth-heading" className="sr-only">Authentication</h3>
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <SignInButton mode="modal">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start rounded-xl transition-all duration-200" 
                    onClick={onClose}
                  >
                    Sign In
                  </Button>
                </SignInButton>
                
                <SignUpButton mode="modal">
                  <Button 
                    className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200" 
                    onClick={onClose}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Get Started Free
                  </Button>
                </SignUpButton>
              </div>
            </section>
          </SignedOut>
        </div>
      </div>
    </>
  )
}

// Main Navbar Component
export function Navbar() {
  const {
    states: {
      mobileMenuOpen,
      searchOpen,
      searchQuery,
      moreMenuOpen,
      userData,
      loading,
      notificationsCount,
      isDesktop
    },
    actions: {
      setMobileMenuOpen,
      setSearchOpen,
      setSearchQuery,
      setMoreMenuOpen,
      handleSearch,
      handleQuickSearch,
    },
    refs: {
      searchInputRef,
      moreMenuRef
    },
    data: {
      desktopMainItems,
      mobileMainItems,
      mobileMenuItems,
      moreMenuItems,
      userNavigationItems,
      trendingSearches,
      quickCategoriesData
    },
    utils: {
      getRoleBadge,
      isActive,
    }
  } = useNavbar()

  // Show skeleton while loading
  if (loading && !userData) {
    return <NavbarSkeleton />
  }

  const getUserInitials = () => {
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`
    }
    return userData?.username?.[0]?.toUpperCase() || 'U'
  }

  return (
    <>
      {/* Main Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm safe-top">
        <nav className="mx-auto px-4 sm:px-6 py-3 max-w-7xl" aria-label="Main navigation">
          <div className="flex items-center justify-between">
            
            {/* Left: Logo (removed hamburger menu button) */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 group shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-500 rounded-lg"
                aria-label="SUTRA Home"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent leading-tight">
                    SUTRA
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation - ENHANCED: Clean, focused items */}
            <div className="hidden lg:flex items-center space-x-1">
              {desktopMainItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative focus:outline-none focus:ring-2 focus:ring-rose-500",
                      active
                        ? "bg-gradient-to-r from-rose-50 to-pink-50 text-rose-600 shadow-sm border border-rose-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" aria-hidden="true" />
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[8px] rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full animate-pulse" />
                    )}
                  </Link>
                )
              })}

              {/* More Menu - Discovery items */}
              {moreMenuItems.length > 0 && (
                <div className="relative" ref={moreMenuRef}>
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className={cn(
                      "flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500",
                      moreMenuOpen
                        ? "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-900 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                    aria-label="Discover more"
                    aria-expanded={moreMenuOpen}
                    aria-controls="more-menu"
                  >
                    <Compass className="w-4 h-4" aria-hidden="true" />
                    <span>Discover</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", moreMenuOpen ? "rotate-180" : "")} aria-hidden="true" />
                  </button>

                  {moreMenuOpen && (
                    <div 
                      id="more-menu"
                      className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95"
                      role="menu"
                    >
                      <div className="p-3 border-b border-slate-200">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Explore More
                        </span>
                      </div>
                      {moreMenuItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href)
                        
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMoreMenuOpen(false)}
                            className={cn(
                              "flex items-center space-x-2 px-4 py-3 text-sm transition-all duration-200 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 group focus:outline-none focus:ring-2 focus:ring-rose-500",
                              active ? "text-rose-600 bg-rose-50" : "text-slate-600"
                            )}
                            role="menuitem"
                          >
                            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" aria-hidden="true" />
                            <span>{item.name}</span>
                            {item.badge && (
                              <span className="ml-auto text-xs px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                aria-label="Search"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>

              <SignedIn>
                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  aria-label={`Notifications ${notificationsCount > 0 ? `(${notificationsCount} unread)` : ''}`}
                >
                  <Bell className="w-5 h-5 text-slate-600" aria-hidden="true" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse">
                      <span className="sr-only">{notificationsCount} unread notifications</span>
                    </span>
                  )}
                </Link>

                {/* User Menu */}
                <div className="relative group">
                  <button 
                    className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    aria-label="User menu"
                    aria-haspopup="true"
                  >
                    <Avatar className="w-8 h-8 rounded-xl shadow-sm ring-2 ring-white">
                      <AvatarImage src={userData?.avatar} alt={userData?.username || 'User'} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  
                  {/* User Dropdown */}
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {/* User Info */}
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12 rounded-xl ring-2 ring-rose-100">
                          <AvatarImage src={userData?.avatar} alt={userData?.username || 'User'} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 font-semibold">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-slate-900 truncate">
                              {userData?.firstName} {userData?.lastName}
                            </p>
                            {getRoleBadge(userData?.role || 'user')}
                          </div>
                          <p className="text-sm text-slate-500 truncate">
                            @{userData?.username}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* User Navigation */}
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {userNavigationItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.href)
                        
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500",
                              active ? "text-rose-600 bg-rose-50" : "text-slate-700"
                            )}
                          >
                            <Icon className="w-4 h-4" aria-hidden="true" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                    
                    {/* Sign Out */}
                    <div className="p-3 border-t border-slate-200">
                      <UserButton 
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            userButtonTrigger: "w-full justify-start text-sm hover:bg-slate-50 px-3 py-2.5 rounded-lg",
                            userButtonOut: "w-full"
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </SignedIn>

              <SignedOut>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <SignInButton mode="modal">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="rounded-xl text-slate-600 hover:text-rose-600 transition-all duration-200 focus:ring-2 focus:ring-rose-500"
                    >
                      <span className="hidden sm:inline">Sign In</span>
                      <span className="sm:hidden">Login</span>
                    </Button>
                  </SignInButton>
                  
                  <SignUpButton mode="modal">
                    <Button 
                      size="sm"
                      className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white transition-all duration-200 focus:ring-2 focus:ring-rose-500 shadow-sm hover:shadow"
                    >
                      <Zap className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline ml-1">Get Started</span>
                    </Button>
                  </SignUpButton>
                </div>
              </SignedOut>
            </div>
          </div>
        </nav>
      </header>

      {/* Search Modal */}
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        handleQuickSearch={handleQuickSearch}
        searchInputRef={searchInputRef}
        quickCategories={quickCategoriesData}
        trendingSearches={trendingSearches}
      />

      {/* Mobile Menu - Shows discovery items */}
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        userData={userData}
        loading={loading}
        mobileMenuItems={mobileMenuItems}
        userNavigationItems={userNavigationItems}
        isActive={isActive}
        getRoleBadge={getRoleBadge}
        notificationsCount={notificationsCount}
      />

      {/* Bottom Navigation (Mobile Only) - ENHANCED: Single Plus button */}
      <MobileBottomNav
        items={mobileMainItems}
        isActive={isActive}
      />

      {/* Content padding for mobile bottom nav */}
      <div className="lg:hidden pb-16" />
    </>
  )
}