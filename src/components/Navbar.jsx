// src/components/Navbar.jsx - Updated with Cart Count & Mobile Responsive
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { 
  ShoppingCartIcon, 
  UserGroupIcon, 
  UserIcon, 
  Bars3Icon, 
  XMarkIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => location.pathname === path;
  const cartCount = getCartCount();

  const navLinks = [
    { to: '/groups', label: 'Groups', icon: UserGroupIcon },
    { to: '/products', label: 'Products', icon: SparklesIcon },
    { to: '/orders', label: 'Orders', icon: ShoppingCartIcon }
  ];

  return (
    <>
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-lg' 
          : 'bg-white shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-1.5 sm:space-x-2 group">
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="font-bold text-base sm:text-xl bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
                GroupBuy
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {currentUser ? (
                <>
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm lg:text-base ${
                        isActive(link.to)
                          ? 'bg-green-50 text-green-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
                      }`}
                    >
                      <link.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  
                  {/* Cart Button with Badge */}
                  <Link
                    to="/cart"
                    className={`relative p-2 rounded-lg transition-all duration-200 ${
                      isActive('/cart')
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'
                    }`}
                  >
                    <ShoppingCartIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center font-bold">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {/* Admin Link */}
                  {userProfile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm lg:text-base ${
                        isActive('/admin')
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-purple-600'
                      }`}
                    >
                      <Cog6ToothIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                      <span>Admin</span>
                    </Link>
                  )}

                  {/* User Menu */}
                  <div className="relative ml-3">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                    >
                      <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-white font-bold text-xs lg:text-sm">
                        {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-gray-700 max-w-20 lg:max-w-24 truncate text-sm lg:text-base hidden lg:block">
                        {userProfile?.name || 'User'}
                      </span>
                    </button>
                    
                    {isMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsMenuOpen(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-48 lg:w-56 bg-white rounded-xl shadow-2xl py-2 z-20 border border-gray-100">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-900">
                              {userProfile?.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {userProfile?.email}
                            </p>
                          </div>
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors text-sm"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <UserIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                            <span className="font-medium">My Profile</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-sm"
                          >
                            <ArrowRightOnRectangleIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                            <span className="font-medium">Logout</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 lg:px-4 py-2 text-gray-700 font-medium hover:text-green-600 transition-colors text-sm lg:text-base"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-sm lg:text-base"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6 text-gray-700" />
              ) : (
                <Bars3Icon className="h-6 w-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 animate-fade-in">
              {currentUser ? (
                <div className="space-y-1">
                  {/* User Info */}
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-white font-bold">
                        {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{userProfile?.name}</p>
                        <p className="text-xs text-gray-500">{userProfile?.email}</p>
                      </div>
                    </div>
                  </div>

                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                        isActive(link.to)
                          ? 'bg-green-50 text-green-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  ))}

                  <Link
                    to="/cart"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                      isActive('/cart')
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCartIcon className="h-5 w-5" />
                    <span>Cart</span>
                    {cartCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                      isActive('/profile')
                        ? 'bg-green-50 text-green-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserIcon className="h-5 w-5" />
                    <span>Profile</span>
                  </Link>

                  {userProfile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-sm ${
                        isActive('/admin')
                          ? 'bg-purple-50 text-purple-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                      <span>Admin</span>
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center font-semibold rounded-lg hover:shadow-lg transition-all text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      
      {/* Spacer */}
      <div className="h-14 sm:h-16"></div>
    </>
  );
}