// src/pages/Orders.jsx - Enhanced Version
import React, { useState, useEffect } from 'react';
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
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { currentUser } = useAuth();

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
    return order.status === filter;
  });

  const stats = {
    total: orders.length,
    active: orders.filter(o => ['collecting', 'confirmed', 'shipped'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalSpent: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  };

  const filterOptions = [
    { value: 'all', label: 'All Orders', icon: ShoppingBagIcon },
    { value: 'collecting', label: 'Collecting', icon: ClockIcon },
    { value: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
    { value: 'shipped', label: 'Shipped', icon: TruckIcon },
    { value: 'delivered', label: 'Delivered', icon: CheckCircleIcon },
    { value: 'cancelled', label: 'Cancelled', icon: XCircleIcon }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">My Orders</h1>
        <p className="text-gray-600">Track and manage your group orders</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Orders"
          value={stats.total}
          icon={ShoppingBagIcon}
          color="blue"
        />
        <StatCard
          title="Active Orders"
          value={stats.active}
          icon={ClockIcon}
          color="orange"
        />
        <StatCard
          title="Delivered"
          value={stats.delivered}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Total Spent"
          value={`₹${stats.totalSpent.toLocaleString()}`}
          icon={ReceiptPercentIcon}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            const count = option.value === 'all' 
              ? orders.length 
              : orders.filter(o => o.status === option.value).length;
            
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
                  filter === option.value
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{option.label}</span>
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    filter === option.value 
                      ? 'bg-white/20' 
                      : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonLoader type="list" count={5} />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
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
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusConfig = {
    collecting: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: ClockIcon,
      label: 'Collecting Orders'
    },
    confirmed: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: CheckCircleIcon,
      label: 'Confirmed'
    },
    shipped: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: TruckIcon,
      label: 'Shipped'
    },
    delivered: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircleIcon,
      label: 'Delivered'
    },
    cancelled: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircleIcon,
      label: 'Cancelled'
    }
  };

  const status = statusConfig[order.status] || statusConfig.collecting;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-gray-800">
                Order #{order.id.slice(-8).toUpperCase()}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${status.color} flex items-center gap-1.5`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {order.createdAt && new Date(order.createdAt.seconds * 1000).toLocaleString()}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-600 font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-green-600">₹{order.totalAmount}</p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRightIcon 
                className={`h-5 w-5 text-gray-600 transition-transform ${expanded ? 'rotate-90' : ''}`} 
              />
            </button>
          </div>
        </div>
        
        {/* Quick Info */}
        <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Participants</p>
            <p className="text-sm font-semibold text-gray-800">
              {order.participants?.length || 0} members
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Group</p>
            <p className="text-sm font-semibold text-gray-800">
              Group #{order.groupId?.slice(-6) || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Items</p>
            <p className="text-sm font-semibold text-gray-800">
              {order.items?.length || 0} products
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
            {/* Order Timeline */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Order Timeline</h4>
              <OrderTimeline status={order.status} />
            </div>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Items Ordered</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-800">₹{item.price * item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                View Details
              </button>
              {order.status === 'delivered' && (
                <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200">
                  Reorder
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderTimeline({ status }) {
  const stages = [
    { key: 'collecting', label: 'Collecting', icon: ClockIcon },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
    { key: 'shipped', label: 'Shipped', icon: TruckIcon },
    { key: 'delivered', label: 'Delivered', icon: CheckCircleIcon }
  ];

  const statusIndex = stages.findIndex(s => s.key === status);

  return (
    <div className="flex items-center justify-between">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const isActive = index <= statusIndex;
        const isCurrent = index === statusIndex;

        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-400'
              } ${isCurrent ? 'ring-4 ring-green-200 scale-110' : ''}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className={`text-xs font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                {stage.label}
              </p>
            </div>
            {index < stages.length - 1 && (
              <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${
                index < statusIndex ? 'bg-green-600' : 'bg-gray-200'
              }`}></div>
            )}
          </React.Fragment>
        );
      })}
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
    collecting: {
      title: 'No orders collecting',
      description: 'Check back later when groups start new orders',
      action: 'View Groups'
    },
    confirmed: {
      title: 'No confirmed orders',
      description: 'Your confirmed orders will appear here',
      action: 'View All Orders'
    },
    shipped: {
      title: 'No shipped orders',
      description: 'Shipped orders will be shown here',
      action: 'View All Orders'
    },
    delivered: {
      title: 'No delivered orders',
      description: 'Your completed orders will appear here',
      action: 'View All Orders'
    },
    cancelled: {
      title: 'No cancelled orders',
      description: 'Cancelled orders will be listed here',
      action: 'View All Orders'
    }
  };

  const message = messages[filter] || messages.all;

  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-md">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-6">
        <ShoppingBagIcon className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">{message.title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{message.description}</p>
      <a
        href={filter === 'all' ? '/products' : '/groups'}
        className="inline-block px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
      >
        {message.action}
      </a>
    </div>
  );
}