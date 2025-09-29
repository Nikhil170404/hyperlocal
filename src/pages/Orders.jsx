// src/pages/Orders.jsx - FIXED & MOBILE RESPONSIVE
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { 
  ShoppingBagIcon, 
  TruckIcon, 
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  ReceiptPercentIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderService.getUserOrders(currentUser.uid);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'pending') return order.paymentStatus === 'pending';
    if (filter === 'paid') return order.paymentStatus === 'paid';
    return order.orderStatus === filter;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.paymentStatus === 'pending').length,
    paid: orders.filter(o => o.paymentStatus === 'paid').length,
    totalSpent: orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  };

  const filterOptions = [
    { value: 'all', label: 'All', icon: ShoppingBagIcon, count: stats.total },
    { value: 'pending', label: 'Pending', icon: ClockIcon, count: stats.pending },
    { value: 'paid', label: 'Paid', icon: CheckCircleIcon, count: stats.paid }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">My Orders</h1>
          <p className="text-sm sm:text-base text-gray-600">Track and manage your group orders</p>
        </div>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Total Orders"
            value={stats.total}
            icon={ShoppingBagIcon}
            color="blue"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={ClockIcon}
            color="orange"
          />
          <StatCard
            title="Paid"
            value={stats.paid}
            icon={CheckCircleIcon}
            color="green"
          />
          <StatCard
            title="Total Spent"
            value={`₹${stats.totalSpent.toLocaleString()}`}
            icon={CurrencyRupeeIcon}
            color="purple"
          />
        </div>

        {/* Filters - Mobile Scroll */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 text-sm sm:text-base ${
                    filter === option.value
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{option.label}</span>
                  {option.count > 0 && (
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-bold ${
                      filter === option.value 
                        ? 'bg-white/20' 
                        : 'bg-gray-200'
                    }`}>
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            <SkeletonLoader type="list" count={5} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
      <div className={`inline-flex p-2 sm:p-3 bg-gradient-to-br ${colorClasses[color]} rounded-lg sm:rounded-xl mb-2 sm:mb-3`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
      </div>
      <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5 sm:mb-1">{title}</p>
      <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-800 truncate">{value}</p>
    </div>
  );
}

function OrderCard({ order, navigate }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: ClockIcon,
      label: 'Payment Pending'
    },
    paid: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircleIcon,
      label: 'Paid'
    },
    failed: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircleIcon,
      label: 'Payment Failed'
    }
  };

  const status = statusConfig[order.paymentStatus] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleViewDetails = () => {
    if (order.groupOrderId) {
      navigate(`/orders/${order.groupOrderId}`);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <h3 className="font-bold text-sm sm:text-base lg:text-lg text-gray-800 truncate">
                Order #{order.id.slice(-8).toUpperCase()}
              </h3>
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold border flex items-center gap-1 flex-shrink-0 ${status.color}`}>
                <StatusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{status.label}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              {order.createdAt && new Date(order.createdAt.seconds * 1000).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Amount</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">₹{order.totalAmount}</p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ChevronRightIcon 
                className={`h-5 w-5 sm:h-6 sm:w-6 text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''}`} 
              />
            </button>
          </div>
        </div>
        
        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 py-3 sm:py-4 border-t border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Items</p>
            <p className="text-sm sm:text-base font-semibold text-gray-800">
              {order.items?.length || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Group</p>
            <p className="text-sm sm:text-base font-semibold text-gray-800 truncate">
              #{order.groupId?.slice(-6) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
            <p className="text-sm sm:text-base font-semibold text-gray-800">
              {order.orderStatus || 'placed'}
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && order.items && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 sm:space-y-4 animate-fade-in">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-sm sm:text-base">Items Ordered</h4>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{item.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-800 text-sm sm:text-base flex-shrink-0 ml-2">
                      ₹{(item.groupPrice || item.price) * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={handleViewDetails}
              className="w-full px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
            >
              View Full Details →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ filter }) {
  const messages = {
    all: {
      title: 'No orders yet',
      description: 'Start shopping with your group and place your first order!',
      action: 'Browse Products'
    },
    pending: {
      title: 'No pending payments',
      description: 'All your orders are paid or you have no orders',
      action: 'View All Orders'
    },
    paid: {
      title: 'No paid orders',
      description: 'Your completed payments will appear here',
      action: 'View All Orders'
    }
  };

  const message = messages[filter] || messages.all;

  return (
    <div className="text-center py-12 sm:py-16 bg-white rounded-2xl shadow-md">
      <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4 sm:mb-6">
        <ShoppingBagIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{message.title}</h3>
      <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto px-4">{message.description}</p>
      <a
        href={filter === 'all' ? '/products' : '/orders'}
        className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-sm sm:text-base"
      >
        {message.action}
      </a>
    </div>
  );
}