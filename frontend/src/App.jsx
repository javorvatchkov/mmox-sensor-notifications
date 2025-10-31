import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Alerts from './pages/Alerts'
import Notifications from './pages/Notifications'
import Emails from './pages/Emails'
import Settings from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Alerts />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/emails" element={<Emails />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
