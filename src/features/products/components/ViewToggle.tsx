'use client';

import { useTranslations } from 'next-intl';
import { ViewToggle as BaseViewToggle } from '@/components/ViewToggle';

interface ViewToggleProps {
  view: 'list' | 'card';
  onViewChange: (view: 'list' | 'card') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const t = useTranslations('products');
  return (
    <BaseViewToggle
      view={view}
      onViewChange={onViewChange}
      options={[
        { value: 'list', label: t('view.list') },
        { value: 'card', label: t('view.card') },
      ]}
    />
  );
}
