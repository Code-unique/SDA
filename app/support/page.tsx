import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageCircle, FileText } from 'lucide-react'

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Support</h1>
        <p className="text-gray-600">We're here to help</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <Mail className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <CardTitle>Email Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Get help via email</p>
            <Button className="w-full">Contact Us</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <CardTitle>Live Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Chat with our team</p>
            <Button className="w-full">Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <FileText className="w-12 h-12 mx-auto mb-4 text-orange-600" />
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Common questions</p>
            <Button className="w-full">View FAQ</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}