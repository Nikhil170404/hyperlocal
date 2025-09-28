// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where,
  serverTimestamp,
  addDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { productService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, 
  ShoppingBagIcon, 
  CurrencyRupeeIcon,
  PlusIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch users count
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      // Fetch groups count
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      
      // Fetch orders
      const ordersQuery = query(
        collection(db, 'groupOrders'),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate revenue
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      setStats({
        totalUsers: usersSnapshot.size,
        totalGroups: groupsSnapshot.size,
        totalOrders: orders.length,
        totalRevenue
      });
      
      setRecentOrders(orders.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={UserGroupIcon}
          color="blue"
        />
        <StatsCard
          title="Active Groups"
          value={stats.totalGroups}
          icon={UserGroupIcon}
          color="green"
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingBagIcon}
          color="purple"
        />
        <StatsCard
          title="Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          icon={CurrencyRupeeIcon}
          color="yellow"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['overview', 'products', 'orders', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Recent Orders</h3>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(-6)}</p>
                    <p className="text-sm text-gray-600">
                      {order.createdAt && new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{order.totalAmount}</p>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('products')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <PlusIcon className="h-5 w-5 text-green-600" />
                  <span>Add New Product</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="h-5 w-5 text-blue-600" />
                  <span>View Analytics</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
              
              <button
                onClick={() => setActiveTab('orders')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <ShoppingBagIcon className="h-5 w-5 text-purple-600" />
                  <span>Manage Orders</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && <ProductsManagement />}
      {activeTab === 'orders' && <OrdersManagement />}
      {activeTab === 'users' && <UsersManagement />}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function ProductsManagement() {
  const [products, setProducts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const productsData = await productService.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Products Management</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Retail Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Group Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {product.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{product.retailPrice}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{product.groupPrice}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-green-600 hover:text-green-700 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <AddProductModal
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}

function AddProductModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'groceries',
    retailPrice: '',
    groupPrice: '',
    unit: 'kg',
    minQuantity: '10'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await productService.addProduct({
        ...formData,
        retailPrice: parseFloat(formData.retailPrice),
        groupPrice: parseFloat(formData.groupPrice),
        minQuantity: parseInt(formData.minQuantity)
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">Add New Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="groceries">Groceries</option>
              <option value="household">Household</option>
              <option value="personal-care">Personal Care</option>
              <option value="beverages">Beverages</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retail Price (₹)
              </label>
              <input
                type="number"
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.retailPrice}
                onChange={(e) => setFormData({...formData, retailPrice: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Price (₹)
              </label>
              <input
                type="number"
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
                value={formData.groupPrice}
                onChange={(e) => setFormData({...formData, groupPrice: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="small" /> : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrdersManagement() {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Orders Management</h3>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">Orders management interface coming soon...</p>
      </div>
    </div>
  );
}

function UsersManagement() {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Users Management</h3>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">Users management interface coming soon...</p>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'collecting': return 'bg-yellow-100 text-yellow-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'shipped': return 'bg-purple-100 text-purple-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}