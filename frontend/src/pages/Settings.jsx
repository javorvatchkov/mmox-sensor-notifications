import React, { useState } from 'react'
import { Settings as SettingsIcon, TestTube, Database } from 'lucide-react'
import axios from 'axios'

function Settings() {
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage('❌ Please enter an email address')
      return
    }

    try {
      setTestEmailLoading(true)
      setMessage('')
      
      const response = await axios.post('http://localhost:3004/api/test-email', {
        to: testEmail,
        subject: 'MMOX Test Email',
        body: 'This is a test email from the MMOX Sensor Notifications system. If you receive this, the email service is working correctly.'
      })
      
      if (response.data.success) {
        setMessage(`✅ Test email sent successfully to ${testEmail}`)
      } else {
        setMessage(`❌ Test email failed: ${response.data.message}`)
      }
    } catch (error) {
      setMessage(`❌ Test email failed: ${error.response?.data?.error || error.message}`)
    } finally {
      setTestEmailLoading(false)
    }
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          System configuration and testing tools
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.startsWith('✅') 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">

        {/* Email Testing */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <SettingsIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Email Testing
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Send a test email to verify the email service is configured correctly.
            </p>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label htmlFor="test-email" className="block text-sm font-medium text-gray-700">
                  Test email address
                </label>
                <input
                  type="email"
                  id="test-email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              
              <div className="pt-6">
                <button
                  onClick={handleTestEmail}
                  disabled={testEmailLoading || !testEmail}
                  className="btn btn-primary flex items-center"
                >
                  <SettingsIcon className={`h-4 w-4 mr-2 ${testEmailLoading ? 'animate-spin' : ''}`} />
                  {testEmailLoading ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                System Information
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Service Endpoints</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Sensor Monitor: http://localhost:3001</div>
                  <div>Notification Service: http://localhost:3002</div>
                  <div>Email Producer: http://localhost:3003</div>
                  <div>Email Listener: http://localhost:3004</div>
                  <div>Frontend Dashboard: http://localhost:3000</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <a
                    href="http://localhost:3001/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:text-primary-500"
                  >
                    Check Sensor Monitor Health →
                  </a>
                  <a
                    href="http://localhost:3002/api/stats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:text-primary-500"
                  >
                    View System Statistics →
                  </a>
                  <a
                    href="http://localhost:3003/api/stats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:text-primary-500"
                  >
                    Check Email Producer Status →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Notes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Configuration Notes</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>• Make sure PostgreSQL and Redis are running before starting services</p>
            <p>• Configure SMTP settings in .env files for email functionality</p>
            <p>• Use the simulation feature to generate test data for development</p>
            <p>• Check service health endpoints if you encounter issues</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
