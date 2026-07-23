import React from 'react';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showStar?: boolean;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, size = 'sm', showStar = true }) => {
  const formatted = rating ? rating.toFixed(1) : 'N/A';
  
  let colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (rating >= 8.0) {
    colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (rating < 6.0) {
    colorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1 font-semibold',
    md: 'text-sm px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-base px-3 py-1.5 gap-2 font-extrabold'
  };

  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`inline-flex items-center rounded-full border backdrop-blur-md ${colorClass} ${sizes[size]}`}>
      {showStar && <Star className={`${starSizes[size]} fill-current shrink-0`} />}
      <span>{formatted}</span>
    </div>
  );
};
