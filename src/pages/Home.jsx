// src/pages/Home.jsx - Modern & Beautiful Version
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserGroupIcon, 
  CurrencyRupeeIcon, 
  TruckIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  ChartBarIcon,
  HeartIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const { currentUser } = useAuth();

  const features = [
    {
      icon: CurrencyRupeeIcon,
      title: 'Save 20-40%',
      description: 'Get wholesale prices by buying with neighbors',
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: UserGroupIcon,
      title: 'Build Community',
      description: 'Connect with neighbors and strengthen local bonds',
      color: 'from-blue-500 to-cyan-600'
    },
    {
      icon: TruckIcon,
      title: 'Shared Delivery',
      description: 'Split delivery costs and reduce environmental impact',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Quality Assured',
      description: 'Direct supplier partnerships with quality guarantee',
      color: 'from-orange-500 to-red-600'
    }
  ];

  const benefits = [
    {
      icon: SparklesIcon,
      title: 'Smart Pooling',
      description: 'AI-powered order matching finds you the best group deals'
    },
    {
      icon: ChartBarIcon,
      title: 'Track Savings',
      description: 'Real-time dashboard shows your monthly and yearly savings'
    },
    {
      icon: HeartIcon,
      title: 'Build Relationships',
      description: 'Meet neighbors and create lasting community connections'
    },
    {
      icon: BoltIcon,
      title: 'Fast Delivery',
      description: 'Get your orders delivered within 24-48 hours'
    }
  ];

  const savings = [
    { item: 'Rice (10kg)', retail: '₹850', platform: '₹580', savings: '₹270', percentage: '32%' },
    { item: 'Cooking Oil (5L)', retail: '₹680', platform: '₹490', savings: '₹190', percentage: '28%' },
    { item: 'Monthly Groceries', retail: '₹5,000', platform: '₹3,500', savings: '₹1,500', percentage: '30%' }
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      location: 'Andheri, Mumbai',
      text: 'I save ₹2,000 every month on groceries! Plus, I\'ve made great friends with my neighbors.',
      avatar: 'PS',
      rating: 5
    },
    {
      name: 'Rajesh Kumar',
      location: 'Koramangala, Bangalore',
      text: 'The quality is excellent and delivery is always on time. Best decision for our family budget!',
      avatar: 'RK',
      rating: 5
    },
    {
      name: 'Anita Desai',
      location: 'Banjara Hills, Hyderabad',
      text: 'Finally, a way to buy bulk without wasting or overspending. GroupBuy is a game-changer!',
      avatar: 'AD',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section with Gradient */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-75"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
              <SparklesIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Join 10,000+ Happy Savers</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight animate-fade-in">
              Buy Groceries Together,
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Save More
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-10 opacity-95 leading-relaxed animate-fade-in">
              Join your neighbors to get wholesale prices on everyday essentials.
              <span className="block mt-2 font-semibold">Save ₹18,000 - ₹30,000 annually!</span>
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
              {currentUser ? (
                <Link 
                  to="/groups" 
                  className="group relative px-8 py-4 bg-white text-green-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="relative z-10">Explore Groups</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </Link>
              ) : (
                <>
                  <Link 
                    to="/register" 
                    className="group relative px-8 py-4 bg-white text-green-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
                  >
                    <span className="relative z-10">Start Saving Now</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Link>
                  <Link 
                    to="/login" 
                    className="px-8 py-4 border-2 border-white/40 backdrop-blur-sm text-white rounded-xl font-semibold text-lg hover:bg-white/10 hover:border-white transition-all duration-300"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
            
            {/* Social Proof */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white"></div>
                  ))}
                </div>
                <span>10,000+ Members</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span>₹5Cr+ Saved</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-auto">
            <path fill="#ffffff" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Features Grid - Modern Cards */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose GroupBuy?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the future of community shopping with our innovative platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Savings Calculator - Interactive */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Real Savings Examples
            </h2>
            <p className="text-xl text-gray-600">
              See how much you can save on everyday items
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                  <tr>
                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Product</th>
                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Retail Price</th>
                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">GroupBuy Price</th>
                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">You Save</th>
                    <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Discount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-green-100">
                  {savings.map((row, index) => (
                    <tr key={index} className="hover:bg-green-50 transition-colors">
                      <td className="px-6 py-5 font-semibold text-gray-900">{row.item}</td>
                      <td className="px-6 py-5 text-red-600 line-through font-medium">{row.retail}</td>
                      <td className="px-6 py-5 text-green-600 font-bold text-lg">{row.platform}</td>
                      <td className="px-6 py-5 font-bold text-green-700 text-lg">{row.savings}</td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                          {row.percentage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Annual Savings Highlight */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-center">
              <p className="text-white text-2xl font-bold mb-2">
                💰 Annual Family Savings: ₹18,000 - ₹30,000
              </p>
              <p className="text-green-100">
                Based on average monthly grocery spending of ₹5,000
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Benefits */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              More Than Just Savings
            </h2>
            <p className="text-xl text-gray-600">
              Discover all the benefits of community buying
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4 shadow-lg">
                  <benefit.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by Communities
            </h2>
            <p className="text-xl text-gray-600">
              Hear from our happy members across India
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 shadow-lg">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Saving?
          </h2>
          <p className="text-xl md:text-2xl mb-10 opacity-95">
            Join thousands of families already saving money together
          </p>
          {!currentUser && (
            <Link 
              to="/register" 
              className="inline-block px-10 py-5 bg-white text-green-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Get Started Free →
            </Link>
          )}
          
          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-green-100">Active Members</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-green-100">Local Groups</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">₹5Cr+</div>
              <div className="text-green-100">Money Saved</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}