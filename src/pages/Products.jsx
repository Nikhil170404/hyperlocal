// src/pages/Products.jsx - Fixed with Cart Context & Mobile Responsive
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/groupService';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { ShoppingCartIcon, MagnifyingGlassIcon, FunnelIcon, CheckIcon } from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/solid';
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
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">Products</h1>
            <p className="text-sm sm:text-base text-gray-600">Save up to 40% with group buying</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/cart')}
              className="relative p-2.5 sm:p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <ShoppingCartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white transition cursor-pointer text-sm sm:text-base"
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

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto mt-3 sm:mt-4 pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg whitespace-nowrap font-medium transition-all duration-200 text-sm sm:text-base ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg whitespace-nowrap font-medium transition-all duration-200 text-sm sm:text-base ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="text-center py-12 sm:py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 mb-4">
              <ShoppingCartIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No products found</h3>
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

function ProductCard({ product }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, isInCart } = useCart();
  
  const discount = Math.round(((product.retailPrice - product.groupPrice) / product.retailPrice) * 100);
  const savings = product.retailPrice - product.groupPrice;
  const inCart = isInCart(product.id);

  const handleAddToCart = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    addToCart(product, 1);
    setIsAdding(false);
  };

  return (
    <div className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative h-32 sm:h-40 lg:h-48 bg-gray-200 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
            <ShoppingCartIcon className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          {discount > 0 && (
            <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg">
              {discount}% OFF
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
      
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-gray-800 mb-1 sm:mb-2 line-clamp-2 text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12">
          {product.name}
        </h3>
        <p className="text-xs text-gray-600 mb-2 sm:mb-3 line-clamp-2 hidden sm:block">{product.description}</p>
        
        <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Retail:</span>
            <span className="text-xs sm:text-sm text-red-600 line-through font-medium">₹{product.retailPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">Group Price:</span>
            <span className="text-base sm:text-lg lg:text-xl text-green-600 font-bold">₹{product.groupPrice}</span>
          </div>
          <div className="pt-1 sm:pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">You Save:</span>
              <span className="text-green-700 font-bold text-xs sm:text-sm">₹{savings}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`w-full py-2 sm:py-2.5 lg:py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base ${
            inCart
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg transform hover:-translate-y-0.5'
          }`}
        >
          {isAdding ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Adding...</span>
            </>
          ) : inCart ? (
            <>
              <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>In Cart</span>
            </>
          ) : (
            <>
              <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}