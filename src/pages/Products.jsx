// src/pages/Products.jsx - ENHANCED WITH TIERED PRICING
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/groupService';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { ShoppingCartIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon, MinusIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { HeartIcon, SparklesIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');
  const { getCartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? null : selectedCategory;
      let productsData = await productService.getProducts(category);
      
      // Sort products
      if (sortBy === 'price-low') {
        productsData = productsData.sort((a, b) => (a.priceTiers?.[0]?.price || a.groupPrice) - (b.priceTiers?.[0]?.price || b.groupPrice));
      } else if (sortBy === 'price-high') {
        productsData = productsData.sort((a, b) => (b.priceTiers?.[0]?.price || b.groupPrice) - (a.priceTiers?.[0]?.price || a.groupPrice));
      } else if (sortBy === 'savings') {
        productsData = productsData.sort((a, b) => 
          (b.retailPrice - (b.priceTiers?.[b.priceTiers.length-1]?.price || b.groupPrice)) - 
          (a.retailPrice - (a.priceTiers?.[a.priceTiers.length-1]?.price || a.groupPrice))
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Products
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                <SparklesIcon className="inline h-4 w-4 text-yellow-500" /> Tiered pricing • Save more when group buys more
              </p>
            </div>
            <button 
              onClick={() => navigate('/cart')}
              className="relative px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-sm sm:text-base"
            >
              <ShoppingCartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="sm:col-span-2 relative">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white transition cursor-pointer"
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
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {/* Category Filters */}
        <div className="mb-4 sm:mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base whitespace-nowrap font-medium transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base whitespace-nowrap font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <SkeletonLoader type="product" count={8} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-lg">
            <ShoppingCartIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg sm:text-2xl font-semibold text-gray-600 mb-2">No products found</h3>
            <p className="text-sm sm:text-base text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            <div className="mt-6 sm:mt-8 text-center text-sm sm:text-base text-gray-600">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Enhanced Product Card with Tiered Pricing
function ProductCard({ product }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showTiers, setShowTiers] = useState(false);
  const { addToCart, isInCart, getItemQuantity, incrementQuantity, decrementQuantity, removeFromCart } = useCart();
  
  // Calculate pricing tiers or use default
  const priceTiers = product.priceTiers || [
    { minQty: 0, maxQty: 20, price: product.retailPrice * 0.95, label: 'Small' },
    { minQty: 21, maxQty: 49, price: product.retailPrice * 0.88, label: 'Medium' },
    { minQty: 50, maxQty: null, price: product.groupPrice || product.retailPrice * 0.80, label: 'Bulk' }
  ];

  const bestPrice = priceTiers[priceTiers.length - 1].price;
  const discount = Math.round(((product.retailPrice - bestPrice) / product.retailPrice) * 100);
  const maxSavings = product.retailPrice - bestPrice;
  
  const inCart = isInCart(product.id);
  const quantity = getItemQuantity(product.id);

  const handleAddToCart = async () => {
    await addToCart(product, 1);
  };

  return (
    <div className="group bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative h-32 sm:h-40 lg:h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCartIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          {discount > 0 && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-500 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg">
              UP TO {discount}% OFF
            </span>
          )}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-1.5 sm:p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition shadow-lg"
          >
            <HeartIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>
      
      {/* Product Info */}
      <div className="p-2.5 sm:p-3 lg:p-4">
        <h3 className="font-bold text-gray-800 mb-1.5 sm:mb-2 line-clamp-2 text-xs sm:text-sm lg:text-base min-h-[2.5rem] sm:min-h-[3rem]">
          {product.name}
        </h3>
        
        {/* Tiered Pricing Display */}
        <div className="space-y-1 sm:space-y-1.5 mb-2.5 sm:mb-3">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-gray-500">Retail:</span>
            <span className="text-red-600 line-through font-medium">₹{product.retailPrice}</span>
          </div>
          
          {/* Best Price */}
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">Best Price:</span>
            <span className="text-base sm:text-lg lg:text-xl text-green-600 font-bold">₹{bestPrice}</span>
          </div>

          {/* Tiered Pricing Toggle */}
          <button
            onClick={() => setShowTiers(!showTiers)}
            className="w-full py-1 px-2 bg-blue-50 hover:bg-blue-100 rounded text-xs text-blue-600 font-medium transition flex items-center justify-center gap-1"
          >
            <ChartBarIcon className="h-3 w-3" />
            {showTiers ? 'Hide' : 'View'} Pricing Tiers
          </button>

          {/* Pricing Tiers Dropdown */}
          {showTiers && (
            <div className="mt-2 p-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 space-y-1.5 animate-fade-in">
              {priceTiers.map((tier, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-gray-700 font-medium">
                    {tier.minQty}+ units:
                  </span>
                  <span className="text-green-700 font-bold">₹{tier.price}</span>
                </div>
              ))}
              <div className="pt-1.5 border-t border-blue-200 text-xs text-gray-600 italic">
                💡 More group orders = Lower prices!
              </div>
            </div>
          )}

          <div className="pt-1 sm:pt-1.5 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Max Save:</span>
              <span className="text-green-700 font-bold text-xs sm:text-sm">₹{maxSavings}</span>
            </div>
          </div>
        </div>
        
        {/* Cart Controls */}
        {inCart ? (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-1.5 sm:p-2">
              <button
                onClick={() => decrementQuantity(product.id)}
                className="p-1.5 sm:p-2 bg-white rounded-md hover:bg-gray-200 transition shadow-sm"
              >
                <MinusIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
              </button>
              <span className="font-bold text-base sm:text-lg px-3 sm:px-4">{quantity}</span>
              <button
                onClick={() => incrementQuantity(product.id)}
                className="p-1.5 sm:p-2 bg-white rounded-md hover:bg-gray-200 transition shadow-sm"
              >
                <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
              </button>
            </div>
            <button
              onClick={() => removeFromCart(product.id)}
              className="w-full py-1.5 sm:py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base"
          >
            <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}