import { useEffect } from 'react';
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore';

interface Props {
  productId: string;
}

export default function RecentlyViewedTracker({ productId }: Props): null {
  const recordView = useRecentlyViewedStore((s) => s.recordView);

  useEffect(() => {
    recordView(productId);
  }, [productId, recordView]);

  return null;
}
