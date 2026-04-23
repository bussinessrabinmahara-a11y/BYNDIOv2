import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import { CATEGORIES_DATA } from '../data/categories';
import { Skeleton } from '../components/Skeleton';

export default function Products() {
  usePageTitle('Browse Products');
  const [searchParams] = useSearchParams();
  const query = searchParams.get('search') || searchParams.get('q') || '';
  const catParam = searchParams.get('cat') || '';
  const subParam = searchParams.get('sub') || '';
  const refCode = searchParams.get('ref') || '';
  const { products: storeProducts } = useAppStore();
  const loaderRef = useRef<HTMLDivElement>(null);

  // M-06: Dynamic categories from DB
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  useEffect(() => {
    supabase.from('products').select('category').eq('is_active', true)
      .then(({ data, error }) => {
        if (!error && data) {
          const uniqueCats = [...new Set(data.map(d => d.category).filter(Boolean))];
          if (uniqueCats.length > 0) setDbCategories(uniqueCats);
        }
      });
  }, []);

  const CATEGORIES = useMemo(() => {
    if (dbCategories.length > 0) return dbCategories;
    const allCats = [...new Set(storeProducts.map(p => p.category || p.cat))];
    return allCats.length > 0 ? allCats : ['Fashion', 'Electronics', 'Beauty', 'Kids', 'Sports'];
  }, [storeProducts, dbCategories]);
  
  // Server-side products state (H-03, H-04, M-05, M-06)
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isDBLoading, setIsDBLoading] = useState(true);

  // Track affiliate click when ref code present
  useEffect(() => {
    if (refCode) {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.from('affiliate_links').select('id, clicks').eq('link_code', refCode).single()
          .then(({ data }) => {
            if (data) supabase.from('affiliate_links').update({ clicks: data.clicks + 1 }).eq('id', data.id).then(() => {});
          });
      });
    }
  }, [refCode]);

  const [cats, setCats] = useState<string[]>([]); // Initialize empty to mean "all" unless catParam exists
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const [sort, setSort] = useState('pop');
  const [infOnly, setInfOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const allPrices = useMemo(() => storeProducts.map(p => p.price), [storeProducts]);
  const globalMin = Math.min(...allPrices, 0);
  const globalMax = Math.max(...allPrices, 100000);
  const [priceRange, setPriceRange] = useState<[number, number]>([globalMin, globalMax]);

  // Resolve category param (ID or name) to actual DB category name(s)
  const resolveCatParam = useCallback((param: string, dbCats: string[]): string[] => {
    if (!param) return [];

    // 1. Direct match (case-insensitive)
    const direct = dbCats.find(c => c.toLowerCase() === param.toLowerCase());
    if (direct) return [direct];

    // 2. Match by CATEGORIES_DATA id (e.g., 'fashion' → 'Fashion', 'beauty' → 'Beauty & Personal Care')
    const catDataEntry = CATEGORIES_DATA.find(c => c.id.toLowerCase() === param.toLowerCase());
    if (catDataEntry) {
      const nameMatch = dbCats.find(c => c.toLowerCase() === catDataEntry.name.toLowerCase());
      if (nameMatch) return [nameMatch];
      // Partial name match (first word)
      const firstName = catDataEntry.name.split(' ')[0].toLowerCase();
      const partial = dbCats.filter(c => c.toLowerCase().startsWith(firstName));
      if (partial.length > 0) return partial;
      return [catDataEntry.name]; // fallback to exact CATEGORIES_DATA name
    }

    // 3. Slug match (home-kitchen → Home & Kitchen)
    const slug = dbCats.find(c =>
      c.toLowerCase().replace(/[&\s]+/g, '-') === param.toLowerCase()
    );
    if (slug) return [slug];

    // 4. Partial / contains match
    const partials = dbCats.filter(c =>
      c.toLowerCase().includes(param.toLowerCase()) ||
      param.toLowerCase().includes(c.toLowerCase())
    );
    if (partials.length > 0) return partials;

    return [param];
  }, []);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
    setRealProducts([]);
  }, [query, subParam, sort, infOnly, priceRange]);

  // H-03, H-04, M-05, M-06: Server-side Fetching Logic
  useEffect(() => {
    fetchRealProducts();
  }, [page, cats, sort, priceRange, query, subParam, infOnly]);

  const fetchRealProducts = async () => {
    setIsDBLoading(true);
    try {
      let q = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .eq('approval_status', 'approved');

      // H-04: Real Search against DB
      const searchTerm = (query || subParam).trim();
      if (searchTerm) {
        const words = searchTerm.split(/\s+/).filter(w => w.length > 1);
        if (words.length > 1) {
          // Multi-word: AND between words (each word must match at least one field)
          words.forEach(w => {
            q = q.or(`name.ilike.%${w}%,category.ilike.%${w}%,description.ilike.%${w}%`);
          });
        } else {
          q = q.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
      }

      // H-03: Category Filter — only apply if not searching (search is cross-category)
      if (cats.length > 0 && !searchTerm) {
        q = q.in('category', cats);
      } else if (cats.length > 0 && cats.length < CATEGORIES.length && searchTerm) {
        // If searching within a category, apply both
        q = q.in('category', cats);
      }

      // H-03: Price Range Filter
      if (priceRange[0] > 0) q = q.gte('price', priceRange[0]);
      if (priceRange[1] < globalMax) q = q.lte('price', priceRange[1]);

      if (infOnly) {
        q = q.eq('is_creator_pick', true);
      }

      // M-05: Product Sorting
      if (sort === 'lh') q = q.order('price', { ascending: true });
      else if (sort === 'hl') q = q.order('price', { ascending: false });
      else if (sort === 'rating') q = q.order('avg_rating', { ascending: false });
      else if (sort === 'disc') q = q.order('price', { ascending: true });
      else if (sort === 'new') q = q.order('created_at', { ascending: false });
      else q = q.order('created_at', { ascending: false }); // Popularity fallback

      // M-06: Server-side Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;

      // Map DB fields to Product interface expected by ProductCard
      const mapped = (data || []).map((p: any) => ({
        ...p,
        cat: p.category || '',
        icon: p.images?.[0] || p.icon || '📦',
        rating: p.avg_rating ?? p.rating ?? 4.5,
        reviews: p.review_count ?? p.reviews ?? 0,
        mrp: p.mrp || p.price,
        brand: p.brand || p.description?.replace('Brand: ', '') || '',
        inf: p.is_creator_pick ?? p.inf ?? false,
        creator: p.creator_name || p.creator || null,
        specs: p.specifications ? Object.entries(p.specifications) : (p.specs || []),
        seller_state: p.seller_state || null,
        seller_has_gst: p.seller_has_gst ?? false,
        is_sponsored: p.is_sponsored ?? false,
      }));

      setRealProducts(prev => page === 1 ? mapped : [...prev, ...mapped]);
      setTotalProducts(count || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setIsDBLoading(false);
    }
  };

  useEffect(() => {
    if (catParam) {
      // Resolve catParam (could be ID like 'fashion' or name like 'Fashion')
      const resolved = resolveCatParam(catParam, CATEGORIES);
      setCats(resolved);
    } else {
      // No catParam = show all categories
      setCats([]);
    }
    setPage(1);
    setRealProducts([]);
  }, [catParam, CATEGORIES, resolveCatParam]);

  // M-05: Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isDBLoading && realProducts.length < totalProducts) {
        setPage(p => p + 1);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [isDBLoading, realProducts.length, totalProducts]);

  const clearFilters = () => {
    setCats([]);
    setSort('pop');
    setInfOnly(false);
    setPriceRange([globalMin, globalMax]);
    setPage(1);
    setRealProducts([]);
  };

  const isFiltered = infOnly || priceRange[0] > globalMin || priceRange[1] < globalMax
    || (catParam ? !(cats || []).includes(catParam) : (cats || []).length < (CATEGORIES || []).length);

  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);



  const toggleCat = (cat: string) => {
    setPage(1);
    setCats(prev => (prev || []).includes(cat) ? (prev || []).filter(c => c !== cat) : [...(prev || []), cat]);
  };

  const FilterPanel = () => (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <strong className="text-sm">Filters</strong>
        {isFiltered && (
          <button onClick={clearFilters} className="text-xs text-[#1565C0] font-semibold hover:underline flex items-center gap-1">
            <X size={12} /> Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-gray-500 mb-2.5">Category</div>
        {CATEGORIES.map(c => (
          <label key={c} className="flex items-center gap-2 py-1.5 cursor-pointer text-[13px]">
            <input type="checkbox" checked={(cats || []).includes(c)} onChange={() => toggleCat(c)} className="accent-[#1565C0] cursor-pointer" />
            <span>{c === 'Beauty' ? 'Beauty & Care' : c === 'Kids' ? 'Kids & Baby' : c === 'Sports' ? 'Sports & Fitness' : c}</span>
          </label>
        ))}
      </div>

      {/* Price Range */}
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-gray-500 mb-2.5">Price Range</div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-gray-500 font-bold">Min Price: ₹{priceRange[0].toLocaleString('en-IN')}</label>
          <input
            type="range"
            min={globalMin}
            max={globalMax}
            value={priceRange[0]}
            onChange={e => setPriceRange([Math.min(parseInt(e.target.value), priceRange[1]), priceRange[1]])}
            className="w-full accent-[#1565C0]"
          />
          <label className="text-[10px] text-gray-500 font-bold mt-2">Max Price: ₹{priceRange[1].toLocaleString('en-IN')}</label>
          <input
            type="range"
            min={globalMin}
            max={globalMax}
            value={priceRange[1]}
            onChange={e => setPriceRange([priceRange[0], Math.max(parseInt(e.target.value), priceRange[0])])}
            className="w-full accent-[#1565C0]"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <input
            type="number"
            value={priceRange[0]}
            onChange={e => setPriceRange([Math.max(globalMin, parseInt(e.target.value) || globalMin), priceRange[1]])}
            className="w-full p-1.5 border border-gray-300 rounded text-[12px] outline-none focus:border-[#1565C0]"
            placeholder="Min"
          />
          <input
            type="number"
            value={priceRange[1]}
            onChange={e => setPriceRange([priceRange[0], Math.min(globalMax, parseInt(e.target.value) || globalMax)])}
            className="w-full p-1.5 border border-gray-300 rounded text-[12px] outline-none focus:border-[#1565C0]"
            placeholder="Max"
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-gray-500 mb-2.5">Sort By</div>
        {[
          { id: 'pop', label: 'Popularity' },
          { id: 'rating', label: 'Customer Rating' },
          { id: 'new', label: 'Newest First' },
          { id: 'lh', label: 'Price: Low to High' },
          { id: 'hl', label: 'Price: High to Low' },
          { id: 'disc', label: 'Best Discount' },
        ].map(opt => (
          <label key={opt.id} className="flex items-center gap-2 py-1.5 cursor-pointer text-[13px]">
            <input type="radio" name="sort" checked={sort === opt.id} onChange={() => setSort(opt.id)} className="accent-[#1565C0]" />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Creator Picks */}
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-gray-500 mb-2.5">Creator Picks</div>
        <label className="flex items-center gap-2 cursor-pointer text-[13px]">
          <input type="checkbox" checked={infOnly} onChange={() => setInfOnly(!infOnly)} className="accent-[#7B1FA2]" />
          <span className="text-[#7B1FA2] font-semibold">⭐ Creator Picks Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <PageWrapper>
      <div className="flex flex-col min-h-[calc(100vh-115px)] bg-[#F5F5F5]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-gray-500 px-3 md:px-4 py-2 bg-white border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <Link to="/" className="text-[#1565C0] font-bold">Home</Link>
        <span>›</span>
        <span className="font-extrabold text-gray-800">
          {query ? `Search: "${query}"` : catParam || 'All Products'}
        </span>
        <span className="text-gray-400">({totalProducts})</span>

        {isFiltered && (
          <button onClick={clearFilters} className="ml-2 flex items-center gap-1 text-[#1565C0] font-black uppercase text-[9px]">
            <X size={10} /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-[220px] bg-white border-r border-gray-200 p-4 shrink-0 sticky top-[106px] self-start max-h-[calc(100vh-106px)] overflow-y-auto">
          <FilterPanel />
        </div>

        {/* Mobile filter toggle */}
        <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-white border-b border-gray-200">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-[11px] font-black text-gray-700 border border-gray-200 px-2 py-1 rounded shadow-sm bg-gray-50"
          >
            <SlidersHorizontal size={12} />
            Filters {isFiltered && <span className="bg-[#0D47A1] text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center">!</span>}
          </button>
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[9px] font-black text-gray-400 uppercase">Sort:</span>
            <select value={sort} onChange={e => setSort(e.target.value)} className="text-[11px] font-bold border-none rounded-md px-1 py-1 outline-none bg-transparent text-[#0D47A1]">
              <option value="pop">Popularity</option>
              <option value="rating">Rating</option>
              <option value="new">Newest</option>
              <option value="lh">Price ↑</option>
              <option value="hl">Price ↓</option>
              <option value="disc">Discount</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="md:hidden bg-white border-b border-gray-200 p-4">
            <FilterPanel />
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 p-2 md:p-4">
          {isDBLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
              <Skeleton count={12} />
            </div>
          ) : realProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
              <span className="text-5xl">🔍</span>
              <h3 className="text-lg font-extrabold">No products found</h3>
              <p className="text-gray-500 max-w-xs text-sm">Try adjusting your filters or search for something else.</p>
              <button onClick={clearFilters} className="bg-[#0D47A1] text-white px-5 py-2 rounded-md font-bold text-sm hover:bg-[#1565C0] transition-colors">
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <motion.div 
                key={`${page}-${cats.join('')}-${sort}`}
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.03 } },
                  hidden: {}
                }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4"
              >
                {realProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </motion.div>
              {realProducts.length < totalProducts && (
                <div ref={loaderRef} className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D47A1]"></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </PageWrapper>
  );
}
