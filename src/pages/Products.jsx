// src/pages/Products.jsx - Professional with +/- Controls
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../services/groupService';
import { useCart } from '../contexts/CartContext';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { ShoppingCartIcon, MagnifyingGlassIcon, FunnelIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Products
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Save up to 40% with group buying</p>
          </div>
          <button 
            onClick={() => navigate('/cart')}
            className="relative px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="sm:col-span-2 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white transition cursor-pointer"
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
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg scale-105'
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            <SkeletonLoader type="product" count={8} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
              <ShoppingCartIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-600 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
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

function ProductCard({ product }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, isInCart, getItemQuantity, incrementQuantity, decrementQuantity, removeFromCart } = useCart();
  
  const discount = Math.round(((product.retailPrice - product.groupPrice) / product.retailPrice) * 100);
  const savings = product.retailPrice - product.groupPrice;
  const inCart = isInCart(product.id);
  const quantity = getItemQuantity(product.id);

  const handleAddToCart = async () => {
    await addToCart(product, 1);
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
      <div className="relative h-40 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
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
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          {discount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
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
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 text-sm sm:text-base h-10 sm:h-12">
          {product.name}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Retail:</span>
            <span className="text-sm text-red-600 line-through font-medium">₹{product.retailPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Group Price:</span>
            <span className="text-xl text-green-600 font-bold">₹{product.groupPrice}</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">You Save:</span>
              <span className="text-green-700 font-bold text-sm">₹{savings}</span>
            </div>
          </div>
        </div>
        
        {/* Quantity Controls or Add Button */}
        {inCart ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-gray-100 rounded-xl p-2">
              <button
                onClick={() => decrementQuantity(product.id)}
                className="p-2 bg-white rounded-lg hover:bg-gray-200 transition shadow-sm"
              >
                <MinusIcon className="h-4 w-4 text-gray-700" />
              </button>
              <span className="font-bold text-lg px-4">{quantity}</span>
              <button
                onClick={() => incrementQuantity(product.id)}
                className="p-2 bg-white rounded-lg hover:bg-gray-200 transition shadow-sm"
              >
                <PlusIcon className="h-4 w-4 text-gray-700" />
              </button>
            </div>
            <button
              onClick={() => removeFromCart(product.id)}
              className="w-full py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition flex items-center justify-center gap-2 text-sm"
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