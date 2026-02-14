'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  margin?: number;
}

export function Barcode({ value, height = 40, width = 1.5, fontSize = 12, margin = 4 }: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        height,
        width,
        fontSize,
        margin,
        displayValue: true,
      });
    }
  }, [value, height, width, fontSize, margin]);

  return <svg ref={svgRef} />;
}
