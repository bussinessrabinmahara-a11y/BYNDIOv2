import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Premium Cotton Oversized T-Shirt",
    brand: "UrbanStyle",
    cat: "Fashion",
    price: 799,
    mrp: 1499,
    icon: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 1240,
    inf: true,
    creator: "@StyleByRiya",
    specs: [["Material", "100% Cotton"], ["Fit", "Oversized"], ["Gender", "Unisex"]]
  },
  {
    id: 2,
    name: "Wireless Noise Cancelling Headphones",
    brand: "SonicWave",
    cat: "Electronics",
    price: 4999,
    mrp: 8999,
    icon: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    reviews: 856,
    inf: false,
    specs: [["Battery", "40 Hours"], ["Drivers", "40mm"], ["Bluetooth", "5.2"]]
  },
  {
    id: 3,
    name: "Hydrating Facial Serum with Vitamin C",
    brand: "GlowSkin",
    cat: "Beauty",
    price: 599,
    mrp: 999,
    icon: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    reviews: 2100,
    inf: true,
    creator: "@GlowNisha",
    specs: [["Skin Type", "All"], ["Volume", "30ml"], ["Key Ingredient", "Vitamin C"]]
  },
  {
    id: 4,
    name: "Smart Watch Series 7 Pro",
    brand: "TechGear",
    cat: "Electronics",
    price: 2499,
    mrp: 5999,
    icon: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    reviews: 540,
    inf: false,
    specs: [["Display", "1.7 inch AMOLED"], ["Waterproof", "IP68"], ["Battery", "7 Days"]]
  },
  {
    id: 5,
    name: "Soft Plush Teddy Bear - XL",
    brand: "KidsJoy",
    cat: "Kids",
    price: 899,
    mrp: 1499,
    icon: "https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    reviews: 320,
    inf: false,
    specs: [["Size", "2 Feet"], ["Material", "Super Soft Plush"], ["Age", "0+"]]
  },
  {
    id: 6,
    name: "Minimalist Ceramic Vase Set",
    brand: "HomeNest",
    cat: "Home",
    price: 1299,
    mrp: 2499,
    icon: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 150,
    inf: true,
    creator: "@HomeDecorIn",
    specs: [["Material", "Ceramic"], ["Pieces", "3"], ["Style", "Minimalist"]]
  },
  {
    id: 7,
    name: "Men's Slim Fit Denim Jacket",
    brand: "UrbanStyle",
    cat: "Fashion",
    price: 1899,
    mrp: 3499,
    icon: "https://images.unsplash.com/photo-1576995883057-084976e1996b?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    reviews: 780,
    inf: false,
    specs: [["Material", "Denim"], ["Fit", "Slim Fit"], ["Wash", "Light Blue"]]
  },
  {
    id: 8,
    name: "Professional Yoga Mat - 6mm",
    brand: "FitIndia",
    cat: "Sports",
    price: 999,
    mrp: 1999,
    icon: "https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    reviews: 450,
    inf: true,
    creator: "@FitYoga",
    specs: [["Thickness", "6mm"], ["Material", "TPE"], ["Length", "183cm"]]
  },
  {
    id: 9,
    name: "Summer Floral Maxi Dress",
    brand: "UrbanStyle",
    cat: "Fashion",
    price: 1299,
    mrp: 2499,
    icon: "https://images.unsplash.com/photo-1572804013307-a9a111dd824d?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    reviews: 890,
    inf: false,
    specs: [["Material", "Rayon"], ["Occasion", "Summer/Beach"], ["Pattern", "Floral"]]
  },
  {
    id: 10,
    name: "Mechanical Gaming Keyboard - RGB",
    brand: "SonicWave",
    cat: "Electronics",
    price: 3499,
    mrp: 5999,
    icon: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    reviews: 670,
    inf: true,
    creator: "@TechArjun",
    specs: [["Switches", "Blue Mechanical"], ["Backlight", "RGB"], ["Connectivity", "USB-C"]]
  },
  {
    id: 11,
    name: "Vitamin C Brightening Face Wash",
    brand: "GlowSkin",
    cat: "Beauty",
    price: 299,
    mrp: 499,
    icon: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    reviews: 1560,
    inf: false,
    specs: [["Volume", "100ml"], ["Key Ingredient", "Vitamin C"], ["Paraben Free", "Yes"]]
  },
  {
    id: 12,
    name: "Wireless Charging Pad - 15W",
    brand: "TechGear",
    cat: "Electronics",
    price: 999,
    mrp: 1999,
    icon: "https://images.unsplash.com/photo-1586816832793-fe818617d598?auto=format&fit=crop&q=80&w=800",
    rating: 4.4,
    reviews: 430,
    inf: false,
    specs: [["Output", "15W"], ["Compatibility", "Qi-enabled"], ["Input", "USB-C"]]
  },
  {
    id: 13,
    name: "Women's High-Waist Yoga Leggings",
    brand: "FitIndia",
    cat: "Fashion",
    price: 899,
    mrp: 1499,
    icon: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    reviews: 2100,
    inf: true,
    creator: "@FitYoga",
    specs: [["Material", "Spandex Mix"], ["Waist", "High Waist"], ["Stretch", "4-Way"]]
  },
  {
    id: 14,
    name: "Baby Wooden Educational Toy Set",
    brand: "KidsJoy",
    cat: "Kids",
    price: 699,
    mrp: 1299,
    icon: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    reviews: 180,
    inf: false,
    specs: [["Material", "Natural Wood"], ["Age", "1-3 Years"], ["Paint", "Non-Toxic"]]
  },
  {
    id: 15,
    name: "Premium Matte Lipstick - Ruby Red",
    brand: "GlowSkin",
    cat: "Beauty",
    price: 499,
    mrp: 799,
    icon: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    reviews: 920,
    inf: true,
    creator: "@StyleByRiya",
    specs: [["Finish", "Matte"], ["Shade", "Ruby Red"], ["Longevity", "12 Hours"]]
  }
];

export const ORDERS = [];

export const CATEGORIES = [
  'Fashion', 'Electronics', 'Beauty', 'Sports', 'Home', 'Kids', 'Lifestyle'
];

