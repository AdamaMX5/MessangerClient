import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import AuthView from './views/AuthView'
import ChatView from './views/ChatView'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp()
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { currentUser } = useApp()
  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <AuthView />} />
      <Route path="/" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function VersionBadge() {
  return (
    <span className="fixed bottom-1 right-2 text-[10px] text-discord-muted/60 select-none pointer-events-none z-50">
      {__GIT_HASH__}
    </span>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <VersionBadge />
    </AppProvider>
  )
}
