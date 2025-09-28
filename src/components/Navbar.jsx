// src/components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCartIcon, UserGroupIcon, UserIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-green-600 text-white p-2 rounded-lg">
              <UserGroupIcon className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl text-gray-800">GroupBuy</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {currentUser ? (
              <>
                <Link to="/groups" className="text-gray-700 hover:text-green-600 transition">
                  Groups
                </Link>
                <Link to="/products" className="text-gray-700 hover:text-green-600 transition">
                  Products
                </Link>
                <Link to="/orders" className="text-gray-700 hover:text-green-600 transition">
                  Orders
                </Link>
                <Link to="/cart" className="text-gray-700 hover:text-green-600 transition">
                  <ShoppingCartIcon className="h-6 w-6" />
                </Link>
                {userProfile?.role === 'admin' && (
                  <Link to="/admin" className="text-gray-700 hover:text-green-600 transition">
                    Admin
                  </Link>
                )}
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-green-600"
                  >
                    <UserIcon className="h-6 w-6" />
                    <span>{userProfile?.name || 'User'}</span>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2">
                      <Link 
                        to="/profile" 
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-green-600 transition">
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            {currentUser ? (
              <div className="py-2">
                <Link to="/groups" className="block px-4 py-2 text-gray-700">Groups</Link>
                <Link to="/products" className="block px-4 py-2 text-gray-700">Products</Link>
                <Link to="/orders" className="block px-4 py-2 text-gray-700">Orders</Link>
                <Link to="/cart" className="block px-4 py-2 text-gray-700">Cart</Link>
                <Link to="/profile" className="block px-4 py-2 text-gray-700">Profile</Link>
                {userProfile?.role === 'admin' && (
                  <Link to="/admin" className="block px-4 py-2 text-gray-700">Admin</Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-gray-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="py-2">
                <Link to="/login" className="block px-4 py-2 text-gray-700">Login</Link>
                <Link to="/register" className="block px-4 py-2 text-gray-700">Register</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}