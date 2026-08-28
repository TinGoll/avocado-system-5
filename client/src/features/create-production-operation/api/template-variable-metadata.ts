import useSWR from 'swr';

import { fetcher } from '@shared/lib/swr';

export type TemplateVariableScope =
  | 'production-operation-formula'
  | 'production-operation-name'
  | 'product-output';

export type TemplateVariableMetadata = {
  path: string;
  label: string;
  description: string;
  valueType: 'string' | 'number' | 'boolean';
  unit?: string;
  optional?: boolean;
};

export type ProductionOperationVariableMetadata = TemplateVariableMetadata & {
  availability: 'formula-and-name' | 'name-only';
};

const getTemplateVariables = (scope: TemplateVariableScope) =>
  fetcher<{ variables: TemplateVariableMetadata[] }>({
    url: 'template-variables',
    params: { scope },
  });

export const mergeProductionOperationVariables = (
  formulaVariables: TemplateVariableMetadata[],
  nameVariables: TemplateVariableMetadata[],
): ProductionOperationVariableMetadata[] => {
  const formulaPaths = new Set(formulaVariables.map(({ path }) => path));

  return nameVariables.map((variable) => ({
    ...variable,
    availability: formulaPaths.has(variable.path)
      ? 'formula-and-name'
      : 'name-only',
  }));
};

const loadProductionOperationVariables = async () => {
  const [formula, name] = await Promise.all([
    getTemplateVariables('production-operation-formula'),
    getTemplateVariables('production-operation-name'),
  ]);

  return mergeProductionOperationVariables(formula.variables, name.variables);
};

export const useProductionOperationVariables = () =>
  useSWR(
    'production-operation-template-variables',
    loadProductionOperationVariables,
  );
