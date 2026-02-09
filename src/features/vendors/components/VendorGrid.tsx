'use client';

import { VendorCard } from './VendorCard';
import type { VendorListItem } from '../types';

interface VendorGridProps {
  vendors: VendorListItem[];
  onVendorClick?: (id: string) => void;
}

export function VendorGrid({ vendors, onVendorClick }: VendorGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {vendors.map((vendor) => (
        <VendorCard
          key={vendor.id}
          vendor={vendor}
          onClick={onVendorClick ? () => onVendorClick(vendor.id) : undefined}
        />
      ))}
    </div>
  );
}
