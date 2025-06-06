import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, BarChart3, Users, Settings } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Finance Bot Management System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Streamline your finance requests with our intelligent Telegram bot system
          </p>
          <Button size="lg" onClick={() => window.location.href = '/api/login'}>
            Sign In to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <CardTitle>Telegram Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Users can submit finance requests directly through Telegram with our intelligent bot
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track ticket performance, response times, and team productivity with detailed analytics
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <CardTitle>Team Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Assign tickets to team members and manage user permissions across your organization
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Settings className="h-12 w-12 mx-auto mb-4 text-orange-600" />
              <CardTitle>Custom Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create predefined request templates to standardize and speed up the finance process
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Submit Request</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Users interact with the Telegram bot to submit finance requests using predefined templates
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600 dark:text-green-300">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Process & Track</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Finance team receives notifications and can track, assign, and manage all requests from the dashboard
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Complete & Notify</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Once completed, users receive automatic notifications with results through Telegram
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}