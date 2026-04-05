import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';

import Cursor from './components/ui/Cursor';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Cursor />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RedirectToNexus />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RedirectToNexus() {
  window.location.href = '/nexus_site.html';
  return null;
}

export default App;
