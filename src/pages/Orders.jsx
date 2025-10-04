// src/pages/Orders.jsx - COMPLETE WITH COUNTDOWN TIMER
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CompactTimer } from '../components/CountdownTimer';
import { 
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  XCircleIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { SkeletonLoader } from '../components/LoadingSpinner';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
    }
  }, [currentUser]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch all order cycles
      const cyclesQuery = query(
        collection(db, 'orderCycles'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(cyclesQuery);
      const allCycles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter cycles where user is a participant
      const userOrders = allCycles.filter(cycle =>
        cycle.participants?.some(p => p.userId === currentUser.uid)
      );

      setOrders(userOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.phase === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusInfo = (phase) => {
    const statuses = {
      collecting: {
        label: 'Collecting',
        color: 'bg-blue-100 text-blue-800',
        icon: ClockIcon
      },
      payment_window: {
        label: 'Payment Due',
        color: 'bg-yellow-100 text-yellow-800',
        icon: CurrencyRupeeIcon
      },
      confirmed: {
        label: 'Confirmed',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircleIcon
      },
      processing: {
        label: 'Processing',
        color: 'bg-purple-100 text-purple-800',
        icon: TruckIcon
      },
      completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircleIcon
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800',
        icon: XCircleIcon
      }
    };

    return statuses[phase] || statuses.collecting;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getUserParticipation = (order) => {
    return order.participants?.find(p => p.userId === currentUser.uid);
  };

  const calculateStats = () => {
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.phase === 'completed').length;
    const totalSpent = orders.reduce((sum, order) => {
      const participation = getUserParticipation(order);
      return sum + (participation?.totalAmount || 0);
    }, 0);

    return { totalOrders, completedOrders, totalSpent };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-6 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <SkeletonLoader type="list" count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            My Orders
          </h1>
          <p className="text-gray-600">
            Track and manage your group orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Total Orders</span>
              <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalOrders}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Completed</span>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.completedOrders}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 font-medium">Total Spent</span>
              <CurrencyRupeeIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ₹{stats.totalSpent.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Status Filter */}
            <div className="relative sm:w-64">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
              >
                <option value="all">All Orders</option>
                <option value="collecting">Collecting</option>
                <option value="payment_window">Payment Due</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No orders found' : 'No orders yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start shopping with your group to see orders here'
              }
            </p>
            {(searchTerm || statusFilter !== 'all') ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/products')}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
              >
                Browse Products
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const participation = getUserParticipation(order);
              const statusInfo = getStatusInfo(order.phase);
              const StatusIcon = statusInfo.icon;

              // Determine if timer should show
              const showTimer = 
                (order.phase === 'collecting' && order.collectingEndsAt) ||
                (order.phase === 'payment_window' && order.paymentWindowEndsAt);

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">
                            Order #{order.id.slice(0, 12)}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            {statusInfo.label}
                          </span>

                          {/* Compact Timer Badge */}
                          {showTimer && (
                            <CompactTimer 
                              endTime={
                                order.phase === 'collecting' 
                                  ? order.collectingEndsAt 
                                  : order.paymentWindowEndsAt
                              }
                              phase={order.phase}
                            />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600 text-sm flex-wrap">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(order.createdAt)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{participation?.items?.length || 0} items</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          ₹{participation?.totalAmount?.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Payment: <span className="font-medium capitalize">{participation?.paymentStatus}</span>
                        </div>
                      </div>
                    </div>

                    {/* Urgent Payment Warning */}
                    {order.phase === 'payment_window' && 
                     participation?.paymentStatus === 'pending' &&
                     order.paymentWindowEndsAt && (
                      <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-300 rounded-xl animate-pulse">
                        <div className="flex items-center gap-2 text-orange-800">
                          <FireIcon className="h-5 w-5 animate-bounce" />
                          <p className="font-bold text-sm">
                            Payment required! Complete payment before time runs out.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Items Preview */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {participation?.items?.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <ShoppingBagIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">{item.name}</div>
                              <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                            </div>
                          </div>
                        ))}
                        
                        {participation?.items?.length > 3 && (
                          <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg text-gray-600 font-medium">
                            +{participation.items.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}