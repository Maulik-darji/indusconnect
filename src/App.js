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

// Components
import Sidebar from './components/Sidebar';
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
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/admin" element={<Admin />} />
        
        {/* Dashboard Routes with Sidebar */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#fdfdfb] dark:bg-[#050505]">
              <Sidebar />
              <main className="min-w-0">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/batchmates" element={<Home />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:recipientId" element={<Messages />} />
                  <Route path="/archive" element={<Archive />} />
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
