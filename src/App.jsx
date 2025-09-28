// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { userProfile } = useAuth();
  return userProfile?.role === 'admin' ? children : <Navigate to="/" />;
}

function AppContent() {
  const { currentUser, userProfile } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route 
            path="/login" 
            element={currentUser ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={currentUser ? <Navigate to="/" /> : <Register />} 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/groups" 
            element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/groups/:groupId" 
            element={
              <ProtectedRoute>
                <GroupDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;