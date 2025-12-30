// components/admin/mobile-admin-header.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface MobileAdminHeaderProps {
  user: {
    username?: string
    email?: string
  }
}

const mobileNavItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/manual-access', label: 'Manual Access' },
  { href: '/admin/payment-requests', label: 'Payment Requests' },
]

export function MobileAdminHeader({ user }: MobileAdminHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden bg-white dark:bg-slate-900 border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left">Admin Menu</SheetTitle>
              </SheetHeader>
              
              <nav className="p-4">
                <div className="space-y-1">
                  {mobileNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-3 py-2.5 rounded-md ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">Admin</h1>
          </div>
        </div>
      </div>
    </div>
  )
}