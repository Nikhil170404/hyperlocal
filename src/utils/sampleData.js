// src/utils/sampleData.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const sampleProducts = [
  {
    name: 'Basmati Rice (10kg)',
    description: 'Premium quality basmati rice, aged for better aroma and taste',
    category: 'groceries',
    retailPrice: 850,
    groupPrice: 580,
    unit: 'kg',
    minQuantity: 50,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Sunflower Oil (5L)',
    description: 'Pure sunflower cooking oil, refined and filtered',
    category: 'groceries',
    retailPrice: 680,
    groupPrice: 490,
    unit: 'L',
    minQuantity: 20,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Toor Dal (5kg)',
    description: 'High quality toor dal, rich in protein',
    category: 'groceries',
    retailPrice: 620,
    groupPrice: 450,
    unit: 'kg',
    minQuantity: 30,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Wheat Flour (10kg)',
    description: 'Fresh ground wheat flour for chapatis and bread',
    category: 'groceries',
    retailPrice: 480,
    groupPrice: 350,
    unit: 'kg',
    minQuantity: 40,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Surf Excel Detergent (6kg)',
    description: 'Premium washing powder for tough stains',
    category: 'household',
    retailPrice: 950,
    groupPrice: 720,
    unit: 'kg',
    minQuantity: 15,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Pantene Shampoo (1L)',
    description: 'Pro-vitamin formula shampoo for healthy hair',
    category: 'personal-care',
    retailPrice: 580,
    groupPrice: 420,
    unit: 'L',
    minQuantity: 25,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Maggi Noodles (12 pack)',
    description: 'Instant noodles masala flavor family pack',
    category: 'packaged-foods',
    retailPrice: 180,
    groupPrice: 140,
    unit: 'pack',
    minQuantity: 50,
    imageUrl: '',
    isActive: true
  },
  {
    name: 'Red Label Tea (1kg)',
    description: 'Strong CTC tea blend for perfect morning cup',
    category: 'beverages',
    retailPrice: 520,
    groupPrice: 380,
    unit: 'kg',
    minQuantity: 30,
    imageUrl: '',
    isActive: true
  }
];

export const sampleCategories = [
  {
    name: 'Groceries',
    description: 'Rice, dal, oil, flour and other staples',
    id: 'groceries',
    icon: '🌾'
  },
  {
    name: 'Household',
    description: 'Cleaning supplies, detergents, and home care',
    id: 'household',
    icon: '🧽'
  },
  {
    name: 'Personal Care',
    description: 'Shampoo, soap, toothpaste and hygiene products',
    id: 'personal-care',
    icon: '🧴'
  },
  {
    name: 'Packaged Foods',
    description: 'Snacks, instant foods, and ready-to-eat items',
    id: 'packaged-foods',
    icon: '📦'
  },
  {
    name: 'Beverages',
    description: 'Tea, coffee, juices, and soft drinks',
    id: 'beverages',
    icon: '☕'
  }
];

// Function to seed sample data
export async function seedSampleData() {
  try {
    console.log('Starting to seed sample data...');
    
    // Add categories
    for (const category of sampleCategories) {
      await addDoc(collection(db, 'categories'), {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log('Categories added successfully');
    
    // Add products
    for (const product of sampleProducts) {
      await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log('Products added successfully');
    
    console.log('Sample data seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding sample data:', error);
    return false;
  }
}