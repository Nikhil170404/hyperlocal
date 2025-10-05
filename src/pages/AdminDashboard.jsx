// src/pages/AdminDashboard.jsx - COMPLETE with Product Management
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import DataUploadAdmin from '../components/DataUploadAdmin';
import { 
  ChartBarIcon, UserGroupIcon, ShoppingBagIcon, TruckIcon, CheckCircleIcon,
  ClockIcon, XCircleIcon, MagnifyingGlassIcon, FunnelIcon, DocumentTextIcon,
  QrCodeIcon, PrinterIcon, PlusIcon, MapPinIcon, UsersIcon, TrashIcon,
  PencilIcon, CubeIcon, TagIcon, SparklesIcon
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
  
  // Groups state
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

  // Products state
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: 'groceries',
    retailPrice: 0,
    groupPrice: 0,
    unit: 'kg',
    minQuantity: 50,
    isActive: true
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

      // Fetch users
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnap.size;

      // Fetch groups
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

      // Fetch products
      const productsSnap = await getDocs(collection(db, 'products'));
      const products = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllProducts(products);

      // Fetch categories
      const categoriesSnap = await getDocs(collection(db, 'categories'));
      const categories = categoriesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllCategories(categories);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // GROUP MANAGEMENT
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

  // PRODUCT MANAGEMENT
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setCreatingProduct(true);

    try {
      const productData = {
        ...newProduct,
        retailPrice: parseFloat(newProduct.retailPrice),
        groupPrice: parseFloat(newProduct.groupPrice),
        minQuantity: parseInt(newProduct.minQuantity),
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        favorites: 0,
        sales: 0
      };

      await addDoc(collection(db, 'products'), productData);
      
      toast.success('Product created successfully! 🎉');
      setShowCreateProduct(false);
      setNewProduct({
        name: '',
        description: '',
        category: 'groceries',
        retailPrice: 0,
        groupPrice: 0,
        unit: 'kg',
        minQuantity: 50,
        isActive: true
      });
      
      await fetchDashboardData();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description || '',
      category: product.category,
      retailPrice: product.retailPrice,
      groupPrice: product.groupPrice,
      unit: product.unit,
      minQuantity: product.minQuantity,
      isActive: product.isActive
    });
    setShowEditProduct(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setCreatingProduct(true);

    try {
      const productData = {
        ...newProduct,
        retailPrice: parseFloat(newProduct.retailPrice),
        groupPrice: parseFloat(newProduct.groupPrice),
        minQuantity: parseInt(newProduct.minQuantity),
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'products', editingProduct.id), productData);
      
      toast.success('Product updated successfully!');
      setShowEditProduct(false);
      setEditingProduct(null);
      setNewProduct({
        name: '',
        description: '',
        category: 'groceries',
        retailPrice: 0,
        groupPrice: 0,
        unit: 'kg',
        minQuantity: 50,
        isActive: true
      });
      
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Product deleted successfully');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleToggleProductStatus = async (productId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      toast.success(`Product ${!currentStatus ? 'activated' : 'deactivated'}`);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Failed to update product status');
    }
  };

  // ORDER MANAGEMENT
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

  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    { id: 'products', label: 'Manage Products', icon: CubeIcon },
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
          <p className="text-gray-600">Manage orders, products, groups, and deliveries</p>
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

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Manage Products</h2>
                <p className="text-gray-600 mt-1">Add, edit, or remove products from the catalog</p>
              </div>
              <button
                onClick={() => setShowCreateProduct(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => {
                const savings = product.retailPrice - product.groupPrice;
                const savingsPercent = Math.round((savings / product.retailPrice) * 100);

                return (
                  <div key={product.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all">
                    <div className={`p-4 ${product.isActive ? 'bg-green-50' : 'bg-gray-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
                          {product.category}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          product.isActive ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{product.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl font-bold text-green-600">₹{product.groupPrice}</span>
                        <span className="text-sm text-gray-500 line-through">₹{product.retailPrice}</span>
                        <span className="px-2 py-0.5 bg-red-500 text-white rounded text-xs font-bold">
                          {savingsPercent}% OFF
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-4">
                        Min Quantity: {product.minQuantity} {product.unit}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleProductStatus(product.id, product.isActive)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                            product.isActive
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {product.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create/Edit Product Modal */}
            {(showCreateProduct || showEditProduct) && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {showEditProduct ? 'Edit Product' : 'Create New Product'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowCreateProduct(false);
                          setShowEditProduct(false);
                          setEditingProduct(null);
                          setNewProduct({
                            name: '',
                            description: '',
                            category: 'groceries',
                            retailPrice: 0,
                            groupPrice: 0,
                            unit: 'kg',
                            minQuantity: 50,
                            isActive: true
                          });
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <XCircleIcon className="h-6 w-6 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  <form onSubmit={showEditProduct ? handleUpdateProduct : handleCreateProduct} className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="e.g., Basmati Rice 10kg"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        placeholder="Product description..."
                        rows="3"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          required
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          {allCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit *
                        </label>
                        <select
                          required
                          value={newProduct.unit}
                          onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="kg">Kilogram (kg)</option>
                          <option value="L">Liter (L)</option>
                          <option value="pack">Pack</option>
                          <option value="piece">Piece</option>
                          <option value="box">Box</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Retail Price (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={newProduct.retailPrice}
                          onChange={(e) => setNewProduct({...newProduct, retailPrice: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Group Price (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={newProduct.groupPrice}
                          onChange={(e) => setNewProduct({...newProduct, groupPrice: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Min Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProduct.minQuantity}
                          onChange={(e) => setNewProduct({...newProduct, minQuantity: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={newProduct.isActive}
                        onChange={(e) => setNewProduct({...newProduct, isActive: e.target.checked})}
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                        Product is Active
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateProduct(false);
                          setShowEditProduct(false);
                          setEditingProduct(null);
                        }}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingProduct}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50"
                      >
                        {creatingProduct ? 'Saving...' : showEditProduct ? 'Update Product' : 'Create Product'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab - Keep existing implementation */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fade-in">
            {/* Your existing orders implementation */}
            <div className="text-center text-gray-600">
              Order management content here (keep your existing implementation)
            </div>
          </div>
        )}

        {/* Groups Tab - Keep existing implementation */}
        {activeTab === 'groups' && (
          <div className="space-y-6 animate-fade-in">
            {/* Your existing groups implementation */}
            <div className="text-center text-gray-600">
              Groups management content here (keep your existing implementation)
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="animate-fade-in">
            <DataUploadAdmin />
          </div>
        )}
      </div>
    </div>
  );
}