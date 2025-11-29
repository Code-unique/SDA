import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlayCircle, Clock } from 'lucide-react'

const tutorials = [
  {
    title: 'Basic Sketching',
    duration: '30 min',
    level: 'Beginner'
  },
  {
    title: 'Pattern Making',
    duration: '45 min',
    level: 'Intermediate'
  },
  {
    title: 'Digital Design',
    duration: '60 min',
    level: 'Advanced'
  }
]

export default function TutorialsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Tutorials</h1>
        <p className="text-gray-600">Step-by-step learning guides</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {tutorials.map((tutorial, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{tutorial.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {tutorial.duration}
                </div>
                <span>{tutorial.level}</span>
              </div>
              <Button className="w-full">
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Tutorial
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}