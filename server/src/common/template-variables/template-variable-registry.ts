import { Injectable } from '@nestjs/common';
import {
  TEMPLATE_VARIABLE_SCOPE,
  TemplateVariableDefinition,
  TemplateVariableRegistryError,
  TemplateVariableScope,
} from './template-variables.types';

const FORMULA_AND_NAME_SCOPES = [
  TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA,
  TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
] as const;

const PRODUCT_OUTPUT_SCOPE = [TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT] as const;

export const TEMPLATE_VARIABLE_DEFINITIONS = [
  {
    path: 'item.width',
    label: 'Ширина позиции',
    description: 'Ширина позиции заказа',
    valueType: 'number',
    unit: 'мм',
    scopes: [...FORMULA_AND_NAME_SCOPES, ...PRODUCT_OUTPUT_SCOPE],
    optional: true,
  },
  {
    path: 'item.height',
    label: 'Высота позиции',
    description: 'Высота позиции заказа',
    valueType: 'number',
    unit: 'мм',
    scopes: [...FORMULA_AND_NAME_SCOPES, ...PRODUCT_OUTPUT_SCOPE],
    optional: true,
  },
  {
    path: 'item.thickness',
    label: 'Толщина позиции',
    description: 'Толщина позиции заказа',
    valueType: 'number',
    unit: 'мм',
    scopes: [...FORMULA_AND_NAME_SCOPES, ...PRODUCT_OUTPUT_SCOPE],
    optional: true,
  },
  {
    path: 'item.quantity',
    label: 'Количество',
    description: 'Количество позиций заказа',
    valueType: 'number',
    unit: 'шт.',
    scopes: [...FORMULA_AND_NAME_SCOPES, ...PRODUCT_OUTPUT_SCOPE],
  },
  {
    path: 'profile.width',
    label: 'Ширина профиля',
    description: 'Ширина выбранного профиля',
    valueType: 'number',
    unit: 'мм',
    scopes: FORMULA_AND_NAME_SCOPES,
    optional: true,
  },
  {
    path: 'profile.grooveDepth',
    label: 'Глубина паза профиля',
    description: 'Глубина паза выбранного профиля',
    valueType: 'number',
    unit: 'мм',
    scopes: FORMULA_AND_NAME_SCOPES,
    optional: true,
  },
  {
    path: 'panelWidth',
    label: 'Внутренняя ширина',
    description: 'Внутренняя ширина с учётом профиля',
    valueType: 'number',
    unit: 'мм',
    scopes: FORMULA_AND_NAME_SCOPES,
    optional: true,
  },
  {
    path: 'panelHeight',
    label: 'Внутренняя высота',
    description: 'Внутренняя высота с учётом профиля',
    valueType: 'number',
    unit: 'мм',
    scopes: FORMULA_AND_NAME_SCOPES,
    optional: true,
  },
  {
    path: 'item.name',
    label: 'Название продукта',
    description: 'Название продукта в позиции заказа',
    valueType: 'string',
    scopes: [
      TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
      TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT,
    ],
    optional: true,
  },
  {
    path: 'profile.name',
    label: 'Название профиля',
    description: 'Название выбранного профиля',
    valueType: 'string',
    scopes: [
      TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
      TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT,
    ],
    optional: true,
  },
  {
    path: 'panel.name',
    label: 'Название филёнки',
    description: 'Название выбранной филёнки',
    valueType: 'string',
    scopes: [
      TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
      TEMPLATE_VARIABLE_SCOPE.PRODUCT_OUTPUT,
    ],
    optional: true,
  },
  {
    path: 'material.name',
    label: 'Название материала',
    description: 'Название выбранного материала',
    valueType: 'string',
    scopes: PRODUCT_OUTPUT_SCOPE,
    optional: true,
  },
  {
    path: 'color.name',
    label: 'Название цвета',
    description: 'Название выбранного цвета',
    valueType: 'string',
    scopes: PRODUCT_OUTPUT_SCOPE,
    optional: true,
  },
  {
    path: 'patina.name',
    label: 'Название патины',
    description: 'Название выбранной патины',
    valueType: 'string',
    scopes: PRODUCT_OUTPUT_SCOPE,
    optional: true,
  },
  {
    path: 'varnish.name',
    label: 'Название лака',
    description: 'Название выбранного лака',
    valueType: 'string',
    scopes: PRODUCT_OUTPUT_SCOPE,
    optional: true,
  },
  {
    path: 'product.display',
    label: 'Представление продукта',
    description: 'Результат шаблона представления продукта',
    valueType: 'string',
    scopes: [TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME],
    optional: true,
  },
] as const satisfies readonly TemplateVariableDefinition[];

type RegisteredTemplateVariableDefinition =
  (typeof TEMPLATE_VARIABLE_DEFINITIONS)[number];

export type TemplateVariablePathForScope<
  Scope extends TemplateVariableScope,
  Definition = RegisteredTemplateVariableDefinition,
> = Definition extends RegisteredTemplateVariableDefinition
  ? Scope extends Definition['scopes'][number]
    ? Definition['path']
    : never
  : never;

@Injectable()
export class TemplateVariableRegistry {
  getByScope(scope: TemplateVariableScope): TemplateVariableDefinition[] {
    this.assertKnownScope(scope);
    return TEMPLATE_VARIABLE_DEFINITIONS.filter((definition) =>
      (definition.scopes as readonly TemplateVariableScope[]).includes(scope),
    );
  }

  getDefinition(
    path: string,
    scope: TemplateVariableScope,
  ): TemplateVariableDefinition | undefined {
    return this.getByScope(scope).find(
      (definition) => definition.path === path,
    );
  }

  isAvailable(path: string, scope: TemplateVariableScope): boolean {
    return this.getDefinition(path, scope) !== undefined;
  }

  private assertKnownScope(scope: TemplateVariableScope): void {
    if (!(Object.values(TEMPLATE_VARIABLE_SCOPE) as string[]).includes(scope)) {
      throw new TemplateVariableRegistryError(scope);
    }
  }
}
