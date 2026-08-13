import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type {
  CreatePriceModifierDto,
  PriceModifier,
  PriceModifierInput,
  PriceModifierUpdateInput,
  UpdatePriceModifierDto,
} from '../model/priceModifiers.types';

type PriceModifiersData = {
  modifiers: PriceModifier[];
  map: Record<PriceModifier['id'], PriceModifier>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};

const productTemplateIds = (input: PriceModifierInput['productTemplates']) =>
  input.map(({ id }) => String(id));

export const toCreatePriceModifierDto = (
  input: PriceModifierInput,
): CreatePriceModifierDto => ({
  name: input.name,
  type: input.type,
  value: input.value,
  priority: input.priority,
  conditions: input.conditions,
  productTemplateIds: productTemplateIds(input.productTemplates),
});

export const toUpdatePriceModifierDto = (
  input: PriceModifierUpdateInput,
): UpdatePriceModifierDto => {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.value === undefined ? {} : { value: input.value }),
    ...(input.priority === undefined ? {} : { priority: input.priority }),
    ...(input.conditions === undefined ? {} : { conditions: input.conditions }),
    ...(input.productTemplates === undefined
      ? {}
      : {
          productTemplateIds: productTemplateIds(input.productTemplates),
        }),
  };
};

export const usePriceModifiers = () =>
  useEntity<
    PriceModifier,
    PriceModifiersData,
    CreatePriceModifierDto,
    UpdatePriceModifierDto
  >({
    endpoint: Endpoints.PRICE_MODIFIERS,
    transform: ({ items, ...data }) => {
      const modifiers = (items ?? []).map((modifier) => ({
        ...modifier,
        productTemplates: modifier.productTemplates ?? [],
      }));

      return {
        modifiers,
        map: Object.fromEntries(
          modifiers.map((modifier) => [modifier.id, modifier]),
        ),
        ...data,
      };
    },
  });
