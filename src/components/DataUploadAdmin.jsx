// src/components/DataUploadAdmin.jsx
import React, { useState } from 'react';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProgressBar } from './LoadingSpinner';
import { 
  ArrowUpTrayIcon, 
  TrashIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Import your sample data
import sampleProducts from '../data/sampleProducts.json';
import sampleCategories from '../data/sampleCategories.json';

export default function DataUploadAdmin() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    categories: { success: 0, error: 0 },
    products: { success: 0, error: 0 }
  });

  const uploadCategories = async () => {
    let successCount = 0;
    let errorCount = 0;
    const total = sampleCategories.length;

    for (let i = 0; i < sampleCategories.length; i++) {
      const category = sampleCategories[i];
      try {
        const categoryRef = doc(db, 'categories', category.id);
        await setDoc(categoryRef, {
          ...category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        successCount++;
        console.log(`✅ Category uploaded: ${category.name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error uploading category ${category.name}:`, error);
      }
      setProgress(Math.round(((i + 1) / total) * 50)); // 0-50% for categories
    }

    return { success: successCount, error: errorCount };
  };

  const uploadProducts = async () => {
    let successCount = 0;
    let errorCount = 0;
    const total = sampleProducts.length;

    for (let i = 0; i < sampleProducts.length; i++) {
      const product = sampleProducts[i];
      try {
        await addDoc(collection(db, 'products'), {
          ...product,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          views: 0,
          favorites: 0,
          sales: 0
        });
        successCount++;
        console.log(`✅ Product uploaded: ${product.name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error uploading product ${product.name}:`, error);
      }
      setProgress(50 + Math.round(((i + 1) / total) * 50)); // 50-100% for products
    }

    return { success: successCount, error: errorCount };
  };

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);
    toast.loading('Uploading data to Firebase...');

    try {
      // Upload categories
      const categoriesResult = await uploadCategories();
      
      // Upload products
      const productsResult = await uploadProducts();

      setStats({
        categories: categoriesResult,
        products: productsResult
      });

      toast.dismiss();
      toast.success('All data uploaded successfully! 🎉', {
        duration: 5000
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.dismiss();
      toast.error('Failed to upload data. Check console for details.');
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  const checkExistingData = async () => {
    try {
      const categoriesSnap = await getDocs(collection(db, 'categories'));
      const productsSnap = await getDocs(collection(db, 'products'));
      
      toast.success(
        `Found: ${categoriesSnap.size} categories, ${productsSnap.size} products`,
        { duration: 4000 }
      );
    } catch (error) {
      toast.error('Failed to check existing data');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4">
          <ArrowUpTrayIcon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Upload Sample Data
        </h2>
        <p className="text-gray-600">
          Upload 10 categories and 50 products to your Firestore database
        </p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 mb-1">
              Important Notes:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Make sure you're logged in as an admin</li>
              <li>This will add new data to your database</li>
              <li>Existing data will not be deleted</li>
              <li>Upload may take 1-2 minutes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-gray-600 font-medium mb-1">Categories</p>
          <p className="text-3xl font-bold text-gray-800">10</p>
          <p className="text-xs text-gray-500 mt-1">Will be uploaded</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <p className="text-sm text-gray-600 font-medium mb-1">Products</p>
          <p className="text-3xl font-bold text-gray-800">50</p>
          <p className="text-xs text-gray-500 mt-1">Will be uploaded</p>
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="mb-6">
          <ProgressBar 
            progress={progress} 
            label="Upload Progress" 
            color="green"
          />
        </div>
      )}

      {/* Upload Stats */}
      {stats.categories.success > 0 && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
          <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            Upload Complete!
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Categories:</p>
              <p className="font-bold text-gray-800">
                ✅ {stats.categories.success} / {stats.categories.success + stats.categories.error}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Products:</p>
              <p className="font-bold text-gray-800">
                ✅ {stats.products.success} / {stats.products.success + stats.products.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Uploading Data...</span>
            </>
          ) : (
            <>
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Start Upload</span>
            </>
          )}
        </button>

        <button
          onClick={checkExistingData}
          disabled={uploading}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Check Existing Data
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-600 mb-2">
          <strong>What gets uploaded:</strong>
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 10 product categories with icons and colors</li>
          <li>• 50 products across groceries, household, and personal care</li>
          <li>• Realistic pricing with retail and group prices</li>
          <li>• Proper categorization and minimum quantities</li>
        </ul>
      </div>

      {/* Firebase Rules Reminder */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800 font-semibold mb-2">
          📝 Don't forget:
        </p>
        <p className="text-sm text-blue-700">
          Make sure you've updated your Firestore security rules to allow admin access.
          Check the Firebase Console → Firestore Database → Rules.
        </p>
      </div>
    </div>
  );
}