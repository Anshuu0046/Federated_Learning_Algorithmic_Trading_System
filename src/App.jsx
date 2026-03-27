import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';

import Cursor from './components/ui/Cursor';

function App() {
  return (
    <ThemeProvider>
      <Cursor />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RedirectToNexus />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

function RedirectToNexus() {
  window.location.href = '/nexus_site.html';
  return null;
}

export default App;
