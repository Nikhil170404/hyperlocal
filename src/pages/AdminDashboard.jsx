// src/pages/AdminDashboard.jsx - Enhanced with Order Management
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import DataUploadAdmin from '../components/DataUploadAdmin';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ShoppingBagIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  QrCodeIcon,
  PrinterIcon,
  PlusIcon,
  MapPinIcon,
  UsersIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [orderCycles, setOrderCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [allGroups, setAllGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    city: '',
    pincode: '',
    maxMembers: 100,
    category: 'groceries'
  });
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users count
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnap.size;

      // Fetch groups count
      const groupsSnap = await getDocs(collection(db, 'groups'));
      const totalGroups = groupsSnap.size;
      const groups = groupsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllGroups(groups);

      // Fetch order cycles
      const cyclesQuery = query(
        collection(db, 'orderCycles'),
        orderBy('createdAt', 'desc')
      );
      const cyclesSnap = await getDocs(cyclesQuery);
      const cycles = cyclesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const totalOrders = cycles.length;
      const totalRevenue = cycles.reduce((sum, cycle) => sum + (cycle.totalAmount || 0), 0);

      setStats({ totalUsers, totalGroups, totalOrders, totalRevenue });
      setOrderCycles(cycles);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreatingGroup(true);

    try {
      const groupData = {
        name: newGroup.name,
        area: {
          city: newGroup.city,
          pincode: newGroup.pincode
        },
        createdBy: userProfile.uid || 'admin',
        maxMembers: parseInt(newGroup.maxMembers),
        category: newGroup.category,
        isActive: true,
        members: [userProfile.uid || 'admin'],
        stats: {
          totalOrders: 0,
          totalMembers: 1,
          totalSavings: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'groups'), groupData);
      
      toast.success('Group created successfully! 🎉');
      setShowCreateGroup(false);
      setNewGroup({
        name: '',
        city: '',
        pincode: '',
        maxMembers: 100,
        category: 'groceries'
      });
      
      // Refresh data
      await fetchDashboardData();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await updateDoc(doc(db, 'groups', groupId), {
        isActive: false,
        updatedAt: new Date()
      });
      
      toast.success('Group deleted successfully');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const updateOrderCycleStatus = async (cycleId, newPhase) => {
    try {
      await updateDoc(doc(db, 'orderCycles', cycleId), {
        phase: newPhase,
        updatedAt: new Date()
      });
      
      toast.success(`Order cycle updated to ${newPhase}`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating cycle:', error);
      toast.error('Failed to update order cycle');
    }
  };

  const markAsDelivered = async (cycleId, userId) => {
    try {
      const cycleRef = doc(db, 'orderCycles', cycleId);
      const cycle = orderCycles.find(c => c.id === cycleId);
      
      const updatedParticipants = cycle.participants.map(p =>
        p.userId === userId ? { ...p, orderStatus: 'delivered', deliveredAt: new Date() } : p
      );

      await updateDoc(cycleRef, {
        participants: updatedParticipants,
        updatedAt: new Date()
      });

      toast.success('Marked as delivered');
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking as delivered:', error);
      toast.error('Failed to update delivery status');
    }
  };

  const generatePackingList = (cycle) => {
    if (!cycle) return;

    // Group items by product
    const packingList = {};
    cycle.participants.forEach(participant => {
      participant.items.forEach(item => {
        if (!packingList[item.id]) {
          packingList[item.id] = {
            name: item.name,
            totalQuantity: 0,
            participants: []
          };
        }
        packingList[item.id].totalQuantity += item.quantity;
        packingList[item.id].participants.push({
          name: participant.userName,
          quantity: item.quantity,
          phone: participant.userPhone
        });
      });
    });

    // Create printable content
    let content = `
      <html>
        <head>
          <title>Packing List - Order ${cycle.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #16a34a; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #16a34a; color: white; }
            .summary { background-color: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Packing List</h1>
          <div class="summary">
            <p><strong>Order Cycle:</strong> ${cycle.id}</p>
            <p><strong>Total Participants:</strong> ${cycle.totalParticipants}</p>
            <p><strong>Total Amount:</strong> ₹${cycle.totalAmount?.toLocaleString()}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
    `;

    Object.entries(packingList).forEach(([productId, product]) => {
      content += `
        <h2>${product.name}</h2>
        <p><strong>Total Quantity:</strong> ${product.totalQuantity} units</p>
        <table>
          <thead>
            <tr>
              <th>Participant Name</th>
              <th>Phone</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      product.participants.forEach(p => {
        content += `
          <tr>
            <td>${p.name}</td>
            <td>${p.phone}</td>
            <td>${p.quantity}</td>
          </tr>
        `;
      });

      content += `
          </tbody>
        </table>
      `;
    });

    content += `
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredCycles = orderCycles.filter(cycle => {
    const matchesSearch = cycle.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cycle.phase === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: UserGroupIcon,
      color: 'from-blue-500 to-cyan-600',
      change: '+12%'
    },
    {
      title: 'Active Groups',
      value: stats.totalGroups,
      icon: UserGroupIcon,
      color: 'from-green-500 to-emerald-600',
      change: '+8%'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBagIcon,
      color: 'from-purple-500 to-pink-600',
      change: '+23%'
    },
    {
      title: 'Revenue',
      value: `₹${(stats.totalRevenue / 1000).toFixed(1)}K`,
      icon: ChartBarIcon,
      color: 'from-orange-500 to-red-600',
      change: '+15%'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'orders', label: 'Order Management', icon: ShoppingBagIcon },
    { id: 'groups', label: 'Manage Groups', icon: UserGroupIcon },
    { id: 'upload', label: 'Upload Data', icon: DocumentTextIcon }
  ];

  const getStatusBadge = (phase) => {
    const badges = {
      collecting: { color: 'bg-blue-100 text-blue-800', icon: ClockIcon, label: 'Collecting' },
      payment_window: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, label: 'Payment' },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'Confirmed' },
      processing: { color: 'bg-purple-100 text-purple-800', icon: TruckIcon, label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, label: 'Cancelled' }
    };
    
    const badge = badges[phase] || badges.collecting;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage orders, groups, and deliveries</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-2 flex gap-2 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-medium text-green-600">{stat.change}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                );
              })}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Order Cycles</h2>
              <div className="space-y-4">
                {orderCycles.slice(0, 5).map(cycle => (
                  <div
                    key={cycle.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedCycle(cycle);
                      setActiveTab('orders');
                    }}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        Order #{cycle.id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {cycle.totalParticipants} participants • ₹{cycle.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                    {getStatusBadge(cycle.phase)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="collecting">Collecting</option>
                    <option value="payment_window">Payment</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredCycles.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No orders found</h3>
                  <p className="text-gray-600">Try adjusting your filters</p>
                </div>
              ) : (
                filteredCycles.map(cycle => (
                  <div key={cycle.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            Order #{cycle.id.slice(0, 12)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {cycle.totalParticipants} participants • ₹{cycle.totalAmount?.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(cycle.phase)}
                          <button
                            onClick={() => generatePackingList(cycle)}
                            className="p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
                            title="Generate Packing List"
                          >
                            <PrinterIcon className="h-5 w-5 text-gray-700" />
                          </button>
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {cycle.phase === 'confirmed' && (
                          <button
                            onClick={() => updateOrderCycleStatus(cycle.id, 'processing')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            Mark as Processing
                          </button>
                        )}
                        {cycle.phase === 'processing' && (
                          <button
                            onClick={() => updateOrderCycleStatus(cycle.id, 'completed')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Participants List */}
                    <div className="p-6">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <UserGroupIcon className="h-5 w-5 text-green-600" />
                        Participants ({cycle.participants?.length || 0})
                      </h4>
                      
                      <div className="space-y-3">
                        {cycle.participants?.map((participant, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {participant.userName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {participant.userPhone} • ₹{participant.totalAmount?.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {participant.items?.length} items • Payment: {participant.paymentStatus}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {participant.orderStatus === 'delivered' ? (
                                <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                  <CheckCircleIcon className="h-4 w-4" />
                                  Delivered
                                </span>
                              ) : (
                                cycle.phase === 'processing' && (
                                  <button
                                    onClick={() => markAsDelivered(cycle.id, participant.userId)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                                  >
                                    <TruckIcon className="h-4 w-4" />
                                    Mark Delivered
                                  </button>
                                )
                              )}
                              
                              <button
                                className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                title="View QR Code"
                              >
                                <QrCodeIcon className="h-5 w-5 text-gray-700" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Upload Data Tab */}
        {activeTab === 'upload' && (
          <div className="animate-fade-in">
            <DataUploadAdmin />
          </div>
        )}

        {/* Groups Management Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Manage Groups</h2>
                <p className="text-gray-600 mt-1">Create and manage community groups</p>
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create Group</span>
              </button>
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-gray-900">Create New Group</h3>
                      <button
                        onClick={() => setShowCreateGroup(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <XCircleIcon className="h-6 w-6 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleCreateGroup} className="p-6 space-y-6">
                    {/* Group Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Group Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newGroup.name}
                        onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                        placeholder="e.g., Andheri West Grocery Group"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    {/* City & Pincode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={newGroup.city}
                          onChange={(e) => setNewGroup({...newGroup, city: e.target.value})}
                          placeholder="Mumbai"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Pincode *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength="6"
                          value={newGroup.pincode}
                          onChange={(e) => setNewGroup({...newGroup, pincode: e.target.value})}
                          placeholder="400001"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>

                    {/* Max Members */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Maximum Members
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={newGroup.maxMembers}
                        onChange={(e) => setNewGroup({...newGroup, maxMembers: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Primary Category
                      </label>
                      <select
                        value={newGroup.category}
                        onChange={(e) => setNewGroup({...newGroup, category: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="groceries">Groceries</option>
                        <option value="household">Household</option>
                        <option value="personal-care">Personal Care</option>
                        <option value="packaged-foods">Packaged Foods</option>
                        <option value="beverages">Beverages</option>
                        <option value="dairy">Dairy</option>
                        <option value="snacks">Snacks</option>
                        <option value="health">Health & Wellness</option>
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreateGroup(false)}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingGroup}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingGroup ? (
                          <>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <PlusIcon className="h-5 w-5" />
                            <span>Create Group</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Groups List */}
            {allGroups.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No groups yet</h3>
                <p className="text-gray-600 mb-6">Create your first group to get started</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Create First Group</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allGroups.map(group => (
                  <div key={group.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                    {/* Header */}
                    <div className="relative h-24 bg-gradient-to-br from-green-500 to-emerald-600">
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full -mr-12 -mt-12"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <UserGroupIcon className="h-12 w-12 text-white" />
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          group.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                        {group.name}
                      </h3>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPinIcon className="h-4 w-4 text-green-600" />
                          <span>{group.area?.city}, {group.area?.pincode}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UsersIcon className="h-4 w-4 text-blue-600" />
                          <span>{group.members?.length || 0} / {group.maxMembers || 100} members</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <ShoppingBagIcon className="h-4 w-4 text-purple-600" />
                          <span>{group.stats?.totalOrders || 0} orders</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = `/groups/${group.id}`}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}