// src/pages/Home.jsx - Enhanced Landing Page
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserGroupIcon, 
  ShoppingBagIcon, 
  CurrencyRupeeIcon,
  TruckIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const { currentUser } = useAuth();

  const features = [
    {
      icon: CurrencyRupeeIcon,
      title: 'Save 20-40%',
      description: 'Get wholesale prices by buying together with your neighbors',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: UserGroupIcon,
      title: 'Hyperlocal Groups',
      description: 'Join area-based groups and shop with people nearby',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: ShoppingBagIcon,
      title: 'Quality Products',
      description: 'Rice, oil, groceries, and household items at bulk rates',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: TruckIcon,
      title: 'Easy Collection',
      description: 'Collect from local hub or get home delivery',
      color: 'from-orange-500 to-red-600'
    }
  ];

  const stats = [
    { label: 'Active Members', value: '10,000+', icon: UserGroupIcon },
    { label: 'Groups', value: '500+', icon: UserGroupIcon },
    { label: 'Orders Delivered', value: '50,000+', icon: TruckIcon },
    { label: 'Total Savings', value: '₹5 Cr+', icon: CurrencyRupeeIcon }
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Join a Local Group',
      description: 'Find and join groups in your area based on your pincode',
      icon: UserGroupIcon
    },
    {
      step: '2',
      title: 'Browse & Add to Cart',
      description: 'Choose products and quantities you need',
      icon: ShoppingBagIcon
    },
    {
      step: '3',
      title: 'Group Reaches Minimum',
      description: 'When enough people order, everyone gets the discount',
      icon: SparklesIcon
    },
    {
      step: '4',
      title: 'Pay & Collect',
      description: 'Make payment and collect from your local hub',
      icon: CheckBadgeIcon
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <SparklesIcon className="h-4 w-4" />
              <span>India's #1 Community Group Buying Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight animate-slide-up">
              Save Money by
              <span className="block mt-2 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent">
                Buying Together
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto animate-slide-up animation-delay-200">
              Join your neighbors to buy groceries and household items at wholesale prices. 
              Save 20-40% on every order!
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animation-delay-400">
              {currentUser ? (
                <>
                  <Link
                    to="/groups"
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-green-500/50 transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span>Browse Groups</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/products"
                    className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-xl font-bold text-lg hover:border-green-600 hover:text-green-600 transform hover:-translate-y-1 transition-all duration-200"
                  >
                    View Products
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-green-500/50 transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span>Get Started Free</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-xl font-bold text-lg hover:border-green-600 hover:text-green-600 transform hover:-translate-y-1 transition-all duration-200"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                <span>100% Secure Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                <span>Quality Guaranteed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckBadgeIcon className="h-5 w-5 text-green-600" />
                <span>Free to Join</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl mb-3">
                  <stat.icon className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Choose GroupBuy?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              The smartest way to shop for everyday essentials
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Start saving in 4 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector Line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-green-300 to-transparent"></div>
                )}

                <div className="text-center">
                  {/* Step Number */}
                  <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">{step.step}</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-lg mb-4 border-2 border-green-100">
                    <step.icon className="h-6 w-6 text-green-600" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-emerald-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Start Saving?
          </h2>
          <p className="text-xl text-green-100 mb-10">
            Join thousands of families already saving money every month
          </p>
          {!currentUser && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-green-600 rounded-xl font-bold text-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
            >
              <span>Create Free Account</span>
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Inline Styles for Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}