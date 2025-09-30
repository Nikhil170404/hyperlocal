// src/pages/Products.jsx - OPTIMIZED WITH MINIMUM STATUS
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService, orderService, groupService } from '../services/groupService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ShoppingCartIcon, MagnifyingGlassIcon, ClockIcon, 
  UsersIcon, CheckCircleIcon, ExclamationTriangleIcon,
  SparklesIcon, LockClosedIcon, FireIcon, BoltIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeOrderCycle, setActiveOrderCycle] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const { getCartCount } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserGroups();
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, sortBy, currentUser]);

  useEffect(() => {
    if (selectedGroup) fetchActiveOrderCycle();
  }, [selectedGroup]);

  useEffect(() => {
    if (!activeOrderCycle) return;
    const interval = setInterval(() => updateTimeRemaining(), 1000);
    return () => clearInterval(interval);
  }, [activeOrderCycle]);

  const updateTimeRemaining = () => {
    if (!activeOrderCycle) return;
    const now = Date.now();
    let targetTime;

    if (activeOrderCycle.phase === 'collecting') {
      targetTime = activeOrderCycle.collectingEndsAt?.toMillis() || 0;
    } else if (activeOrderCycle.phase === 'payment_window') {
      targetTime = activeOrderCycle.paymentWindowEndsAt?.toMillis() || 0;
    } else {
      setTimeRemaining(null);
      return;
    }

    const remaining = targetTime - now;
    if (remaining <= 0) {
      setTimeRemaining(null);
      fetchActiveOrderCycle();
    } else {
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining({ hours, minutes, seconds, total: remaining });
    }
  };

  const fetchUserGroups = async () => {
    if (!currentUser) {
      toast('Please join a group to start shopping', { icon: '👥' });
      navigate('/groups');
      return;
    }
    
    try {
      const groups = await groupService.getUserGroups(currentUser.uid);
      if (groups.length === 0) {
        toast.error('You need to join a group first to shop together');
        navigate('/groups');
        return;
      }
      setUserGroups(groups);
      if (groups.length === 1 || !selectedGroup) {
        setSelectedGroup(groups[0]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    }
  };

  const fetchActiveOrderCycle = async () => {
    if (!selectedGroup) return;
    try {
      const cycles = await orderService.getActiveOrderCycles(selectedGroup.id);
      if (cycles.length > 0) {
        setActiveOrderCycle(cycles[0]);
        orderService.subscribeToOrderCycle(cycles[0].id, (data) => {
          setActiveOrderCycle(data);
        });
      } else {
        setActiveOrderCycle(null);
      }
    } catch (error) {
      console.error('Error fetching order cycle:', error);
    }
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
  const getProductProgress = (productId) => {
    if (!activeOrderCycle || !activeOrderCycle.productOrders) return null;
    return activeOrderCycle.productOrders[productId] || null;
  };

  const canAddToCart = () => {
    if (!activeOrderCycle) return true;
    return activeOrderCycle.phase === 'collecting';
  };

  const getPhaseMessage = () => {
    if (!activeOrderCycle) {
      return { text: 'Start shopping to begin a new order cycle', type: 'info', icon: SparklesIcon };
    }
    if (activeOrderCycle.phase === 'collecting') {
      return { 
        text: `Collecting orders - ${timeRemaining ? `${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s` : ''}`,
        type: 'collecting',
        icon: ClockIcon
      };
    }
    if (activeOrderCycle.phase === 'payment_window') {
      return { 
        text: `Payment window - ${timeRemaining ? `${timeRemaining.hours}h ${timeRemaining.minutes}m` : ''} to pay`,
        type: 'payment',
        icon: FireIcon
      };
    }
    if (activeOrderCycle.phase === 'confirmed') {
      return { text: 'Order confirmed - Delivering tomorrow!', type: 'success', icon: CheckCircleIcon };
    }
    return { text: 'Order in progress', type: 'info', icon: SparklesIcon };
  };

  const phaseMessage = getPhaseMessage();
  const PhaseIcon = phaseMessage.icon;

  if (!selectedGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading your groups..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50">
      {/* Sticky Header */}
      <div className="sticky top-14 sm:top-16 z-40 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Group & Phase Status */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Shopping with:</label>
                <select
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm font-medium"
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const group = userGroups.find(g => g.id === e.target.value);
                    setSelectedGroup(group);
                  }}
                >
                  {userGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.members?.length || 0} members)
                    </option>
                  ))}
                </select>
              </div>

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

            {/* Phase Status */}
            <div className={`p-3 rounded-xl flex items-center gap-3 ${
              phaseMessage.type === 'collecting' ? 'bg-blue-50 border border-blue-200' :
              phaseMessage.type === 'payment' ? 'bg-orange-50 border border-orange-200' :
              phaseMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <PhaseIcon className={`h-5 w-5 ${
                phaseMessage.type === 'collecting' ? 'text-blue-600' :
                phaseMessage.type === 'payment' ? 'text-orange-600' :
                phaseMessage.type === 'success' ? 'text-green-600' :
                'text-gray-600'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{phaseMessage.text}</p>
                {activeOrderCycle && (
                  <p className="text-xs text-gray-600">
                    {activeOrderCycle.totalParticipants} participants • ₹{activeOrderCycle.totalAmount?.toLocaleString()}
                  </p>
                )}
              </div>
              {timeRemaining && (
                <div className="flex gap-1">
                  <div className="bg-white px-2 py-1 rounded text-xs font-bold">
                    {String(timeRemaining.hours).padStart(2, '0')}h
                  </div>
                  <div className="bg-white px-2 py-1 rounded text-xs font-bold">
                    {String(timeRemaining.minutes).padStart(2, '0')}m
                  </div>
                </div>
              )}
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
        {/* Categories */}
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
          <div className="text-center py-16">
            <LoadingSpinner size="large" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg">
            <ShoppingCartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product}
                cycleProgress={getProductProgress(product.id)}
                canAddToCart={canAddToCart()}
                phase={activeOrderCycle?.phase}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Product Card
function ProductCard({ product, cycleProgress, canAddToCart, phase }) {
  const { addToCart, isInCart, getItemQuantity, incrementQuantity, decrementQuantity } = useCart();
  
  const inCart = isInCart(product.id);
  const quantity = getItemQuantity(product.id);
  
  const currentQty = cycleProgress?.quantity || 0;
  const minQty = product.minQuantity || 50;
  const progress = Math.min((currentQty / minQty) * 100, 100);
  const isMet = currentQty >= minQty;
  const membersOrdering = cycleProgress?.participants?.length || 0;
  const discount = Math.round(((product.retailPrice - product.groupPrice) / product.retailPrice) * 100);

  const handleAddToCart = async () => {
    if (!canAddToCart) {
      toast.error('Cannot add items during payment window');
      return;
    }
    await addToCart(product, 1);
  };

  return (
    <div className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative h-40 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300" />
          </div>
        )}
        
        {discount > 0 && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
            {discount}% OFF
          </span>
        )}

        {!canAddToCart && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
        )}

        {/* Minimum Status Badge */}
        {cycleProgress && (
          <div className="absolute top-2 right-2">
            {isMet ? (
              <div className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold flex items-center gap-1">
                <CheckCircleIcon className="h-3 w-3" />
                <span className="hidden sm:inline">Min Met</span>
              </div>
            ) : (
              <div className="px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
                {minQty - currentQty} more
              </div>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {membersOrdering > 0 && cycleProgress && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {membersOrdering}
              </span>
              <span className={`font-bold ${isMet ? 'text-green-600' : 'text-orange-600'}`}>
                {currentQty}/{minQty}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isMet ? 'bg-green-600' : 'bg-orange-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        
        {/* Pricing */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-gray-500">Retail:</span>
            <span className="text-red-600 line-through">₹{product.retailPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-semibold">Group:</span>
            <span className="text-lg sm:text-xl text-green-600 font-bold">₹{product.groupPrice}</span>
          </div>
        </div>
        
        {/* Cart Controls */}
        {canAddToCart ? (
          inCart ? (
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-1.5 sm:p-2">
              <button
                onClick={() => decrementQuantity(product.id)}
                className="p-1.5 bg-white rounded-md hover:bg-gray-200 transition"
              >
                <span className="text-lg font-bold">−</span>
              </button>
              <span className="font-bold text-base sm:text-lg px-2 sm:px-4">{quantity}</span>
              <button
                onClick={() => incrementQuantity(product.id)}
                className="p-1.5 bg-white rounded-md hover:bg-gray-200 transition"
              >
                <span className="text-lg font-bold">+</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="w-full py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-lg transition text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <BoltIcon className="h-4 w-4" />
              <span>Add</span>
            </button>
          )
        ) : (
          <button
            disabled
            className="w-full py-2 sm:py-3 bg-gray-300 text-gray-500 rounded-lg sm:rounded-xl font-bold cursor-not-allowed text-sm sm:text-base"
          >
            {phase === 'payment_window' ? 'Payment Window' : 'Not Available'}
          </button>
        )}
      </div>
    </div>
  );
}