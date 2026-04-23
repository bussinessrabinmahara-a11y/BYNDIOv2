import React from 'react';

interface SkeletonProps {
  count?: number;
  className?: string;
  variant?: 'product' | 'text' | 'rect' | 'circle';
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  count = 1, 
  className = '', 
  variant = 'product',
  height,
  width 
}) => {
  const shimmerClass = "shimmer bg-gray-200";

  const renderSkeleton = (index: number) => {
    switch (variant) {
      case 'product':
        return (
          <div key={index} className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 ${className}`}>
            <div className={`w-full aspect-[4/5] ${shimmerClass}`} />
            <div className="p-3 space-y-2">
              <div className={`h-3 w-3/4 rounded ${shimmerClass}`} />
              <div className={`h-3 w-1/2 rounded ${shimmerClass}`} />
              <div className="flex items-center justify-between pt-2">
                <div className={`h-4 w-1/3 rounded ${shimmerClass}`} />
                <div className={`h-6 w-1/4 rounded-full ${shimmerClass}`} />
              </div>
            </div>
          </div>
        );
      case 'circle':
        return <div key={index} className={`rounded-full ${shimmerClass} ${className}`} style={{ height, width }} />;
      case 'rect':
        return <div key={index} className={`rounded-lg ${shimmerClass} ${className}`} style={{ height, width }} />;
      case 'text':
        return <div key={index} className={`h-3 rounded ${shimmerClass} ${className}`} style={{ height, width: width || '100%' }} />;
      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
    </>
  );
};
