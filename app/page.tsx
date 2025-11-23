//app/page.tsx
'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Users, BookOpen, Bot, ArrowRight, Star, TrendingUp, Heart, MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import FeaturedPostCard from '@/components/FeaturedPostCard'

interface Stats {
  totalUsers: number
  totalCourses: number
  totalPosts: number
  satisfactionRate: number
}

// In app/page.tsx
interface FeaturedPost {
  _id: string
  caption: string
  author: {
    _id: string
    firstName: string
    lastName: string
    avatar: string
    username: string
  }
  likes: number
  comments: number
  hashtags: string[]
  media: Array<{ url: string; type?: string }>
  createdAt: string
  // Add the missing properties
  saves: string[] | number // Add this
  updatedAt: string // Add this
  // You might also need these based on the FeaturedPostCard requirements
  isFeatured?: boolean
  featuredAt?: string
  featuredBy?: string
  featuredOrder?: number
}


// In app/page.tsx
interface FeaturedPostCardProps {
  _id: string
  caption: string
  author: {
    _id: string
    firstName: string
    lastName: string
    avatar: string
    username: string
  }
  likes: number
  comments: number
  hashtags: string[]
  media: Array<{ url: string; type?: string }>
  createdAt: string
  // Only add what's actually used by FeaturedPostCard
  saves?: string[] | number
  updatedAt?: string
}


export default function Home() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCourses: 0,
    totalPosts: 0,
    satisfactionRate: 98
  })
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHomeData()
  }, [])

  const fetchHomeData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsResponse, postsResponse] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/posts/featured?limit=3')
      ])

      if (!statsResponse.ok) throw new Error('Failed to fetch stats')
      if (!postsResponse.ok) throw new Error('Failed to fetch featured posts')

      const statsData = await statsResponse.json()
      const postsData = await postsResponse.json()

      setStats(statsData)
      // Transform the posts data to match our interface
      // In your fetchHomeData function, update the transformation:
