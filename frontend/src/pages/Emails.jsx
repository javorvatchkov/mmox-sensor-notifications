import React, { useState, useEffect } from 'react'
import { Mail, Send, RefreshCw, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react'
import axios from 'axios'

function Emails() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sendLoading, setSendLoading] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)

  useEffect(() => {
    fetchEmails()
    const interval = setInterval(fetchEmails, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/email-jobs')
      setEmails(response.data.emails || [])
      setError(null)
    } catch (err) {
      setError('Failed to fetch emails')
      console.error('Emails fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmails = async () => {
    try {
      setSendLoading(true)
      setError(null)
      
      const response = await axios.post('/api/send-pending-emails')
      
      // Refresh the emails list
      await fetchEmails()
      
      const { processed, sent, failed } = response.data
      
      if (processed === 0) {
        alert('✅ No pending notifications to send')
      } else {
        alert(`✅ Processed ${processed} notifications: ${sent} emails sent, ${failed} failed`)
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      setError(`❌ Send failed: ${errorMsg}`)
      console.error('Send emails error:', error)
    } finally {
      setSendLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL email jobs? This action cannot be undone.')) {
      return
    }

    try {
      setClearLoading(true)
      setError(null)
      
      const response = await axios.post('/api/clear-emails')
      
      // Refresh the emails list
      await fetchEmails()
      
      alert(`✅ ${response.data.message}`)
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      setError(`❌ Clear failed: ${errorMsg}`)
      console.error('Clear error:', error)
    } finally {
      setClearLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </span>
        )
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        )
    }
  }

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[priority] || colors.medium}`}>
        {priority || 'medium'}
      </span>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and send email notifications for security alerts
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSendEmails}
              className="btn btn-primary flex items-center"
              disabled={sendLoading}
            >
              <Send className={`h-4 w-4 mr-2 ${sendLoading ? 'animate-spin' : ''}`} />
              {sendLoading ? 'Sending...' : 'Send Emails'}
            </button>
            <button
              onClick={handleClearAll}
              className="btn btn-danger flex items-center"
              disabled={clearLoading}
            >
              <Trash2 className={`h-4 w-4 mr-2 ${clearLoading ? 'animate-spin' : ''}`} />
              {clearLoading ? 'Clearing...' : 'Clear All'}
            </button>
            <button
              onClick={fetchEmails}
              className="btn btn-secondary flex items-center"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Emails
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {emails.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {emails.filter(e => e.status === 'pending').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Sent
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {emails.filter(e => e.status === 'sent').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Failed
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {emails.filter(e => e.status === 'failed').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">{error}</div>
        </div>
      )}

      {/* Emails Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Email Jobs
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading emails...</span>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No emails</h3>
              <p className="mt-1 text-sm text-gray-500">
                No email jobs found. Send some notifications first.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {emails.map((email) => (
                    <tr key={email._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Mail className="h-5 w-5 text-green-500" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {email.to_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {email.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getPriorityBadge(email.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(email.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(email.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {email.sent_at ? new Date(email.sent_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {emails.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {emails.length} email job{emails.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

export default Emails
