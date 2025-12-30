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
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Key,
  CreditCard,
  Package,
  ShoppingBag
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
    href: '/admin/products', 
    label: 'Products', 
    icon: Package,
  },
  { 
    href: '/admin/orders', 
    label: 'Orders', 
    icon: ShoppingBag,
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
    href: '/admin/manual-access', 
    label: 'Manual Access', 
    icon: Key,
  },
  { 
    href: '/admin/payment-requests', 
    label: 'Payment Requests', 
    icon: CreditCard,
  },
]

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
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
        'flex flex-col h-screen transition-all duration-300 border-r bg-white/95 backdrop-blur-sm dark:bg-slate-900/95 shadow-lg',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className={cn(
        'flex items-center border-b h-16 px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed ? (
          <>
            <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">Admin</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dashboard</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Link href="/admin" className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md hover:opacity-80 transition-opacity">
              <span className="text-white font-bold text-lg">A</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setCollapsed(!collapsed)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg transition-all group relative',
                  collapsed ? 'justify-center p-3' : 'px-3 py-3',
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30 shadow-sm'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <div className="relative">
                  <Icon className={cn(
                    'h-5 w-5 transition-transform group-hover:scale-110',
                    isActive ? 'text-blue-600 dark:text-blue-400' : '',
                    collapsed ? '' : 'mr-3'
                  )} />
                  {/* Active indicator dot for collapsed state */}
                  {collapsed && isActive && (
                    <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-slate-900"></div>
                  )}
                </div>
                
                {!collapsed && (
                  <span className={cn(
                    "font-medium transition-all",
                    isActive ? 'font-semibold' : ''
                  )}>
                    {item.label}
                  </span>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 dark:bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-slate-700">
                    {item.label}
                    <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45"></div>
                  </div>
                )}
                
                {/* Notification badge for some items */}
                {!collapsed && (item.href === '/admin/orders' || item.href === '/admin/payment-requests') && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    0
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Info */}
      {!collapsed && user && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white font-bold shadow-md">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                {user?.username || 'Admin'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || 'admin@example.com'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {collapsed && user && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center text-white font-bold shadow-md">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
        </div>
      )}
    </aside>
  )
}