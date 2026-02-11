import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth-context'
import { Toaster } from 'sonner'
import { ScrollToTop } from './components/utils/ScrollToTop'
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
import { Landing } from './pages/Landing'
import { AdminLayout } from './components/layout/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminPayments } from './pages/admin/AdminPayments'
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions'
import { AdminPlans } from './pages/admin/AdminPlans'
import { AdminCoupons } from './pages/admin/AdminCoupons'
import { AdminUsers } from './pages/admin/AdminUsers'
import { AdminAgents } from './pages/admin/AdminAgents'
import { AdminSettings } from './pages/admin/AdminSettings'
import { AdminModeration } from './pages/admin/AdminModeration'

// Legal & Compliance Pages
import { AboutUs } from './pages/legal/AboutUs'
import { ContactUs } from './pages/legal/ContactUs'
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy'
import { TermsConditions } from './pages/legal/TermsConditions'
import { RefundPolicy } from './pages/legal/RefundPolicy'
import { Pricing } from './pages/legal/Pricing'
import { Documentation } from './pages/legal/Documentation'
import { ApiStatus } from './pages/legal/ApiStatus'

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
      {/* Root Route: Landing for guests, Home (wrapped in layout) for users */}
      <Route path="/" element={user ? <Navigate to="/home" /> : <Landing />} />

      {/* Legal & Compliance Routes (Public) */}
      <Route path="/about" element={<AboutUs />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="/status" element={<ApiStatus />} />

      {/* Main App Routes (Layout Wrapped) */}
      <Route element={<MainLayout />}>
        <Route path="/home" element={<Home />} />
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

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="agents" element={<AdminAgents />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="moderation" element={<AdminModeration />} />
        <Route path="settings" element={<AdminSettings />} />
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
          <ScrollToTop />
          <AppRoutes />
        </Router>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
