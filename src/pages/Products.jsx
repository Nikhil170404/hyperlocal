// src/pages/Products.jsx - Enhanced with Better Filtering
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCart } from '../contexts/CartContext';
import { 
  ShoppingCartIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  CheckCircleIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { SkeletonLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const { addToCart, isInCart, getItemQuantity } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    
    // Show info if coming from a group
    const selectedGroupId = localStorage.getItem('selectedGroupId');
    if (selectedGroupId && location.state?.fromGroup) {
      toast.success('Great! Add items to cart for your group order', {
        duration: 4000,
        icon: '🛒'
      });
    }
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsQuery = query(
        collection(db, 'products'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(productsQuery);
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
      const snapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.groupPrice - b.groupPrice;
        case 'price-high':
          return b.groupPrice - a.groupPrice;
        case 'savings':
          return (b.retailPrice - b.groupPrice) - (a.retailPrice - a.groupPrice);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const getCategoryIcon = (categoryId) => {
    const icons = {
      'groceries': '🌾',
      'household': '🧽',
      'personal-care': '🧴',
      'packaged-foods': '📦',
      'beverages': '☕',
      'dairy': '🥛',
      'snacks': '🍿',
      'health': '💊'
    };
    return icons[categoryId] || '📦';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-6 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <SkeletonLoader type="product" count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Browse Products
          </h1>
          <p className="text-gray-600">
            {filteredProducts.length} products available for group buying
          </p>
        </div>

        {/* Filters Bar */}
        <div className="mb-8 space-y-4">
          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Sort */}
            <div className="relative sm:w-64">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none bg-white"
              >
                <option value="name">Sort by Name</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="savings">Highest Savings</option>
              </select>
            </div>
          </div>

          {/* Category Filter - Mobile Responsive */}
          <div className="relative">
            {/* Scroll Container */}
            <div className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth hide-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-shrink-0 snap-start px-4 sm:px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm sm:text-base ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                }`}
              >
                All Products
              </button>
              
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 snap-start flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all text-sm sm:text-base ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <span className="text-lg">{getCategoryIcon(category.id)}</span>
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Scroll Indicators */}
            <div className="absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none sm:hidden"></div>
          </div>

          {/* Category Count Info */}
          <div className="flex items-center justify-between text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
            <span>
              {selectedCategory === 'all' 
                ? `Showing all ${filteredProducts.length} products`
                : `${filteredProducts.length} products in ${categories.find(c => c.id === selectedCategory)?.name || 'category'}`
              }
            </span>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-green-600 font-medium hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const inCart = isInCart(product.id);
              const quantity = getItemQuantity(product.id);
              const savings = product.retailPrice - product.groupPrice;
              const savingsPercent = Math.round((savings / product.retailPrice) * 100);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 group"
                >
                  {/* Product Image */}
                  <div className="relative h-48 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center overflow-hidden">
                    <ShoppingCartIcon className="h-20 w-20 text-green-600 opacity-50 group-hover:scale-110 transition-transform duration-300" />
                    
                    {/* Savings Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold shadow-lg">
                        {savingsPercent}% OFF
                      </div>
                    </div>

                    {/* In Cart Badge */}
                    {inCart && (
                      <div className="absolute top-3 left-3">
                        <div className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>In Cart ({quantity})</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-5">
                    {/* Category Badge */}
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium mb-2">
                      <span>{getCategoryIcon(product.category)}</span>
                      <span>{product.category}</span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                      {product.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description || 'High quality product for group buying'}
                    </p>

                    {/* Min Quantity */}
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium mb-3">
                      <SparklesIcon className="h-3 w-3" />
                      <span>Min: {product.minQuantity} units</span>
                    </div>

                    {/* Pricing */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-bold text-green-600">
                          ₹{product.groupPrice}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          ₹{product.retailPrice}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
                        <TagIcon className="h-4 w-4" />
                        <span>Save ₹{savings}</span>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`w-full py-3 px-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        inCart
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
                      }`}
                    >
                      <ShoppingCartIcon className="h-5 w-5" />
                      <span>{inCart ? 'Add More' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Cart Button (Floating) */}
        {filteredProducts.length > 0 && (
          <button
            onClick={() => navigate('/cart')}
            className="fixed bottom-8 right-8 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 z-50"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span>View Cart</span>
          </button>
        )}
      </div>
    </div>
  );
}