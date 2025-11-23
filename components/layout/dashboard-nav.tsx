// components/layout/dashboard-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Image, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Sparkles,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const dashboardLinks = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Posts', href: '/dashboard/posts', icon: Image },
  { name: 'My Courses', href: '/courses', icon: BookOpen },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'AI Coach', href: '/ai-coach', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function DashboardNav() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-serif font-bold">Dashboard</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation links */}
        <nav className="p-4 space-y-2">
          {dashboardLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-2xl text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <UserButton 
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8",
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                Your Account
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-serif font-bold">Dashboard</span>
          </Link>
          <div className="w-9"></div> {/* Spacer for balance */}
        </div>
      </div>
    </>
  )
}