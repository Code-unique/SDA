import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, User } from 'lucide-react'

const posts = [
  {
    title: 'Sustainable Fashion Trends',
    excerpt: 'Latest trends in eco-friendly fashion design',
    author: 'Jane Doe',
    date: '2024-01-15'
  },
  {
    title: 'Color Theory Basics',
    excerpt: 'Understanding color in fashion design',
    author: 'John Smith',
    date: '2024-01-10'
  },
  {
    title: 'Digital Design Tools',
    excerpt: 'Modern tools for fashion designers',
    author: 'Sarah Chen',
    date: '2024-01-05'
  }
]

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Blog</h1>
        <p className="text-gray-600">Latest articles and insights</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {posts.map((post, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{post.excerpt}</p>
              <div className="flex items-center text-sm text-gray-500">
                <User className="w-4 h-4 mr-1" />
                {post.author}
                <Calendar className="w-4 h-4 ml-4 mr-1" />
                {post.date}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}