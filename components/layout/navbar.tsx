// components/layout/navbar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  X, 
  Search, 
  Sparkles, 
  Plus,
  TrendingUp,
  Compass,
  BookOpen,
  Bot,
  Users,
  Crown,
  Zap,
  Filter,
  X as CloseIcon,
  Home,
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
  Heart,
  MessageSquare,
  ShoppingCart,
  BookmarkCheck,
  GraduationCap
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { cn } from '@/lib/utils'

interface UserData {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  role: 'user' | 'admin' | 'designer'
  isVerified: boolean
}

const navigationGroups = {
  main: [
    { 
      name: 'Home', 
      href: '/', 
      icon: Home,
      description: 'Welcome back',
      roles: ['user', 'admin', 'designer']
    },
    { 
      name: 'Explore', 
      href: '/explore', 
      icon: Compass,
      description: 'Discover designs',
      roles: ['user', 'admin', 'designer']
    },
    { 
      name: 'Courses', 
      href: '/courses', 
      icon: BookOpen,
      description: 'Learn fashion',
      roles: ['user', 'admin', 'designer']
    },
    { 
      name: 'Community', 
      href: '/community', 
      icon: Users,
      description: 'Connect with others',
      roles: ['user', 'admin', 'designer']
    },
  ],
  tools: [
    { 
      name: 'AI Coach', 
      href: '/ai-coach', 
      icon: Bot,
      description: 'AI assistance',
      roles: ['user', 'admin', 'designer']
    },
    { 
      name: 'Shop', 
      href: '/shop', 
      icon: ShoppingBag,
      description: 'Marketplace',
      roles: ['user', 'admin', 'designer']
    },
  ],
  admin: [
    { 
      name: 'Admin Dashboard', 
      href: '/admin', 
      icon: BarChart3,
      description: 'Admin overview',
      roles: ['admin']
    },
    { 
      name: 'Manage Posts', 
      href: '/admin/posts', 
      icon: MessageSquare,
      description: 'Post management',
      roles: ['admin']
    },
    { 
      name: 'Manage Users', 
      href: '/admin/users', 
      icon: Users,
      description: 'User management',
      roles: ['admin']
    },
    { 
      name: 'Manage Courses', 
      href: '/admin/courses', 
      icon: BookOpen,
      description: 'Course management',
      roles: ['admin']
    },
  ],
  designer: [
    { 
      name: 'Portfolio', 
      href: '/designer/portfolio', 
      icon: Palette,
      description: 'My designs',
      roles: ['designer', 'admin']
    },
    { 
      name: 'Create Design', 
      href: '/designer/create', 
      icon: Plus,
      description: 'New design',
      roles: ['designer', 'admin']
    },
  ]
}

const userNavigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: BarChart3,
    description: 'Your dashboard',
    roles: ['user', 'admin', 'designer']
  },
  { 
    name: 'Profile', 
    href: '/profile', 
    icon: UserIcon,
    description: 'Your profile',
    roles: ['user', 'admin', 'designer']
  },
  { 
    name: 'My Courses', 
    href: '/my-courses', 
    icon: GraduationCap,
    description: 'Learning progress',
    roles: ['user', 'admin', 'designer']
  },
  { 
    name: 'Notifications', 
    href: '/notifications', 
    icon: Bookmark,
    description: 'Your notifications',
    roles: ['user', 'admin', 'designer']
  },
  { 
    name: 'Messages', 
    href: '/messages', 
    icon: MessageCircle,
    description: 'Your conversations',
    roles: ['user', 'admin', 'designer']
  },
]

const trendingSearches = [
  'Summer 2024',
  'Sustainable Fashion',
  'Streetwear',
  'Vintage Style',
  'Pattern Design',
  'Fabric Types'
]

