'use client';

import { useState, useCallback } from 'react';
import { LABEL_PRESETS, LABEL_SIZE_STORAGE_KEY, type LabelSize } from '../types';

export function useLabelSize() {
  const [labelSize, setLabelSizeState] = useState<LabelSize>(() => {
    if (typeof window === 'undefined') return LABEL_PRESETS[0];

    try {
      const stored = localStorage.getItem(LABEL_SIZE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LabelSize;
        if (parsed.width > 0 && parsed.height > 0) return parsed;
      }
    } catch { /* ignore */ }

    return LABEL_PRESETS[0];
  });

  const setLabelSize = useCallback((size: LabelSize) => {
    setLabelSizeState(size);
    try {
      localStorage.setItem(LABEL_SIZE_STORAGE_KEY, JSON.stringify(size));
    } catch { /* ignore */ }
  }, []);

  return { labelSize, setLabelSize };
}
