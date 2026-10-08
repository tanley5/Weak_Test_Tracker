import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { DomainManager } from './components/DomainManager'
import { Home } from './components/Home'

type View = 'home' | 'dashboard' | 'domains'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [examPart, setExamPart] = useState(1)

  if (view === 'dashboard') {
    return <Dashboard onBack={() => setView('home')} />
  }
  if (view === 'domains') {
    return <DomainManager examPart={examPart} onBack={() => setView('home')} />
  }
  return (
    <Home
      onOpenDashboard={() => setView('dashboard')}
      onOpenDomains={(part) => {
        setExamPart(part)
        setView('domains')
      }}
    />
  )
}
