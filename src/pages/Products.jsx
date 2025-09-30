// src/pages/Products.jsx - WITH GROUP ORDER VISIBILITY
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, orderService, groupService } from '../services/groupService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { ShoppingCartIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon, MinusIcon, TrashIcon, ChartBarIcon, UsersIcon, CheckCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { HeartIcon, SparklesIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const [activeGroupOrder, setActiveGroupOrder] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupOrderView, setShowGroupOrderView] = useState(false);
  
  const { getCartCount } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUserGroups();
  }, [selectedCategory, sortBy]);

  useEffect(() => {
    if (selectedGroup) {
      fetchActiveGroupOrder();
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToGroupOrder();
      return () => unsubscribe && unsubscribe();
    }
  }, [selectedGroup]);

  const fetchUserGroups = async () => {
    if (!currentUser) return;
    
    try {
      const groups = await groupService.getUserGroups(currentUser.uid);
      setUserGroups(groups);
      
      if (groups.length > 0 && !selectedGroup) {
        setSelectedGroup(groups[0]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchActiveGroupOrder = async () => {
    if (!selectedGroup) return;
    
    try {
      const orders = await orderService.getActiveGroupOrders(selectedGroup.id);
      if (orders.length > 0) {
        setActiveGroupOrder(orders[0]);
      } else {
        setActiveGroupOrder(null);
      }
    } catch (error) {
      console.error('Error fetching group order:', error);
    }
  };

  const subscribeToGroupOrder = () => {
    if (!selectedGroup) return null;
    
    // Get the latest order ID first
    orderService.getActiveGroupOrders(selectedGroup.id).then(orders => {
      if (orders.length > 0) {
        const orderId = orders[0].id;
        return orderService.subscribeToGroupOrder(orderId, (data) => {
          setActiveGroupOrder(data);
        });
      }
    });
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? null : selectedCategory;
      let productsData = await productService.getProducts(category);
      
      if (sortBy === 'price-low') {
        productsData = productsData.sort((a, b) => a.groupPrice - b.groupPrice);
      } else if (sortBy === 'price-high') {
        productsData = productsData.sort((a, b) => b.groupPrice - a.groupPrice);
      } else if (sortBy === 'savings') {
        productsData = productsData.sort((a, b) => 
          (b.retailPrice - b.groupPrice) - (a.retailPrice - a.groupPrice)
        );
      }
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesData = await productService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartCount = getCartCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Sticky Header */}
      <div className="sticky top-14 sm:top-16 z-40 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Products
              </h1>
              {selectedGroup && (
                <p className="text-sm text-gray-600 mt-1">
                  Shopping for: <span className="font-semibold text-green-600">{selectedGroup.name}</span>
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {/* Group Order View Button */}
              {activeGroupOrder && (
                <button
                  onClick={() => setShowGroupOrderView(!showGroupOrderView)}
                  className="relative px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <EyeIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Group Order</span>
                  <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {activeGroupOrder.totalParticipants || 0}
                  </span>
                </button>
              )}
              
              {/* Cart Button */}
              <button 
                onClick={() => navigate('/cart')}
                className="relative px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="savings">Highest Savings</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Group Selector */}
        {userGroups.length > 1 && (
          <div className="mb-6 bg-white rounded-xl p-4 shadow-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Group:</label>
            <select
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={selectedGroup?.id || ''}
              onChange={(e) => {
                const group = userGroups.find(g => g.id === e.target.value);
                setSelectedGroup(group);
              }}
            >
              {userGroups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Group Order Overview */}
        {showGroupOrderView && activeGroupOrder && (
          <GroupOrderOverview 
            groupOrder={activeGroupOrder} 
            onClose={() => setShowGroupOrderView(false)}
          />
        )}

        {/* Category Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <SkeletonLoader type="product" count={8} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <ShoppingCartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  groupOrderProgress={activeGroupOrder?.productQuantities?.[product.id]}
                />
              ))}
            </div>
            
            <div className="mt-8 text-center text-gray-600">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Group Order Overview Component
function GroupOrderOverview({ groupOrder, onClose }) {
  return (
    <div className="mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 shadow-lg border-2 border-blue-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <UsersIcon className="h-6 w-6" />
            Active Group Order
          </h3>
          <p className="text-sm text-blue-700 mt-1">See what everyone is ordering</p>
        </div>
        <button
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 font-bold text-xl"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{groupOrder.totalParticipants || 0}</p>
          <p className="text-xs text-gray-600">Members</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">₹{groupOrder.totalAmount?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-600">Total Value</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {Object.keys(groupOrder.productQuantities || {}).length}
          </p>
          <p className="text-xs text-gray-600">Products</p>
        </div>
      </div>

      {groupOrder.productQuantities && Object.keys(groupOrder.productQuantities).length > 0 ? (
        <div className="bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
          <h4 className="font-semibold mb-3">Products Being Ordered:</h4>
          <div className="space-y-3">
            {Object.entries(groupOrder.productQuantities).map(([productId, data]) => (
              <div key={productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{data.name}</p>
                  <p className="text-sm text-gray-600">
                    {data.participants?.length || 0} members • {data.quantity} units
                  </p>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-full rounded-full ${
                        data.quantity >= data.minQuantity ? 'bg-green-600' : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min((data.quantity / data.minQuantity) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {data.quantity >= data.minQuantity ? (
                  <CheckCircleIcon className="h-8 w-8 text-green-600 ml-3" />
                ) : (
                  <span className="ml-3 text-sm font-bold text-orange-600">
                    {data.minQuantity - data.quantity} more
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center">
          <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No products in group order yet</p>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ product, groupOrderProgress }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, isInCart, getItemQuantity, incrementQuantity, decrementQuantity, removeFromCart } = useCart();
  
  const inCart = isInCart(product.id);
  const quantity = getItemQuantity(product.id);
  
  // Group order stats
  const groupQuantity = groupOrderProgress?.quantity || 0;
  const minQuantity = product.minQuantity || 50;
  const membersOrdering = groupOrderProgress?.participants?.length || 0;
  const progress = Math.min((groupQuantity / minQuantity) * 100, 100);
  const isMinimumMet = groupQuantity >= minQuantity;

  const discount = Math.round(((product.retailPrice - product.groupPrice) / product.retailPrice) * 100);

  const handleAddToCart = async () => {
    await addToCart(product, 1);
  };

  return (
    <div className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartIcon className="h-16 w-16 text-gray-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          {discount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg">
              {discount}% OFF
            </span>
          )}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition shadow-lg"
          >
            <HeartIcon className={`h-5 w-5 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} />
          </button>
        </div>

        {/* Group Progress Badge */}
        {membersOrdering > 0 && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-lg">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700 flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />
                  {membersOrdering} ordering
                </span>
                <span className={`font-bold ${isMinimumMet ? 'text-green-600' : 'text-orange-600'}`}>
                  {groupQuantity}/{minQuantity}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-full rounded-full ${isMinimumMet ? 'bg-green-600' : 'bg-orange-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 min-h-[3rem]">
          {product.name}
        </h3>
        
        {/* Pricing */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Retail:</span>
            <span className="text-red-600 line-through font-medium">₹{product.retailPrice}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Group Price:</span>
            <span className="text-xl text-green-600 font-bold">₹{product.groupPrice}</span>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">You Save:</span>
              <span className="text-green-700 font-bold">₹{product.retailPrice - product.groupPrice}</span>
            </div>
          </div>
        </div>
        
        {/* Cart Controls */}
        {inCart ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
              <button
                onClick={() => decrementQuantity(product.id)}
                className="p-2 bg-white rounded-md hover:bg-gray-200 transition shadow-sm"
              >
                <MinusIcon className="h-4 w-4 text-gray-700" />
              </button>
              <span className="font-bold text-lg px-4">{quantity}</span>
              <button
                onClick={() => incrementQuantity(product.id)}
                className="p-2 bg-white rounded-md hover:bg-gray-200 transition shadow-sm"
              >
                <PlusIcon className="h-4 w-4 text-gray-700" />
              </button>
            </div>
            <button
              onClick={() => removeFromCart(product.id)}
              className="w-full py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition flex items-center justify-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}