import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';

export type CatalogRecord = {
  id: string | number;
};

export type CatalogOption = {
  label: string;
  value: string;
};

export type CatalogEditor =
  | {
      kind: 'text';
      placeholder?: string;
    }
  | {
      kind: 'number';
      min?: number;
      precision?: number;
    }
  | {
      kind: 'select';
      options: CatalogOption[];
    }
  | {
      kind: 'json';
      rows?: number;
    };

export type CatalogField<T extends CatalogRecord> = {
  title: string;
  dataIndex: string | readonly string[];
  editor?: CatalogEditor;
  inline?: boolean;
  form?: boolean;
  table?: boolean;
  required?: boolean;
  rules?: Rule[];
  width?: number;
  align?: 'left' | 'right' | 'center';
  render?: (value: unknown, record: T) => ReactNode;
};

export type CatalogKind =
  | 'customers'
  | 'materials'
  | 'colors'
  | 'facade-panels'
  | 'facade-profiles'
  | 'patinas'
  | 'varnishes'
  | 'production-operations'
  | 'products';
