// src/pages/Products.jsx
import React, { useState, useEffect } from 'react';
import { productService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { ShoppingCartIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const category = selectedCategory === 'all' ? null : selectedCategory;
      const productsData = await productService.getProducts(category);
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
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
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Products</h1>
        <div className="relative">
          <button className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition">
            <ShoppingCartIcon className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={() => addToCart(product)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  const discount = Math.round(((product.retailPrice - product.groupPrice) / product.retailPrice) * 100);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="h-48 bg-gray-200 relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
            {discount}% OFF
          </span>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3">{product.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Retail Price:</span>
            <span className="text-red-600 line-through">₹{product.retailPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Group Price:</span>
            <span className="text-green-600 font-bold">₹{product.groupPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">You Save:</span>
            <span className="text-green-700 font-medium">₹{product.retailPrice - product.groupPrice}</span>
          </div>
        </div>
        
        <button
          onClick={onAddToCart}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}