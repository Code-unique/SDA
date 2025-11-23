// components/layout/footer.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Twitter, Instagram, Youtube } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-2xl font-serif font-bold text-white">SUTRA</span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              The premier platform for fashion designers to connect, learn, and showcase their creativity.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <Youtube className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="font-serif font-semibold text-white">Platform</h3>
            <div className="space-y-2 text-sm">
              <Link href="/explore" className="block hover:text-white transition-colors">Explore</Link>
              <Link href="/courses" className="block hover:text-white transition-colors">Courses</Link>
              <Link href="/ai-coach" className="block hover:text-white transition-colors">AI Coach</Link>
              <Link href="/community" className="block hover:text-white transition-colors">Community</Link>
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-serif font-semibold text-white">Resources</h3>
            <div className="space-y-2 text-sm">
              <Link href="/blog" className="block hover:text-white transition-colors">Blog</Link>
              <Link href="/tutorials" className="block hover:text-white transition-colors">Tutorials</Link>
              <Link href="/guides" className="block hover:text-white transition-colors">Guides</Link>
              <Link href="/support" className="block hover:text-white transition-colors">Support</Link>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="font-serif font-semibold text-white">Company</h3>
            <div className="space-y-2 text-sm">
              <Link href="/about" className="block hover:text-white transition-colors">About</Link>
              <Link href="/careers" className="block hover:text-white transition-colors">Careers</Link>
              <Link href="/contact" className="block hover:text-white transition-colors">Contact</Link>
              <Link href="/privacy" className="block hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-400">
            © 2024 SUTRA. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 text-sm text-slate-400">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}