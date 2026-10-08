import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { Home } from './components/Home'

export default function App() {
  const [view, setView] = useState<'home' | 'dashboard'>('home')

  if (view === 'dashboard') {
    return <Dashboard onBack={() => setView('home')} />
  }
  return <Home onOpenDashboard={() => setView('dashboard')} />
}
