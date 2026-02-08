'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RegisterResult } from '../types';

interface RegisterParams {
  productId: string;
  locationId?: string;
  quantity: number;
  condition: string;
  notes?: string;
}

async function registerInventory(params: RegisterParams): Promise<RegisterResult> {
  const res = await fetch('/api/inventory/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? 'Failed to register');
  }
  return res.json();
}

export function useRegisterInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['scan'] });
    },
  });
}
