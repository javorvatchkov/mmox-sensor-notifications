import React, { useState, useEffect } from 'react'
import { Shield, Filter, RefreshCw, Trash2, Zap, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clearLoading, setClearLoading] = useState(false)
  const [generateLoading, setGenerateLoading] = useState(false)
  const [alertCount, setAlertCount] = useState(5)
  const [filters, setFilters] = useState({
    direction: '',
    country: '',
    limit: 50
  })

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      
      const response = await axios.get(`${API_ENDPOINTS.ALERTS}?${params}`)
      setAlerts(response.data.alerts || [])
      setError(null)
    } catch (err) {
      setError('Failed to fetch alerts')
      console.error('Alerts fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleGenerateAlerts = async () => {
    try {
      setGenerateLoading(true)
      setError(null)
      
      const response = await axios.post(API_ENDPOINTS.SIMULATE_ALERTS, {
        count: alertCount
      })
      
      // Refresh the alerts list
      await fetchAlerts()
      
      alert(`✅ Generated ${alertCount} alerts successfully!`)
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      setError(`❌ Generate failed: ${errorMsg}`)
      console.error('Generate error:', error)
    } finally {
      setGenerateLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL alerts, notifications, and email jobs? This action cannot be undone.')) {
      return
    }

    try {
      setClearLoading(true)
      setError(null)
      
      const response = await axios.post(API_ENDPOINTS.CLEAR_ALL)
      
      // Refresh the alerts list
      await fetchAlerts()
      
      alert(`✅ ${response.data.message}`)
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message
      setError(`❌ Clear failed: ${errorMsg}`)
      console.error('Clear error:', error)
    } finally {
      setClearLoading(false)
    }
  }

  const getDirectionBadge = (direction) => {
    const isOutbound = direction === 'OUTBOUND'
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isOutbound ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {direction}
      </span>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Alerts</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor and analyze security threats detected by sensors
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="20"
                value={alertCount}
                onChange={(e) => setAlertCount(parseInt(e.target.value) || 5)}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5"
              />
              <button
                onClick={handleGenerateAlerts}
                className="btn btn-success flex items-center"
                disabled={generateLoading}
              >
                <Zap className={`h-4 w-4 mr-2 ${generateLoading ? 'animate-spin' : ''}`} />
                {generateLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <button
              onClick={handleClearAll}
              className="btn btn-danger flex items-center"
              disabled={clearLoading}
            >
              <Trash2 className={`h-4 w-4 mr-2 ${clearLoading ? 'animate-spin' : ''}`} />
              {clearLoading ? 'Clearing...' : 'Clear List'}
            </button>
            <button
              onClick={fetchAlerts}
              className="btn btn-secondary flex items-center"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex space-x-4">
              <select
                value={filters.direction}
                onChange={(e) => handleFilterChange('direction', e.target.value)}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Directions</option>
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
              </select>
              
              <input
                type="text"
                placeholder="Country (e.g., US, FR)"
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value={25}>25 results</option>
                <option value={50}>50 results</option>
                <option value={100}>100 results</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{error}</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No alerts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Threat IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target IP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Protocol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getDirectionBadge(alert.direction)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {alert.threat_ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {alert.target_ip}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {alert.country || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.protocol?.toUpperCase() || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {alert.customer_name || 'Unassigned'}
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
      {alerts.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

export default Alerts
