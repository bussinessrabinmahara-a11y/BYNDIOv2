import React, { useState, useEffect } from 'react';
import VideoFeed from '../components/VideoFeed';
import { ShortVideo } from '../types';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

export default function Videos() {
  usePageTitle('Explore Reels | BYNDIO');
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      // Mock videos for now, in prod fetch from Supabase
      const mockVideos: ShortVideo[] = [];
      
      try {
        const { data, error } = await supabase
          .from('short_videos')
          .select('*, creator:users(full_name)')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setVideos(data.map((v: any) => ({
            ...v,
            creator_name: v.creator?.full_name || 'Creator'
          })));
        } else {
          setVideos([]);
        }
      } catch (err) {
        setVideos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black md:bg-gray-100 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile Back Button */}
      <Link to="/" className="absolute top-4 left-4 z-[110] md:hidden w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
        <ArrowLeft size={20} />
      </Link>

      {/* Desktop Sidebar (Optional Design) */}
      <div className="hidden md:flex flex-col w-[300px] bg-white border-r border-gray-200 h-full p-6 shrink-0">
        <Link to="/" className="flex items-center gap-2 mb-10 group">
          <ArrowLeft size={18} className="text-gray-400 group-hover:text-[#0D47A1] transition-colors" />
          <span className="text-[14px] font-bold text-gray-500 group-hover:text-[#0D47A1]">Back to Shopping</span>
        </Link>

        <div className="flex items-center gap-2 mb-6 text-[#7B1FA2]">
          <Sparkles size={24} fill="currentColor" />
          <h1 className="text-2xl font-black">Explore Reels</h1>
        </div>

        <p className="text-[13px] text-gray-500 leading-relaxed mb-8">
          Discover products through the eyes of India's top creators. Watch, tag, and shop directly from videos.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <h3 className="text-[14px] font-black text-[#7B1FA2] mb-1">Trending Topics</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {['#fashion', '#tech', '#beauty', '#home'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-white rounded-full text-[11px] font-bold text-purple-600 border border-purple-200 cursor-pointer hover:bg-purple-600 hover:text-white transition-all">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Video Feed Container */}
      <div className="flex-1 relative bg-black md:p-10 flex items-center justify-center">
        {isLoading ? (
          <div className="w-full h-full max-w-[450px] aspect-[9/16] bg-gray-900 rounded-3xl overflow-hidden relative shadow-2xl">
            <Skeleton variant="rect" className="w-full h-full opacity-20" />
            <div className="absolute bottom-10 left-6 right-6 space-y-3">
              <Skeleton variant="text" width="60%" className="opacity-30" />
              <Skeleton variant="text" width="40%" className="opacity-30" />
              <div className="flex gap-2">
                <Skeleton variant="circle" width="30px" height="30px" className="opacity-30" />
                <Skeleton variant="text" width="100px" className="opacity-30" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full max-w-[450px] shadow-2xl relative">
            <VideoFeed videos={videos} />
          </div>
        )}
      </div>
    </div>
  );
}
