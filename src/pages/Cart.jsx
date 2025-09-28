// src/pages/Cart.jsx
import React, { useState } from 'react';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function Cart() {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: 'Basmati Rice (10kg)',
      groupPrice: 550,
      retailPrice: 800,
      quantity: 2,
      imageUrl: null
    },
    {
      id: 2,
      name: 'Cooking Oil (5L)',
      groupPrice: 480,
      retailPrice: 650,
      quantity: 1,
      imageUrl: null
    }
  ]);

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity === 0) {
      removeItem(id);
      return;
    }
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.groupPrice * item.quantity), 0);
  const retailTotal = cartItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
  const totalSavings = retailTotal - subtotal;
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Retail:</span>
                        <span className="text-red-600 line-through text-sm">₹{item.retailPrice}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Group Price:</span>
                        <span className="text-green-600 font-bold">₹{item.groupPrice}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold">₹{item.groupPrice * item.quantity}</p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700 mt-2"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow p-6 h-fit">
            <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>You Save:</span>
                <span>₹{totalSavings}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>₹{deliveryFee}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>
            
            <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold">
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