const quickCategories = [
  { name: 'Designs', href: '/explore?type=design', icon: Shirt },
  { name: 'Designers', href: '/explore?type=designer', icon: Users },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Tutorials', href: '/explore?type=tutorial', icon: Camera },
]

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && isLoaded) {
        try {
          setLoading(true)
          const response = await fetch('/api/users/me')
          
          if (response.status === 404) {
            const syncResponse = await fetch('/api/users/sync', {
              method: 'POST'
            })
            
            if (syncResponse.ok) {
              const syncData = await syncResponse.json()
              setUserData(syncData.user)
            }
          } else if (response.ok) {
            const data = await response.json()
            setUserData(data.user)
          }
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQuery)}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query)
    router.push(`/explore?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs px-2 py-1">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      case 'designer':
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-xs px-2 py-1">
            <Palette className="w-3 h-3 mr-1" />
            Designer
          </Badge>
        )
      default:
        return null
    }
  }

  const getNavigationForRole = (role: string) => {
    const mainNav = [...navigationGroups.main, ...navigationGroups.tools]
    
    if (role === 'admin') {
      return [...mainNav, ...navigationGroups.admin]
    } else if (role === 'designer') {
      return [...mainNav, ...navigationGroups.designer]
    }
    
    return mainNav
  }

  const getCreateHref = (role: string) => {
    if (role === 'designer' || role === 'admin') {
      return '/designer/create'
    }
    return '/create/post'
  }

  const currentRole = userData?.role || 'user'
  const allNavigationItems = getNavigationForRole(currentRole)
  
  const mainDesktopItems = allNavigationItems.slice(0, 4)
  const moreDesktopItems = allNavigationItems.slice(4)

  useEffect(() => {
    const handleClickOutside = () => {
      setMoreMenuOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <nav className="mx-auto px-4 sm:px-6 py-3 max-w-7xl" aria-label="Top">
          <div className="flex items-center justify-between">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href="/" className="flex items-center space-x-2 group shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-serif font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent leading-tight">
                    SUTRA
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 max-w-2xl overflow-hidden">
              {mainDesktopItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative shrink-0",
                      isActive
                        ? "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/50 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-900"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    <span className="truncate max-w-20">{item.name}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full animate-pulse" />
                    )}
                  </Link>
                )
              })}

              {/* More Menu */}
              {moreDesktopItems.length > 0 && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMoreMenuOpen(!moreMenuOpen)
                    }}
                    className={cn(
                      "flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                      moreMenuOpen
                        ? "bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>More</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", moreMenuOpen ? "rotate-180" : "")} />
                  </Button>

                  {moreMenuOpen && (
                    <div 
                      className="absolute top-12 left-0 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {moreDesktopItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                              "flex items-center space-x-2 px-4 py-3 text-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 group",
                              isActive ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20" : "text-slate-600 dark:text-slate-300"
                            )}
                            onClick={() => setMoreMenuOpen(false)}
                          >
                            <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                            <span>{item.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 transition-all duration-200 shrink-0"
                title="Search"
              >
                <Search className="w-4 h-4" />
              </Button>

              <SignedIn>
                {/* Notifications */}
                <NotificationBell />

                {/* Create Button */}
                <Link href={getCreateHref(currentRole)}>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="rounded-xl hidden sm:flex items-center space-x-1 bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden lg:inline">Create</span>
                  </Button>
                </Link>

                {/* User Button with Role */}
                <div className="flex items-center space-x-2">
                  {userData && (
                    <div className="hidden sm:flex items-center space-x-2">
                      {getRoleBadge(userData.role)}
                    </div>
                  )}
                  <UserButton 
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-8 h-8 rounded-xl shadow-sm",
                        userButtonTrigger: "focus:shadow-none rounded-xl"
                      }
                    }}
                    afterSignOutUrl="/"
                  />
                </div>
              </SignedIn>

              <SignedOut>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <SignInButton mode="modal">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-all duration-200 shrink-0"
                    >
                      <span className="hidden sm:inline">Sign In</span>
                      <span className="sm:hidden">Login</span>
                    </Button>
                  </SignInButton>
                  
                  <SignUpButton mode="modal">
                    <Button 
                      variant="default" 
                      size="sm"
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200 shrink-0"
                    >
                      <Zap className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Get Started</span>
                    </Button>
                  </SignUpButton>
                </div>
              </SignedOut>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4 animate-in slide-in-from-top-5">
              {/* User Info */}
              <SignedIn>
                {userData && (
                  <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl mb-2 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <img
                        src={userData.avatar || '/default-avatar.png'}
                        alt={userData.firstName}
                        className="w-10 h-10 rounded-xl shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
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

              {/* Mobile Navigation */}
              {allNavigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900 shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                    </div>
                  </Link>
                )
              })}
              
              {/* Mobile User Navigation */}
              <SignedIn>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-2">
                    {userNavigation.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            "flex items-center space-x-2 px-3 py-2 rounded-xl text-sm transition-all duration-200 group",
                            isActive
                              ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                          <span>{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link href={getCreateHref(currentRole)} className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200">
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </Button>
                    </Link>
                    
                    <Link href="/settings" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl transition-all duration-200">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </Link>
                  </div>
                </div>
              </SignedIn>

              {/* Mobile Auth */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="w-full justify-start rounded-xl transition-all duration-200" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Button>
                  </SignInButton>
                  
                  <SignUpButton mode="modal">
                    <Button variant="default" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200" onClick={() => setMobileMenuOpen(false)}>
                      <Zap className="w-4 h-4 mr-2" />
                      Get Started Free
                    </Button>
                  </SignUpButton>
                </SignedOut>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Global Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0">
          <div className="flex items-start justify-center pt-20 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in slide-in-from-top-5 duration-300">
              {/* Search Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <Search className="w-5 h-5 text-rose-500 shrink-0" />
                  <form onSubmit={handleSearch} className="flex-1">
                    <Input
                      autoFocus
                      type="text"
                      placeholder="Search designs, courses, designers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-0 text-base p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-slate-400 bg-transparent"
                    />
                  </form>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchOpen(false)}
                    className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 transition-all duration-200"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Search Content */}
              <div className="max-h-96 overflow-y-auto p-4 space-y-6">
                {/* Quick Categories */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Filter className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Quick Categories
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickCategories.map((category) => {
                      const Icon = category.icon
                      return (
                        <Link
                          key={category.name}
                          href={category.href}
                          onClick={() => setSearchOpen(false)}
                          className="p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 hover:from-rose-50 hover:to-pink-50 dark:hover:from-rose-900/20 dark:hover:to-pink-900/20 rounded-xl text-sm text-slate-700 dark:text-slate-300 transition-all duration-200 text-center group"
                        >
                          <Icon className="w-5 h-5 mx-auto mb-2 text-rose-500 group-hover:scale-110 transition-transform" />
                          <div className="font-medium">{category.name}</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Trending Searches */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Trending Searches
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(search)}
                        className="px-3 py-2 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-900/30 dark:hover:to-pink-900/30 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-all duration-200 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for search */}
      {searchOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setSearchOpen(false)}
        />
      )}
    </>
  )
}