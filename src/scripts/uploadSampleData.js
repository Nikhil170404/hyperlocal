// src/scripts/uploadSampleData.js
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// Sample Categories Data
const categories = [
  {
    id: "groceries",
    name: "Groceries",
    description: "Rice, dal, oil, flour, spices and other cooking essentials",
    icon: "🌾",
    color: "green",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "household",
    name: "Household",
    description: "Cleaning supplies, detergents, and home care products",
    icon: "🧽",
    color: "blue",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "personal-care",
    name: "Personal Care",
    description: "Shampoo, soap, toothpaste and hygiene products",
    icon: "🧴",
    color: "purple",
    isActive: true,
    sortOrder: 3
  },
  {
    id: "packaged-foods",
    name: "Packaged Foods",
    description: "Snacks, instant foods, biscuits and ready-to-eat items",
    icon: "📦",
    color: "orange",
    isActive: true,
    sortOrder: 4
  },
  {
    id: "beverages",
    name: "Beverages",
    description: "Tea, coffee, juices, health drinks and soft drinks",
    icon: "☕",
    color: "brown",
    isActive: true,
    sortOrder: 5
  },
  {
    id: "dairy",
    name: "Dairy Products",
    description: "Milk, paneer, ghee, butter and dairy items",
    icon: "🥛",
    color: "cyan",
    isActive: true,
    sortOrder: 6
  },
  {
    id: "spices",
    name: "Spices & Masalas",
    description: "Whole spices, ground masalas and seasoning blends",
    icon: "🌶️",
    color: "red",
    isActive: true,
    sortOrder: 7
  },
  {
    id: "pulses",
    name: "Pulses & Grains",
    description: "Different varieties of dal and whole grains",
    icon: "🫘",
    color: "yellow",
    isActive: true,
    sortOrder: 8
  },
  {
    id: "snacks",
    name: "Snacks",
    description: "Namkeen, chips, biscuits and savory snacks",
    icon: "🍿",
    color: "pink",
    isActive: true,
    sortOrder: 9
  },
  {
    id: "kitchen-essentials",
    name: "Kitchen Essentials",
    description: "Foil, cling wrap, tissues and kitchen supplies",
    icon: "🍽️",
    color: "indigo",
    isActive: true,
    sortOrder: 10
  }
];

// Sample Products Data (abbreviated for brevity - use full list from JSON)
const products = [
  {
    name: "Basmati Rice (10kg)",
    description: "Premium aged basmati rice with long grains and aromatic fragrance",
    category: "groceries",
    retailPrice: 850,
    groupPrice: 580,
    unit: "kg",
    minQuantity: 50,
    imageUrl: "",
    isActive: true
  },
  // ... Add all 50 products from the JSON file
];

// Function to upload categories
async function uploadCategories() {
  console.log('Starting to upload categories...');
  let successCount = 0;
  let errorCount = 0;

  for (const category of categories) {
    try {
      const categoryRef = doc(db, 'categories', category.id);
      await setDoc(categoryRef, {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Category uploaded: ${category.name}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error uploading category ${category.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Categories Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${categories.length}\n`);
}

// Function to upload products
async function uploadProducts() {
  console.log('Starting to upload products...');
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
        favorites: 0,
        sales: 0
      });
      console.log(`✅ Product uploaded: ${product.name}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error uploading product ${product.name}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Products Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${products.length}\n`);
}

// Main upload function
export async function uploadAllSampleData() {
  console.log('\n🚀 Starting Firebase data upload...\n');
  console.log('=' .repeat(50));
  
  try {
    // Upload categories first
    await uploadCategories();
    
    // Then upload products
    await uploadProducts();
    
    console.log('=' .repeat(50));
    console.log('✨ All data uploaded successfully!\n');
    
    return {
      success: true,
      message: 'Data uploaded successfully'
    };
  } catch (error) {
    console.error('❌ Error during upload:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Optional: Function to clear all data (use with caution!)
export async function clearAllData() {
  console.log('⚠️  WARNING: This will delete all data!');
  console.log('This function should be implemented with proper safeguards.');
  // Implementation here if needed
}

// Export individual functions
export { uploadCategories, uploadProducts };

// If running directly (not imported)
if (typeof window !== 'undefined' && window.location.search.includes('upload=true')) {
  uploadAllSampleData();
}