import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';

export default function NotFound() {
  return (
    <PageWrapper>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-[#F5F5F5]">
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl mb-4"
        >
          🛍️
        </motion.div>
        <h1 className="text-[32px] font-black text-[#0D47A1] mb-2">404 — Page Not Found</h1>
        <p className="text-gray-500 text-[15px] max-w-sm mb-6">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link to="/" className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-6 py-2.5 rounded-md font-bold transition-colors">
            🏠 Go Home
          </Link>
          <Link to="/products" className="bg-white border-2 border-[#0D47A1] text-[#0D47A1] hover:bg-[#E3F2FD] px-6 py-2.5 rounded-md font-bold transition-colors">
            🛒 Browse Products
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
