import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Messages from './pages/Messages';
import Admin from './pages/Admin';
import Archive from './pages/Archive';
import Settings from './pages/Settings';
import EditProfile from './pages/EditProfile';
import UserProfile from './pages/UserProfile';
import TheWall from './pages/TheWall';
import Support from './pages/Support';



// Components
import Sidebar from './components/Sidebar';
import PublicRoute from './components/PublicRoute';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Toaster 
        position="bottom-right" 
        containerStyle={{
          bottom: 40,
          right: 40,
        }}
        toastOptions={{
          className: 'premium-toast',
          duration: 4000,
          style: {
            padding: '16px 24px',
            borderRadius: '16px',
            background: '#ffffff',
            color: '#000000',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)',
            fontSize: '14px',
            fontWeight: '500'
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/admin" element={<Admin />} />
        
        {/* Dashboard Routes with Sidebar */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#fdfdfb] dark:bg-[#181818] relative">
              {/* Global Grain Overlay for Dark Mode */}
              <div className="pointer-events-none fixed inset-0 z-[9999] opacity-0 dark:opacity-[0.04] mix-blend-overlay"
                   style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
              />
              <Sidebar />
              <main className="min-w-0">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/batchmates" element={<Home />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:recipientId" element={<Messages />} />
                  <Route path="/archive" element={<Archive />} />
                   <Route path="/settings" element={<Settings />} />
                   <Route path="/edit-profile" element={<EditProfile />} />
                   <Route path="/profile/:userId" element={<UserProfile />} />
                   <Route path="/the-wall" element={<TheWall />} />
                   <Route path="/support" element={<Support />} />

                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
