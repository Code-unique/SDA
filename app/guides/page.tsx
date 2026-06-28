import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
const guides = [
  {
    title: 'Getting Started',
    steps: ['Setup', 'Basic Tools', 'First Project']
  },
  {
    title: 'Advanced Techniques',
    steps: ['Patterns', 'Materials', 'Finishing']
  },
  {
    title: 'Business Guide',
    steps: ['Pricing', 'Marketing', 'Sales']
  }
]

export default function GuidesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Guides</h1>
        <p className="text-gray-600">Comprehensive learning paths</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {guides.map((guide, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{guide.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {guide.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="flex items-center text-gray-600">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {step}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full">
                Start Guide
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}