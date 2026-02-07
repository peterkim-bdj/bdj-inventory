'use client';

import type { ProductItem } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: ProductItem[];
  onProductClick?: (id: string) => void;
}

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={onProductClick ? () => onProductClick(product.id) : undefined}
        />
      ))}
    </div>
  );
}