const transformedPosts = (postsData.posts || []).map((post: any) => ({
  _id: post._id,
  caption: post.caption || '',
  author: {
    _id: post.author?._id || 'unknown',
    firstName: post.author?.firstName || 'Unknown',
    lastName: post.author?.lastName || 'User',
    avatar: post.author?.avatar || '',
    username: post.author?.username || 'unknown'
  },
  likes: Array.isArray(post.likes) ? post.likes.length : post.likes || 0,
  comments: Array.isArray(post.comments) ? post.comments.length : post.comments || 0,
  media: Array.isArray(post.media) ? post.media : [],
  createdAt: post.createdAt || new Date().toISOString(),
  // Add missing properties with defaults
  saves: post.saves || [],
  updatedAt: post.updatedAt || new Date().toISOString(),
  hashtags: post.hashtags || [],
  // Add other optional properties
  isFeatured: post.isFeatured || true,
  featuredAt: post.featuredAt || new Date().toISOString(),
  featuredBy: post.featuredBy || 'system',
  featuredOrder: post.featuredOrder || 0
}))
      setFeaturedPosts(transformedPosts)
    } catch (err) {
      console.error('Error fetching home data:', err)
      setError('Failed to load data. Please try again later.')
      // Set fallback data
      setStats({
        totalUsers: 1250,
        totalCourses: 45,
        totalPosts: 8900,
        satisfactionRate: 98
      })
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: Users,
      title: 'Social Network',
      description: 'Share your designs, get feedback, and connect with fashion enthusiasts worldwide.',
      color: 'from-blue-500 to-cyan-500',
      href: '/community'
    },
    {
      icon: BookOpen,
      title: 'Learning Platform',
      description: 'Master fashion design with courses from industry experts and build your skills.',
      color: 'from-purple-500 to-pink-500',
      href: '/courses'
    },
    {
      icon: Bot,
      title: 'AI Fashion Coach',
      description: 'Get personalized advice and insights powered by advanced AI technology.',
      color: 'from-green-500 to-emerald-500',
      href: '/ai-coach'
    },
  ]

  const statsData = [
    { number: `${stats.totalUsers.toLocaleString()}+`, label: 'Designers' },
    { number: `${stats.totalCourses}+`, label: 'Courses' },
    { number: `${stats.totalPosts.toLocaleString()}+`, label: 'Designs' },
    { number: `${stats.satisfactionRate}%`, label: 'Satisfaction' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-rose-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-rose-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="relative container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 mb-8">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">The Future of Fashion Design</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold mb-6 leading-tight">
                SUTRA
              </h1>

              {/* Subheading */}
              <p className="text-xl md:text-2xl text-slate-200 mb-8 leading-relaxed max-w-3xl mx-auto">
                Where fashion design meets community and education.
                Showcase your creations, learn from masters, and connect with designers worldwide.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link href="/sign-up">
                  <Button size="lg" variant="premium" className="rounded-2xl px-8 py-4 text-lg group">
                    Start Your Journey
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button size="lg" variant="outline" className="rounded-2xl px-8 py-4 text-lg border-white text-black hover:bg-white hover:text-slate-900">
                    Explore Designs
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
                {statsData.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl md:text-3xl font-bold mb-1">{stat.number}</div>
                    <div className="text-slate-300 text-sm">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-12 text-white dark:text-slate-900 fill-current"
          >
            <path d="M1200 120L0 16.48 0 0 1200 0 1200 120z"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                Everything You Need to Succeed in Fashion
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                From learning the basics to building your professional network,
                SUTRA provides all the tools for your fashion design journey.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <Link href={feature.href}>
                  <Card className="rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-full cursor-pointer">
                    <CardContent className="p-8 text-center">
                      <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-serif font-semibold mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Designs Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                Featured Designs
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Discover trending creations from our talented community
              </p>
            </motion.div>
          </div>

          {error ? (
            <div className="text-center py-12">
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-8 max-w-md mx-auto">
                <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-rose-800 dark:text-rose-200 mb-2">
                  Temporary Content
                </h3>
                <p className="text-rose-600 dark:text-rose-300">
                  {error} Showing sample designs.
                </p>
              </div>
            </div>
          ) : featuredPosts.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {featuredPosts.map((post, index) => (
                <FeaturedPostCard key={post._id} post={post as any } index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 max-w-md mx-auto">
                <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  No Featured Designs Yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Be the first to share your fashion creations!
                </p>
              </div>
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/explore">
              <Button variant="outline" className="rounded-2xl px-8 py-4 text-lg">
                View All Designs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
                Start Your Fashion Journey in 3 Steps
              </h2>
            </motion.div>
          </div>

          <div className="max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                description: 'Set up your designer profile, showcase your style, and connect with like-minded creatives.',
                icon: '👤'
              },
              {
                step: '02',
                title: 'Share Your Designs',
                description: 'Upload your fashion creations, get feedback from the community, and build your portfolio.',
                icon: '🎨'
              },
              {
                step: '03',
                title: 'Learn & Grow',
                description: 'Enroll in courses, get AI-powered coaching, and advance your fashion design career.',
                icon: '🚀'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="flex items-start space-x-6 mb-12 last:mb-0"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="text-xl font-serif font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
                Ready to Transform Your Fashion Career?
              </h2>
              <p className="text-xl text-rose-100 mb-8 max-w-2xl mx-auto">
                Join thousands of designers who are already building their legacy on SUTRA.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/sign-up">
                  <Button size="lg" className="rounded-2xl px-8 py-4 text-lg bg-white text-rose-600 hover:bg-slate-100">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button size="lg" variant="outline" className="rounded-2xl px-8 py-4 text-lg border-white text-black hover:bg-white hover:text-rose-600">
                    Explore Community
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center space-x-6 text-rose-100 text-sm">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Always yours — no strings, just style</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Forever in your wardrobe</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}