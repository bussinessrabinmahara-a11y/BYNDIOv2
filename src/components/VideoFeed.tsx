import React, { useState, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Heart, MessageSquare, Share2, ShoppingBag, Music, Pause, Play, User as UserIcon } from 'lucide-react';
import { ShortVideo, Product } from '../types';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

interface VideoItemProps {
  video: ShortVideo;
  isActive: boolean;
  onLike: (id: string) => void;
}

function VideoItem({ video, isActive, onLike }: VideoItemProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(video.is_liked || false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { products } = useAppStore();

  const taggedProducts = (video.tagged_products || [])
    .map(id => products.find(p => p.id.toString() === id.toString()))
    .filter(Boolean) as Product[];

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
        
        // TRACKING: Log Video View
        const storedCref = localStorage.getItem('byndio_cref');
        const storedAref = localStorage.getItem('byndio_aref');
        const referrer = storedCref || storedAref;
        
        if (referrer) {
          import('../lib/tracking').then(({ trackActivity, getVisitorId }) => {
            trackActivity({
              video_id: video.id,
              referrer_id: referrer,
              visitor_id: getVisitorId(),
              type: 'view',
              metadata: { source: 'short_video_feed' }
            });
          });
        }
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  }, [isActive, video.id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      onLike(video.id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const handleShare = () => {
    const { user } = useAppStore.getState();
    const shareUrl = `${window.location.origin}/reels?v=${video.id}${user ? `&cref=${user.id}` : ''}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Watch @${video.creator_name} on BYNDIO`,
        text: video.description,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied with your referral code!');
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden snap-center">
      {/* Background Blur for non-9:16 videos */}
      <div 
        className="absolute inset-0 opacity-30 grayscale blur-3xl scale-110"
        style={{ backgroundImage: `url(${video.thumbnail_url})`, backgroundSize: 'cover' }}
      />

      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url}
        className="relative z-10 w-full h-full object-contain cursor-pointer"
        loop
        playsInline
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      />

      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play size={64} className="text-white/80 fill-white/20" />
        </div>
      )}

      {showHeartAnim && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <Heart size={100} className="text-white fill-white animate-bounce-short" />
        </div>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none">
        
        <div className="flex justify-between items-end gap-10">
          <div className="flex-1 text-white pointer-events-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <UserIcon size={20} />
              </div>
              <div>
                <div className="text-[14px] font-black drop-shadow-md">
                  @{video.creator_name || 'creator'}
                  <span className="ml-1 text-[#40C4FF] text-[10px]">✓</span>
                </div>
                <button className="text-[10px] font-bold text-white/80 hover:text-white transition-colors">Follow</button>
              </div>
            </div>
            
            <p className="text-[13px] line-clamp-2 mb-3 leading-snug drop-shadow-sm font-medium opacity-90">
              {video.description}
            </p>

            <div className="flex items-center gap-2 text-[11px] font-bold opacity-80 mb-4">
              <Music size={12} className="animate-spin-slow" />
              <span className="truncate">Original Audio • BYNDIO Artist</span>
            </div>

            {/* Tagged Products Strip */}
            {taggedProducts.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide py-1">
                {taggedProducts.map(p => (
                  <Link key={p.id} to={`/product/${p.id}`} className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-1.5 shrink-0 hover:bg-white/20 transition-all group">
                    <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center text-lg overflow-hidden shrink-0">
                      {p.icon.startsWith('http') ? <img src={p.icon} className="w-full h-full object-cover" /> : p.icon}
                    </div>
                    <div className="max-w-[80px]">
                      <div className="text-[10px] font-bold truncate group-hover:text-[#40C4FF]">{p.name}</div>
                      <div className="text-[11px] font-black">₹{p.price.toLocaleString('en-IN')}</div>
                    </div>
                    <ShoppingBag size={12} className="ml-1 text-[#FFCA28]" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-5 pb-4 pointer-events-auto">
            <div className="flex flex-col items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); onLike(video.id); }}
                className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${isLiked ? 'bg-red-500/80 border-red-400 scale-110' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
              >
                <Heart size={24} fill={isLiked ? 'white' : 'transparent'} className={isLiked ? 'text-white' : 'text-white'} />
              </button>
              <span className="text-[11px] font-black text-white mt-1 drop-shadow-md">{(video.likes_count + (isLiked && !video.is_liked ? 1 : 0)).toLocaleString()}</span>
            </div>

            <div className="flex flex-col items-center">
              <button className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all">
                <MessageSquare size={24} className="text-white" />
              </button>
              <span className="text-[11px] font-black text-white mt-1 drop-shadow-md">124</span>
            </div>

            <div className="flex flex-col items-center">
              <button 
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <Share2 size={24} className="text-white" />
              </button>
              <span className="text-[11px] font-black text-white mt-1 drop-shadow-md">Share</span>
            </div>

            <div className="mt-2 animate-spin-slow">
              <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white p-0.5">
                <div className="w-full h-full bg-gradient-to-tr from-[#7B1FA2] to-[#FFCA28] rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoFeed({ videos }: { videos: ShortVideo[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    axis: 'y', 
    loop: false,
    containScroll: 'keepSnaps',
    dragFree: false
  });
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => {
      setActiveIdx(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

  const handleLike = async (id: string) => {
    // In production, sync with Supabase
    console.log('Liked video', id);
  };

  if (videos.length === 0) {
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-gray-500 bg-black rounded-2xl">
        <div className="text-5xl mb-4">🎬</div>
        <p className="text-xl font-bold">No videos yet</p>
        <p className="text-sm">Be the first to upload a creator reel!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] md:h-[700px] overflow-hidden bg-black md:rounded-2xl md:shadow-2xl md:border-8 md:border-gray-900 mx-auto max-w-[450px]">
      <div className="h-full overflow-hidden" ref={emblaRef}>
        <div className="h-full flex flex-col">
          {videos.map((video, idx) => (
            <div key={video.id} className="min-h-full w-full shrink-0 grow-0 h-full relative">
              <VideoItem 
                video={video} 
                isActive={activeIdx === idx} 
                onLike={handleLike}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Header */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <button className="text-[16px] font-black text-white/50 border-b-2 border-transparent pb-1">Following</button>
          <button className="text-[16px] font-black text-white border-b-2 border-white pb-1">For You</button>
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-[#FFCA28] flex items-center justify-center bg-black/40 text-white pointer-events-auto">
          🔍
        </div>
      </div>

      {/* Vertical Navigation Hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 opacity-40">
        {videos.map((_, i) => (
          <div key={i} className={`w-1 h-4 rounded-full transition-all ${activeIdx === i ? 'h-8 bg-white opacity-100' : 'bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
}
