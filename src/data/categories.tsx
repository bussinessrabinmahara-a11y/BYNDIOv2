import { 
  Shirt, 
  Sparkles, 
  Home as HomeIcon, 
  Baby, 
  Smartphone, 
  HeartPulse, 
  Zap, 
  Package, 
  RotateCcw,
  Wand2,
  Watch,
  ShoppingBag,
  Gem,
  Utensils,
  Hammer,
  TrendingUp,
  Tag
} from 'lucide-react';
import React from 'react';

export interface SubCategory {
  name: string;
  items?: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subCategories: SubCategory[];
}

export const CATEGORIES_DATA: Category[] = [
  {
    id: 'fashion',
    name: 'Fashion',
    icon: <Shirt size={24} />,
    color: '#E91E63',
    bgColor: '#FFF0F5',
    subCategories: [
      { name: 'Women Ethnic', items: ['Kurtis', 'Sarees', 'Dress Materials'] },
      { name: 'Women Western', items: ['Tops', 'Dresses', 'Jeans (Skinny, Straight, Baggy)', 'Co-ord Sets'] },
      { name: 'Men', items: ['T-Shirts', 'Shirts', 'Jeans (Slim, Regular, Baggy)', 'Track Pants & Joggers', 'Oversized T-Shirts'] },
      { name: 'Kids', items: ['Daily Wear', 'Combo Sets', 'Jeans & Bottom Wear', 'Innerwear & Nightwear'] },
    ]
  },
  {
    id: 'jewellery',
    name: 'Jewellery & Accessories',
    icon: <Gem size={24} />,
    color: '#C2185B',
    bgColor: '#FCE4EC',
    subCategories: [
      { name: 'Jewellery', items: ['Earrings', 'Chains', 'Bangles'] },
      { name: 'Bags & Wallets', items: ['Sling Bags', 'Tote Bags', 'Wallets'] },
      { name: 'Watches' },
      { name: 'Fashion Accessories', items: ['Sunglasses', 'Hair Accessories'] },
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    icon: <Sparkles size={24} />,
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    subCategories: [
      { name: 'Makeup', items: ['Lipsticks', 'Compact', 'Eye Makeup'] },
      { name: 'Skincare', items: ['Face Wash', 'Creams', 'Sunscreen'] },
      { name: 'Haircare', items: ['Hair Oil', 'Shampoo', 'Hair Serums'] },
      { name: 'Personal Hygiene', items: ['Deodorants', 'Sanitary Products'] },
    ]
  },
  {
    id: 'home-kitchen',
    name: 'Home & Kitchen',
    icon: <Utensils size={24} />,
    color: '#1B5E20',
    bgColor: '#E8F5E9',
    subCategories: [
      { name: 'Kitchen Tools', items: ['Choppers', 'Peelers'] },
      { name: 'Home Decor', items: ['LED Lights', 'Wall Stickers'] },
      { name: 'Storage & Organizers', items: ['Containers', 'Space Savers'] },
      { name: 'Cleaning Supplies', items: ['Floor Cleaners', 'Dishwash'] },
    ]
  },
  {
    id: 'baby-kids',
    name: 'Baby & Kids',
    icon: <Baby size={24} />,
    color: '#F57F17',
    bgColor: '#FFF8E1',
    subCategories: [
      { name: 'Baby Care', items: ['Baby Wipes', 'Baby Oils'] },
      { name: 'Kids Accessories' },
      { name: 'Toys', items: ['Small Toys', 'Learning Toys'] },
    ]
  },
  {
    id: 'home-improvement',
    name: 'Home Improvement',
    icon: <Hammer size={24} />,
    color: '#00838F',
    bgColor: '#E0F2F1',
    subCategories: [
      { name: 'Cleaning Tools', items: ['Brushes', 'Mops'] },
      { name: 'Utility Products', items: ['Garbage Bags', 'Gloves'] },
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics & Accessories',
    icon: <Smartphone size={24} />,
    color: '#1565C0',
    bgColor: '#E8F4FD',
    subCategories: [
      { name: 'Mobile Accessories', items: ['Covers', 'Chargers', 'Earphones'] },
      { name: 'Small Gadgets', items: ['Mini Fans', 'LED Gadgets'] },
    ]
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    icon: <HeartPulse size={24} />,
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    subCategories: [
      { name: 'Supplements', items: ['Multivitamins'] },
      { name: 'Personal Wellness', items: ['Pain Relief Oils', 'Fitness Bands'] },
    ]
  },
  {
    id: 'trending',
    name: 'Trending Now',
    icon: <TrendingUp size={24} />,
    color: '#E65100',
    bgColor: '#FFF3E0',
    subCategories: [
      { name: 'Reels Viral Products' },
      { name: 'Under ₹199 Deals' },
    ]
  },
  {
    id: 'combos',
    name: 'Combo & Value Packs',
    icon: <Package size={24} />,
    color: '#d32f2f',
    bgColor: '#ffebee',
    subCategories: [
      { name: 'Clothing Combos' },
      { name: 'Beauty Combos' },
      { name: 'Kitchen Combos' },
      { name: 'Daily Use Packs' },
    ]
  },
  {
    id: 'refill',
    name: 'Refill & Repeat',
    icon: <RotateCcw size={24} />,
    color: '#455a64',
    bgColor: '#eceff1',
    subCategories: [
      { name: 'Skincare Refills' },
      { name: 'Haircare Refills' },
      { name: 'Cleaning Refills' },
      { name: 'Hygiene Refills' },
    ]
  }
];
