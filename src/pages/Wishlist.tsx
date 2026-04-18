import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import { useAppStore } from '../store';
import ProductCard from '../components/ProductCard';

interface WishlistProps {
  onOpenLogin?: () => void;
}

export default function Wishlist({ onOpenLogin }: WishlistProps) {
  usePageTitle('My Wishlist');
  const { wishlist, products, user } = useAppStore();
  const items = products.filter(p => wishlist.includes(p.id));

  if (!user) {
    return (
      <div className="bg-[#F5F5F5] min-h-[calc(100vh-115px)] flex flex-col items-center justify-center text-center p-6">
        <span className="text-6xl mb-4">❤️</span>
        <h2 className="text-xl font-black mb-2">Save your favourites</h2>
        <p className="text-gray-500 mb-5 max-w-xs">
          Login to save products to your wishlist and access them anytime, across devices.
        </p>
        <button
          onClick={onOpenLogin}
          className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-6 py-2.5 rounded-md font-bold transition-colors"
        >
          Login to See Wishlist
        </button>
        {items.length > 0 && (
          <div className="mt-8 w-full max-w-4xl">
            <p className="text-sm text-gray-500 mb-3">Items saved this session ({items.length}):</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#F5F5F5] min-h-[calc(100vh-115px)] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-black flex items-center gap-2">
            ❤️ My Wishlist
            <span className="bg-[#E3F2FD] text-[#0D47A1] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {items.length} items
            </span>
          </span>
          {items.length > 0 && (
            <Link to="/products" className="text-[12px] text-[#1565C0] font-semibold hover:underline">
              + Add More
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
            <span className="text-6xl">❤️</span>
            <h3 className="text-lg font-extrabold">Your wishlist is empty</h3>
            <p className="text-gray-500 max-w-xs">Save products you love and come back to them anytime.</p>
            <Link
              to="/products"
              className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-6 py-2.5 rounded-md font-bold mt-3 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
