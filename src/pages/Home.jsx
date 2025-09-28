// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserGroupIcon, CurrencyRupeeIcon, TruckIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const { currentUser } = useAuth();

  const features = [
    {
      icon: CurrencyRupeeIcon,
      title: 'Save 20-40%',
      description: 'Get wholesale prices by buying with neighbors'
    },
    {
      icon: UserGroupIcon,
      title: 'Build Community',
      description: 'Connect with neighbors and strengthen local bonds'
    },
    {
      icon: TruckIcon,
      title: 'Shared Delivery',
      description: 'Split delivery costs and reduce environmental impact'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Quality Assured',
      description: 'Direct supplier partnerships with quality guarantee'
    }
  ];

  const savings = [
    { item: 'Rice (10kg)', retail: '₹800-900', platform: '₹550-600', savings: '₹250-300' },
    { item: 'Cooking Oil (5L)', retail: '₹650-750', platform: '₹480-550', savings: '₹170-200' },
    { item: 'Monthly Groceries', retail: '₹5,000', platform: '₹3,700', savings: '₹1,300' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Buy Groceries Together,<br />Save More
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Join your neighbors to get wholesale prices on everyday essentials
          </p>
          <div className="space-x-4">
            {currentUser ? (
              <Link 
                to="/groups" 
                className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Find Groups
              </Link>
            ) : (
              <>
                <Link 
                  to="/register" 
                  className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Get Started
                </Link>
                <Link 
                  to="/login" 
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose GroupBuy?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Savings Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Real Savings Examples</h2>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Product</th>
                  <th className="px-6 py-4 text-left">Retail Price</th>
                  <th className="px-6 py-4 text-left">GroupBuy Price</th>
                  <th className="px-6 py-4 text-left">You Save</th>
                </tr>
              </thead>
              <tbody>
                {savings.map((row, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-6 py-4 font-medium">{row.item}</td>
                    <td className="px-6 py-4 text-red-600">{row.retail}</td>
                    <td className="px-6 py-4 text-green-600">{row.platform}</td>
                    <td className="px-6 py-4 font-bold text-green-700">{row.savings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-8">
            <p className="text-lg font-semibold text-green-700">
              Annual Family Savings: ₹18,000 - ₹30,000
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Saving?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of families already saving money together
          </p>
          {!currentUser && (
            <Link 
              to="/register" 
              className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Sign Up Now
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}