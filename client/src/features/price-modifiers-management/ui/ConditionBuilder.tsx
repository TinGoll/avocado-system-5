import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Input,
  InputNumber,
  Segmented,
  Select,
  Space,
} from 'antd';
import { useMemo } from 'react';

import {
  CONDITION_OPERATOR,
  CONDITION_SOURCE,
  type ConditionGroup,
  type LeafCondition,
  type PriceModifierCondition,
} from '@entities/price-modifiers';

import {
  getFieldTypeFromPath,
  isSchemaLeaf,
  schemas,
} from '../model/pathSchema';
import { usePriceModifierStore } from '../model/priceModifierStore';

import { PathSelector } from './PathSelector';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getIn = (obj: any, path: (string | number)[]) => {
  return path.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
    obj,
  );
};

interface ConditionBuilderProps {
  name: (string | number)[];
  onRemove?: () => void;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  name,
  onRemove,
}) => {
  const condition = usePriceModifierStore(
    (state) => getIn(state.modifier, name) as PriceModifierCondition,
  );

  const {
    updateConditionField,
    addCondition,
    transformToGroup,
    changeGroupType,
    flattenGroup,
  } = usePriceModifierStore((state) => state.actions);

  const isGroup = 'AND' in condition || 'OR' in condition;
  const groupType = isGroup ? ('AND' in condition ? 'AND' : 'OR') : undefined;
  const conditionsInGroup = groupType
    ? (condition as ConditionGroup)[groupType]
    : [];

  const fieldType = useMemo(() => {
    if (!('source' in condition) || !condition.path) return undefined;
    const schema = schemas[condition.source];
    return getFieldTypeFromPath(schema, condition.path);
  }, [condition]);

  const isValueInputEnabled = useMemo(() => {
    if (!fieldType) {
      return false;
    }
    return isSchemaLeaf(fieldType);
  }, [fieldType]);

  const availableOperators = useMemo(() => {
    const allOperators = [
      { value: CONDITION_OPERATOR.EQ, label: 'Равно' },
      { value: CONDITION_OPERATOR.GT, label: 'Больше' },
      { value: CONDITION_OPERATOR.LT, label: 'Меньше' },
      { value: CONDITION_OPERATOR.GTE, label: 'Больше или равно' },
      { value: CONDITION_OPERATOR.LTE, label: 'Меньше или равно' },
    ];

    if (!fieldType) return allOperators;

    const fieldTypeName =
      typeof fieldType === 'string' ? fieldType : fieldType.type;

    switch (fieldTypeName) {
      case 'number':
        return allOperators;
      case 'string':
      case 'enum':
        return [{ value: CONDITION_OPERATOR.EQ, label: 'Равно' }];
      default:
        return allOperators;
    }
  }, [fieldType]);

  const renderValueInput = () => {
    if (!fieldType) {
      return <Input placeholder="Сначала выберите поле" disabled />;
    }

    if (!isValueInputEnabled) {
      return <Input placeholder="Завершите выбор поля" disabled />;
    }

    const fieldTypeName =
      typeof fieldType === 'string' ? fieldType : fieldType.type;

    switch (fieldTypeName) {
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            value={(condition as LeafCondition).value as number}
            onChange={(value) => updateConditionField(name, 'value', value)}
          />
        );

      case 'enum':
        return (
          <Select
            style={{ width: '100%' }}
            value={(condition as LeafCondition).value as string}
            onChange={(value) => updateConditionField(name, 'value', value)}
            options={(fieldType as { options: readonly string[] }).options.map(
              (opt) => ({ label: opt, value: opt }),
            )}
          />
        );

      case 'string':
      default:
        return (
          <Input
            style={{ width: '100%' }}
            value={(condition as LeafCondition).value as string}
            onChange={(e) =>
              updateConditionField(name, 'value', e.target.value)
            }
          />
        );
    }
  };

  if (!condition) {
    return null;
  }

  return (
    <Card
      size="small"
      title={name.length > 1 ? `Вложенное условие` : 'Корневое условие'}
      style={{ marginBottom: 12, paddingLeft: name.length > 1 ? 16 : 0 }}
      extra={
        onRemove && (
          <Button
            icon={<DeleteOutlined />}
            type="text"
            danger
            onClick={onRemove}
          />
        )
      }
    >
      {isGroup && groupType && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space align="center" style={{ marginBottom: 12 }}>
            <span style={{ marginRight: 8 }}>Логика группы:</span>
            <Segmented
              options={[
                { label: 'И', value: 'AND' },
                { label: 'ИЛИ', value: 'OR' },
              ]}
              value={groupType}
              onChange={(value) => {
                changeGroupType(name, value as 'AND' | 'OR');
              }}
            />
            {conditionsInGroup &&
              conditionsInGroup?.length <= 1 &&
              name.length >= 1 && (
                <Button type="link" onClick={() => flattenGroup(name)} danger>
                  Превратить в одно условие
                </Button>
              )}
          </Space>
          {conditionsInGroup?.map((_: unknown, index: number) => {
            const currentPath = [...name, groupType, index];
            const handleRemove = () =>
              usePriceModifierStore
                .getState()
                .actions.removeCondition(currentPath);
            return (
              <ConditionBuilder
                // eslint-disable-next-line react-x/no-array-index-key
                key={index}
                name={currentPath}
                onRemove={handleRemove}
              />
            );
          })}
          <Button
            icon={<PlusOutlined />}
            onClick={() => addCondition(name, groupType)}
            block
          >
            Добавить условие в {groupType}
          </Button>
        </Space>
      )}

      {!isGroup && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <label>Источник</label>
          <Select
            value={(condition as LeafCondition).source}
            onChange={(value) => {
              updateConditionField(name, 'source', value);
              updateConditionField(name, 'path', '');
              updateConditionField(name, 'value', '');
              updateConditionField(name, 'operator', CONDITION_OPERATOR.EQ);
            }}
            style={{ width: '100%' }}
            options={[
              { value: CONDITION_SOURCE.ORDER, label: 'Заказ' },
              { value: CONDITION_SOURCE.ITEM, label: 'Элемент' },
            ]}
          />

          <label>Поле</label>
          <PathSelector
            source={(condition as LeafCondition).source}
            value={(condition as LeafCondition).path}
            onChange={(newPath) => {
              updateConditionField(name, 'path', newPath);
              updateConditionField(name, 'value', '');
              updateConditionField(name, 'operator', CONDITION_OPERATOR.EQ);
            }}
          />
          <label>Оператор</label>
          <Select
            value={(condition as LeafCondition).operator}
            onChange={(value) => updateConditionField(name, 'operator', value)}
            style={{ width: '100%' }}
            options={availableOperators}
            disabled={!isValueInputEnabled}
          />

          <label>Значение</label>
          {renderValueInput()}

          {/* Кнопки для преобразования в группу */}
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => transformToGroup(name, 'AND')}>
              Превратить в группу (И)
            </Button>
            <Button onClick={() => transformToGroup(name, 'OR')}>
              Превратить в группу (ИЛИ)
            </Button>
          </Space>
        </Space>
      )}
    </Card>
  );
};
