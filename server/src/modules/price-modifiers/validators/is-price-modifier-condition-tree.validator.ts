import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';
import {
  getPriceModifierConditionPathField,
  isConditionOperatorAllowedForField,
  isConditionValueValidForField,
} from '../condition-paths/price-modifier-condition-paths';

export const PRICE_MODIFIER_CONDITION_MAX_DEPTH = 10;

type ConditionNode = Record<string, unknown>;

const leafKeys = ['operator', 'path', 'source', 'value'];
const groupKeys = ['AND', 'OR'];
const conditionSources = new Set<string>(Object.values(ConditionSource));
const conditionOperators = new Set<string>(Object.values(ConditionOperator));

const isConditionNode = (value: unknown): value is ConditionNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactlyKeys = (
  node: ConditionNode,
  expectedKeys: string[],
): boolean => {
  const keys = Object.keys(node).sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
};

const isValidLeaf = (node: ConditionNode): boolean => {
  if (
    !hasExactlyKeys(node, leafKeys) ||
    typeof node.source !== 'string' ||
    !conditionSources.has(node.source) ||
    typeof node.path !== 'string' ||
    node.path.trim().length === 0 ||
    typeof node.operator !== 'string' ||
    !conditionOperators.has(node.operator)
  ) {
    return false;
  }

  const field = getPriceModifierConditionPathField(
    node.source as ConditionSource,
    node.path,
  );
  return (
    field !== undefined &&
    isConditionOperatorAllowedForField(
      field,
      node.operator as ConditionOperator,
    ) &&
    isConditionValueValidForField(field, node.value)
  );
};

const isValidConditionTree = (
  value: unknown,
  depth: number,
  maxDepth: number,
): boolean => {
  if (!isConditionNode(value) || depth > maxDepth) {
    return false;
  }

  const keys = Object.keys(value);
  const isGroup = keys.some((key) => groupKeys.includes(key));

  if (!isGroup) {
    return isValidLeaf(value);
  }

  if (keys.length !== 1 || !groupKeys.includes(keys[0])) {
    return false;
  }

  const children = value[keys[0]];
  return (
    Array.isArray(children) &&
    children.length > 0 &&
    children.every((child) => isValidConditionTree(child, depth + 1, maxDepth))
  );
};

@ValidatorConstraint({ name: 'isPriceModifierConditionTree', async: false })
export class IsPriceModifierConditionTreeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    const [maxDepth = PRICE_MODIFIER_CONDITION_MAX_DEPTH] =
      args.constraints as [number?];
    return isValidConditionTree(value, 1, maxDepth);
  }

  defaultMessage(args: ValidationArguments): string {
    const [maxDepth = PRICE_MODIFIER_CONDITION_MAX_DEPTH] =
      args.constraints as [number?];
    return `${args.property} must be a valid condition tree with a maximum depth of ${maxDepth}`;
  }
}

export const IsPriceModifierConditionTree =
  (validationOptions?: ValidationOptions): PropertyDecorator =>
  (target: object, propertyName: string | symbol): void => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [PRICE_MODIFIER_CONDITION_MAX_DEPTH],
      validator: IsPriceModifierConditionTreeConstraint,
    });
  };
