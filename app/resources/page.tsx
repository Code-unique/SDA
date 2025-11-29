import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, Video, BookOpen } from 'lucide-react'

const resources = [
  {
    title: 'Fashion Design Guide',
    type: 'PDF',
    icon: FileText,
    description: 'Basic principles and techniques'
  },
  {
    title: 'Pattern Making Tutorial',
    type: 'Video',
    icon: Video,
    description: 'Step-by-step video guide'
  },
  {
    title: 'Color Theory eBook',
    type: 'eBook',
    icon: BookOpen,
    description: 'Complete color guide'
  }
]

export default function ResourcesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Resources</h1>
        <p className="text-gray-600">Download free learning materials</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {resources.map((resource, index) => (
          <Card key={index} className="text-center">
            <CardHeader>
              <resource.icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <CardTitle className="text-lg">{resource.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{resource.description}</p>
              <Button className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download {resource.type}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}