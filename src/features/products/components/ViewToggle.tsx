'use client';

import { useTranslations } from 'next-intl';
import { ViewToggle as BaseViewToggle } from '@/components/ViewToggle';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations('products');
  return <BaseViewToggle view={view} onViewChange={onViewChange} listLabel={t('view.list')} cardLabel={t('view.card')} />;
}
