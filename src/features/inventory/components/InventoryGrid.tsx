'use client';

import { InventoryCard } from './InventoryCard';
import type { InventoryItemDetail } from '../types';

interface InventoryGridProps {
  items: InventoryItemDetail[];
  onItemClick?: (id: string) => void;
  onPrint?: (item: InventoryItemDetail) => void;
}

export function InventoryGrid({ items, onItemClick, onPrint }: InventoryGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <InventoryCard
          key={item.id}
          item={item}
          onClick={onItemClick ? () => onItemClick(item.id) : undefined}
          onPrint={onPrint ? () => onPrint(item) : undefined}
        />
      ))}
    </div>
  );
}
