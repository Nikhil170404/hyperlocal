// src/pages/Products.jsx - Enhanced Version
import React, { useState, useEffect } from 'react';
import { productService } from '../services/groupService';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { ShoppingCartIcon, MagnifyingGlassIcon, FunnelIcon, CheckIcon } from '@heroicons/react/24/outline';
import { HeartIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('featured');

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

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        toast.success('Quantity updated in cart!');
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        toast.success('Added to cart!', {
          icon: '🛒',
        });
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Products</h1>
          <p className="text-gray-600">Save up to 40% with group buying</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="relative p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              <ShoppingCartIcon className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white transition cursor-pointer"
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
        <div className="flex gap-2 overflow-x-auto mt-4 pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
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
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
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
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          <SkeletonLoader type="product" count={8} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <ShoppingCartIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => addToCart(product)}
              />
            ))}
          </div>
          
          {/* Results count */}
          <div className="mt-8 text-center text-gray-600">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </div>
        </>
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const discount = Math.round(((product.retailPrice - product.groupPrice) / product.retailPrice) * 100);
  const savings = product.retailPrice - product.groupPrice;

  const handleAddToCart = async () => {
    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    onAddToCart();
    setIsAdding(false);
  };

  return (
    <div className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
            <ShoppingCartIcon className="h-16 w-16" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          {discount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-lg">
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
        
        {/* Quick view on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="px-4 py-2 bg-white text-gray-800 rounded-lg font-semibold transform translate-y-2 group-hover:translate-y-0 transition-transform">
            Quick View
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2 h-12">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Retail Price:</span>
            <span className="text-sm text-red-600 line-through font-medium">₹{product.retailPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Group Price:</span>
            <span className="text-xl text-green-600 font-bold">₹{product.groupPrice}</span>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">You Save:</span>
              <span className="text-green-700 font-bold">₹{savings}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAdding ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Adding...</span>
            </>
          ) : (
            <>
              <ShoppingCartIcon className="h-5 w-5" />
              <span>Add to Cart</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}