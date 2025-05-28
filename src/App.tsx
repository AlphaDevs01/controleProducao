import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import RoutesPage from './pages/RoutesPage';
import InventoryPage from './pages/InventoryPage';
import ProductionPage from './pages/ProductionPage';
import UserRegisterPage from './pages/UserRegisterPage'; // ou AdminUserRegisterPage
import Navbar from './components/Navbar';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <ToastContainer position="top-right" autoClose={3000} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* UserRegisterPage is only accessible in development */}
            {import.meta.env.DEV && (
              <Route path="/register\" element={<UserRegisterPage />} />
            )}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Navbar />
                    <div className="flex-1 overflow-y-auto">
                      <DashboardPage />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Navbar />
                    <div className="flex-1 overflow-y-auto">
                      <ProductsPage />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/routes"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Navbar />
                    <div className="flex-1 overflow-y-auto">
                      <RoutesPage />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Navbar />
                    <div className="flex-1 overflow-y-auto">
                      <InventoryPage />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/production"
              element={
                <ProtectedRoute>
                  <div className="flex h-screen overflow-hidden">
                    <Navbar />
                    <div className="flex-1 overflow-y-auto">
                      <ProductionPage />
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-register"
              element={
                <ProtectedRoute>
                  <UserRegisterPage /> {/* ou <AdminUserRegisterPage /> */}
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/\" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;