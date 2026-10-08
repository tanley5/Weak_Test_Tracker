import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { DomainManager } from './components/DomainManager'
import { ExamPartManager } from './components/ExamPartManager'
import { Home } from './components/Home'

type View = 'home' | 'dashboard' | 'domains' | 'exam-parts'

export default function App() {
  const [view, setView] = useState<View>('home')
  const [examPart, setExamPart] = useState(1)
  const [examPartName, setExamPartName] = useState('Part 1')

  if (view === 'dashboard') {
    return <Dashboard onBack={() => setView('home')} />
  }
  if (view === 'domains') {
    return (
      <DomainManager
        examPart={examPart}
        examPartName={examPartName}
        onBack={() => setView('home')}
      />
    )
  }
  if (view === 'exam-parts') {
    return <ExamPartManager onBack={() => setView('home')} />
  }
  return (
    <Home
      onOpenDashboard={() => setView('dashboard')}
      onOpenDomains={(part, name) => {
        setExamPart(part)
        setExamPartName(name)
        setView('domains')
      }}
      onOpenExamParts={() => setView('exam-parts')}
    />
  )
}
