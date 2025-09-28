// src/pages/Orders.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'collecting': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Orders</h1>

      {/* Filters */}
      <div className="mb-6 flex space-x-2 overflow-x-auto">
        {['all', 'collecting', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap capitalize ${
              filter === status
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                  <p className="text-gray-600">
                    {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold">₹{order.totalAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Participants</p>
                  <p className="font-semibold">{order.participants?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Group</p>
                  <p className="font-semibold">Group #{order.groupId}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
