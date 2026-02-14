'use client';

import { useQuery } from '@tanstack/react-query';
import type { LocationItem } from '../types';

async function fetchLocations(): Promise<{ locations: LocationItem[] }> {
  const res = await fetch('/api/locations');
  if (!res.ok) throw new Error('Failed to fetch locations');
  return res.json();
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 30_000,
  });
}
