'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VendorImportPreviewRow, VendorImportResult } from '../types';

export function useVendorImport() {
  const qc = useQueryClient();
  const [previewRows, setPreviewRows] = useState<VendorImportPreviewRow[] | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const parseMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('action', 'preview');

      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse file');
      }
      return res.json() as Promise<{ rows: VendorImportPreviewRow[] }>;
    },
    onSuccess: (data) => {
      setPreviewRows(data.rows);
    },
  });

  const importMutation = useMutation({
    mutationFn: async (options: { duplicateAction: 'skip' | 'update'; emptyValueAction: 'ignore' | 'overwrite' }) => {
      if (!file) throw new Error('No file selected');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'execute');
      formData.append('duplicateAction', options.duplicateAction);
      formData.append('emptyValueAction', options.emptyValueAction);

      const res = await fetch('/api/vendors/import', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      return res.json() as Promise<VendorImportResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setPreviewRows(null);
    parseMutation.mutate(selectedFile);
  };

  const reset = () => {
    setFile(null);
    setPreviewRows(null);
  };

  return {
    file,
    previewRows,
    isParsing: parseMutation.isPending,
    parseError: parseMutation.error?.message,
    isImporting: importMutation.isPending,
    importResult: importMutation.data,
    importError: importMutation.error?.message,
    handleFileSelect,
    executeImport: importMutation.mutate,
    reset,
  };
}
