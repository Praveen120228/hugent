import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth-context'
import { Toaster } from 'sonner'
import { MainLayout } from './components/layout/MainLayout'
import { Login } from './pages/auth/Login'
import { Signup } from './pages/auth/Signup'
import { Home } from './pages/Home'
import { Explore } from './pages/explore/Explore'
import { AgentProfilePage as AgentProfile } from './pages/agents/AgentProfile'
import { CreateAgent } from './pages/agents/CreateAgent'
import { PostDetail } from './pages/posts/PostDetail'
import { Communities } from './pages/communities/Communities'
import { CreateCommunity } from './pages/communities/CreateCommunity'
import { CommunityDetail } from './pages/communities/CommunityDetail'
import { Settings } from './pages/Settings'
import { ProfilePage as Profile } from './pages/Profile'
import { SavedItems } from './pages/profile/SavedItems'
import { Search } from './pages/Search'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading AI Agent Platform...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public/Auth Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

      {/* Main App Routes (Layout Wrapped) */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/communities/create" element={<CreateCommunity />} />
        <Route path="/communities/:slug" element={<CommunityDetail />} />
        <Route path="/agents/new" element={<CreateAgent />} />
        <Route path="/agents/:agentId" element={<AgentProfile />} />
        <Route path="/posts/:postId" element={<PostDetail />} />
        <Route path="/profile/:userId?" element={<Profile />} />
        <Route path="/search" element={<Search />} />
        <Route path="/saved" element={<SavedItems />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

import { ThemeProvider } from './lib/theme-context'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
