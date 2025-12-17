// components/admin/admin-sidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Image, 
  BookOpen, 
  Settings, 
  BarChart3,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  user?: any
}

const navItems = [
  { 
    href: '/admin', 
    label: 'Dashboard', 
    icon: Home,
  },
  { 
    href: '/admin/users', 
    label: 'Users', 
    icon: Users,
  },
  { 
    href: '/admin/posts', 
    label: 'Posts', 
    icon: Image,
  },
  { 
    href: '/admin/courses', 
    label: 'Courses', 
    icon: BookOpen,
  },
  { 
    href: '/admin/analytics', 
    label: 'Analytics', 
    icon: BarChart3,
  },
  { 
    href: '/admin/reports', 
    label: 'Reports', 
    icon: FileText,
  },
  { 
    href: '/admin/database', 
    label: 'Database', 
    icon: Database,
  },
  { 
    href: '/admin/settings', 
    label: 'Settings', 
    icon: Settings,
  },
]

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 transition-all duration-200 border-r bg-white dark:bg-slate-900',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className={cn(
        'flex items-center border-b h-16 px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-slate-900 dark:bg-slate-800 flex items-center justify-center">
                <span className="text-white font-medium">A</span>
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Admin</h2>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded transition-colors',
                  collapsed ? 'justify-center p-3' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5',
                  collapsed ? '' : 'mr-3'
                )} />
                
                {!collapsed && (
                  <span className="font-medium">
                    {item.label}
                  </span>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Info */}
      {!collapsed && user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-medium">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}