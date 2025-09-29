// src/pages/AdminDashboard.jsx - ENHANCED WITH ANALYTICS
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { productService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import DataUploadAdmin from '../components/DataUploadAdmin';
import { 
  UserGroupIcon, 
  ShoppingBagIcon, 
  CurrencyRupeeIcon,
  PlusIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      // Fetch groups
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
      
      // Calculate analytics
      await calculateAnalytics(orders);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async (orders) => {
    try {
      // Order Success Rate
      const totalOrders = orders.length;
      const successfulOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length;
      const orderSuccessRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;

      // Payment Collection Rate
      const paidOrders = orders.reduce((count, order) => {
        const paidParticipants = (order.participants || []).filter(p => p.paymentStatus === 'paid').length;
        return count + paidParticipants;
      }, 0);
      const totalParticipants = orders.reduce((count, order) => {
        return count + (order.participants?.length || 0);
      }, 0);
      const paymentCollectionRate = totalParticipants > 0 ? (paidOrders / totalParticipants) * 100 : 0;

      // Repeat Order Rate
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userOrders = {};
      orders.forEach(order => {
        (order.participants || []).forEach(p => {
          userOrders[p.userId] = (userOrders[p.userId] || 0) + 1;
        });
      });
      const repeatCustomers = Object.values(userOrders).filter(count => count > 1).length;
      const repeatOrderRate = usersSnapshot.size > 0 ? (repeatCustomers / usersSnapshot.size) * 100 : 0;

      // Product-wise demand
      const productDemand = {};
      orders.forEach(order => {
        Object.entries(order.productQuantities || {}).forEach(([productId, data]) => {
          if (!productDemand[productId]) {
            productDemand[productId] = {
              name: data.name,
              totalQuantity: 0,
              totalOrders: 0,
              revenue: 0
            };
          }
          productDemand[productId].totalQuantity += data.quantity;
          productDemand[productId].totalOrders += 1;
          productDemand[productId].revenue += data.quantity * data.price;
        });
      });

      const topProducts = Object.entries(productDemand)
        .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
        .slice(0, 10);

      // Minimum quantity achievement rate
      const minQuantityMet = orders.filter(o => o.minQuantityMet).length;
      const minQuantityAchievementRate = totalOrders > 0 ? (minQuantityMet / totalOrders) * 100 : 0;

      // Average order value
      const avgOrderValue = totalOrders > 0 ? orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / totalOrders : 0;

      setAnalytics({
        orderSuccessRate,
        paymentCollectionRate,
        repeatOrderRate,
        minQuantityAchievementRate,
        avgOrderValue,
        topProducts,
        totalOrders,
        successfulOrders,
        paidOrders,
        totalParticipants
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="large" text="Loading dashboard..." fullScreen />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'products', label: 'Products', icon: ShoppingBagIcon },
    { id: 'orders', label: 'Orders', icon: ShoppingBagIcon },
    { id: 'users', label: 'Users', icon: UserGroupIcon },
    { id: 'data-upload', label: 'Data Upload', icon: ArrowUpTrayIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-8">
          Admin Dashboard
        </h1>

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
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab recentOrders={recentOrders} analytics={analytics} />
        )}

        {activeTab === 'analytics' && analytics && (
          <AnalyticsTab analytics={analytics} />
        )}

        {activeTab === 'products' && <ProductsManagement />}
        {activeTab === 'orders' && <OrdersManagement orders={recentOrders} />}
        {activeTab === 'users' && <UsersManagement />}
        {activeTab === 'data-upload' && <DataUploadAdmin />}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ recentOrders, analytics }) {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-semibold mb-4">Recent Orders</h3>
        <div className="space-y-4">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div key={order.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:shadow-md transition">
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
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No orders yet</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <QuickStat
              label="Order Success Rate"
              value={`${analytics.orderSuccessRate.toFixed(1)}%`}
              icon={CheckCircleIcon}
              color="green"
            />
            <QuickStat
              label="Payment Collection"
              value={`${analytics.paymentCollectionRate.toFixed(1)}%`}
              icon={CurrencyRupeeIcon}
              color="blue"
            />
            <QuickStat
              label="Repeat Customers"
              value={`${analytics.repeatOrderRate.toFixed(1)}%`}
              icon={UserGroupIcon}
              color="purple"
            />
            <QuickStat
              label="Min Qty Achievement"
              value={`${analytics.minQuantityAchievementRate.toFixed(1)}%`}
              icon={ChartBarIcon}
              color="orange"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Analytics Tab
function AnalyticsTab({ analytics }) {
  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <MetricCard
          title="Order Success Rate"
          value={`${analytics.orderSuccessRate.toFixed(1)}%`}
          subtitle={`${analytics.successfulOrders} of ${analytics.totalOrders} orders`}
          color="green"
        />
        <MetricCard
          title="Payment Collection"
          value={`${analytics.paymentCollectionRate.toFixed(1)}%`}
          subtitle={`${analytics.paidOrders} of ${analytics.totalParticipants} participants`}
          color="blue"
        />
        <MetricCard
          title="Average Order Value"
          value={`₹${analytics.avgOrderValue.toFixed(0)}`}
          subtitle="Per order"
          color="purple"
        />
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-2xl font-bold mb-6">Top Performing Products</h3>
        <div className="space-y-4">
          {analytics.topProducts.map(([productId, data], index) => (
            <div key={productId} className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{data.name}</p>
                <p className="text-sm text-gray-600">
                  {data.totalQuantity} units • {data.totalOrders} orders • ₹{data.revenue.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <div className="w-48 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full"
                    style={{ width: `${(data.totalQuantity / analytics.topProducts[0][1].totalQuantity) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid md:grid-cols-2 gap-6">
        <PerformanceCard
          title="Min Quantity Achievement"
          value={`${analytics.minQuantityAchievementRate.toFixed(1)}%`}
          description="Orders meeting minimum quantity requirements"
        />
        <PerformanceCard
          title="Repeat Customer Rate"
          value={`${analytics.repeatOrderRate.toFixed(1)}%`}
          description="Customers with multiple orders"
        />
      </div>
    </div>
  );
}

// Products Management (placeholder)
function ProductsManagement() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-semibold mb-6">Products Management</h3>
      <p className="text-gray-500 text-center py-8">Products management interface - See Products tab for full implementation</p>
    </div>
  );
}

// Orders Management
function OrdersManagement({ orders }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-semibold mb-6">Orders Management</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">#{order.id.slice(-6)}</td>
                <td className="px-6 py-4 text-sm">
                  {order.createdAt && new Date(order.createdAt.seconds * 1000).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">{order.participants?.length || 0}</td>
                <td className="px-6 py-4 text-sm font-semibold">₹{order.totalAmount}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Users Management (placeholder)
function UsersManagement() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-semibold mb-6">Users Management</h3>
      <p className="text-gray-500 text-center py-8">Users management interface coming soon...</p>
    </div>
  );
}

// Helper Components
function StatsCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600',
    yellow: 'from-yellow-500 to-orange-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
      <div className={`inline-flex p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl mb-3`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function QuickStat({ label, value, icon: Icon, color }) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} text-white rounded-xl shadow-lg p-6`}>
      <p className="text-sm font-medium opacity-90 mb-2">{title}</p>
      <p className="text-4xl font-bold mb-1">{value}</p>
      <p className="text-sm opacity-75">{subtitle}</p>
    </div>
  );
}

function PerformanceCard({ title, value, description }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
      <h4 className="text-lg font-semibold text-gray-800 mb-2">{title}</h4>
      <p className="text-3xl font-bold text-green-600 mb-2">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    collecting: 'bg-yellow-100 text-yellow-800',
    active: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}