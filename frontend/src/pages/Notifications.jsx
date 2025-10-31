import React, { useState, useEffect } from 'react'
import { Bell, Mail, MailCheck, RefreshCw, Trash2, Search, X, Clock, Globe, AlertTriangle, Shield } from 'lucide-react'
import axios from 'axios'

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clearLoading, setClearLoading] = useState(false)
  const [checkLoading, setCheckLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [notificationDetails, setNotificationDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/notifications?limit=100')
      setNotifications(response.data.notifications || [])
      setError(null)
    } catch (err) {
      setError('Failed to fetch notifications')
      console.error('Notifications fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckAlerts = async () => {
    try {
      setCheckLoading(true)
      setError(null)
      
      const response = await axios.post('/api/check-alerts')
      
      // Refresh the notifications list
      await fetchNotifications()
      
      const { processed, notifications: newNotifications, groups } = response.data
      
      if (processed === 0) {
        alert('✅ No new alerts to process')
      } else {
        alert(`✅ Processed ${processed} alerts into ${newNotifications} new notifications (${groups} IP groups)`)
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      setError(`❌ Check failed: ${errorMsg}`)
      console.error('Check alerts error:', error)
    } finally {
      setCheckLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL alerts, notifications, and email jobs? This action cannot be undone.')) {
      return
    }

    try {
      setClearLoading(true)
      setError(null)
      
      const response = await axios.post('/api/clear-all')
      
      // Refresh the notifications list
      await fetchNotifications()
      
      alert(`✅ ${response.data.message}`)
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      setError(`❌ Clear failed: ${errorMsg}`)
      console.error('Clear error:', error)
    } finally {
      setClearLoading(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    try {
      setSelectedNotification(notification)
      setDetailsLoading(true)
      
      // Fetch related alerts for this notification
      const response = await axios.get('/api/alerts', {
        params: {
          threat_ip: notification.threat_ip,
          limit: 100
        }
      })
      
      setNotificationDetails({
        ...notification,
        relatedAlerts: response.data.alerts || []
      })
      
    } catch (error) {
      console.error('Failed to fetch notification details:', error)
      setNotificationDetails({
        ...notification,
        relatedAlerts: []
      })
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeSlideOver = () => {
    setSelectedNotification(null)
    setNotificationDetails(null)
  }

  const getEmailStatusBadge = (emailSent) => {
    return emailSent ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <MailCheck className="h-3 w-3 mr-1" />
        Sent
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Mail className="h-3 w-3 mr-1" />
        Pending
      </span>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              Email notifications sent to customers about security threats
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCheckAlerts}
              className="btn btn-primary flex items-center"
              disabled={checkLoading}
            >
              <Search className={`h-4 w-4 mr-2 ${checkLoading ? 'animate-spin' : ''}`} />
              {checkLoading ? 'Checking...' : 'Check for Alerts'}
            </button>
            <button
              onClick={handleClearAll}
              className="btn btn-danger flex items-center"
              disabled={clearLoading}
            >
              <Trash2 className={`h-4 w-4 mr-2 ${clearLoading ? 'animate-spin' : ''}`} />
              {clearLoading ? 'Clearing...' : 'Clear List'}
            </button>
            <button
              onClick={fetchNotifications}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Notifications
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {notifications.length}
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
                <MailCheck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Emails Sent
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {notifications.filter(n => n.email_sent).length}
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
                <Mail className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Emails
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {notifications.filter(n => !n.email_sent).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threat IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alert Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Countries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      First Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <tr 
                      key={notification._id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Shield className="h-5 w-5 text-blue-500" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notification.customer_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {notification.threat_ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {notification.alert_count} alert{notification.alert_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {notification.countries?.join(', ') || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(notification.first_seen).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(notification.last_seen).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEmailStatusBadge(notification.email_sent)}
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
      {notifications.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Slide-over Panel */}
      {selectedNotification && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            {/* Background overlay */}
            <div 
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={closeSlideOver}
            />
            
            {/* Slide-over panel */}
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl">
                  {/* Header */}
                  <div className="px-4 py-6 bg-gray-50 sm:px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">
                        Notification Details
                      </h2>
                      <button
                        onClick={closeSlideOver}
                        className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    {detailsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading details...</span>
                      </div>
                    ) : notificationDetails ? (
                      <div className="px-4 py-6 sm:px-6">
                        {/* Threat IP Section */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                            Threat Information
                          </h3>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <span className="text-sm font-medium text-gray-500">Threat IP:</span>
                                <p className="text-lg font-mono text-red-700">{notificationDetails.threat_ip}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Customer:</span>
                                <p className="text-sm text-gray-900">{notificationDetails.customer_name || 'Unknown'}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Countries:</span>
                                <p className="text-sm text-gray-900">{notificationDetails.countries?.join(', ') || 'Unknown'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                            <Clock className="h-5 w-5 text-blue-500 mr-2" />
                            Timeline
                          </h3>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <span className="text-sm font-medium text-gray-500">First Seen:</span>
                                <p className="text-sm text-gray-900">{new Date(notificationDetails.first_seen).toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Last Seen:</span>
                                <p className="text-sm text-gray-900">{new Date(notificationDetails.last_seen).toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Total Alerts:</span>
                                <p className="text-sm font-semibold text-red-600">{notificationDetails.alert_count}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Email Status Section */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                            <Mail className="h-5 w-5 text-green-500 mr-2" />
                            Email Status
                          </h3>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            {getEmailStatusBadge(notificationDetails.email_sent)}
                          </div>
                        </div>

                        {/* Related Alerts Section */}
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                            <Globe className="h-5 w-5 text-purple-500 mr-2" />
                            Related Alerts ({notificationDetails.relatedAlerts?.length || 0})
                          </h3>
                          <div className="space-y-3">
                            {notificationDetails.relatedAlerts?.length > 0 ? (
                              notificationDetails.relatedAlerts.slice(0, 10).map((alert, index) => (
                                <div key={alert._id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="font-medium text-gray-500">Time:</span>
                                      <p className="text-gray-900">{new Date(alert.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-500">Direction:</span>
                                      <p className="text-gray-900">{alert.direction}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-500">Target IP:</span>
                                      <p className="text-gray-900 font-mono">{alert.target_ip}</p>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-500">Country:</span>
                                      <p className="text-gray-900">{alert.country}</p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 italic">No related alerts found</p>
                            )}
                            {notificationDetails.relatedAlerts?.length > 10 && (
                              <p className="text-xs text-gray-500 text-center">
                                Showing first 10 of {notificationDetails.relatedAlerts.length} alerts
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications
