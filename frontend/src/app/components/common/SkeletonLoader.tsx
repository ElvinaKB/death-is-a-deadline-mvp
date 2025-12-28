import { Skeleton } from '../ui/skeleton';
import { cn } from '../ui/utils';

interface SkeletonLoaderProps {
  type?: 'text' | 'card' | 'table' | 'avatar' | 'custom';
  count?: number;
  className?: string;
  height?: string | number;
  width?: string | number;
}

export function SkeletonLoader({
  type = 'text',
  count = 1,
  className,
  height,
  width,
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return <Skeleton className={cn('h-4 w-full', className)} style={{ height, width }} />;
      
      case 'card':
        return (
          <div className={cn('space-y-3 p-4 border rounded-lg', className)}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        );
      
      case 'table':
        return (
          <div className={cn('space-y-2', className)}>
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: count }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full" />
            ))}
          </div>
        );
      
      case 'avatar':
        return <Skeleton className={cn('h-12 w-12 rounded-full', className)} style={{ height, width }} />;
      
      case 'custom':
        return <Skeleton className={className} style={{ height, width }} />;
      
      default:
        return <Skeleton className={cn('h-4 w-full', className)} />;
    }
  };

  if (type === 'table' || type === 'card' || type === 'avatar' || type === 'custom') {
    return renderSkeleton();
  }

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="mb-2">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}
