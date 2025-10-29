import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Input, InputNumber, Select, Space } from 'antd';

import {
  CONDITION_OPERATOR,
  CONDITION_SOURCE,
  type PriceModifierCondition,
} from '@entities/price-modifiers';

import { usePriceModifierStore } from '../model/priceModifierStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getIn = (obj: any, path: (string | number)[]) => {
  return path.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
    obj,
  );
};

interface ConditionBuilderProps {
  name: (string | number)[]; // Путь к текущему узлу
  onRemove?: () => void;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  name,
  onRemove,
}) => {
  // Получаем нужный "срез" состояния и действия из стора
  const condition = usePriceModifierStore(
    (state) => getIn(state.modifier, name) as PriceModifierCondition,
  );
  const { updateConditionField, addCondition, transformToGroup } =
    usePriceModifierStore((state) => state.actions);

  if (!condition) {
    // Такое может случиться на мгновение при удалении
    return null;
  }

  const isGroup = 'AND' in condition || 'OR' in condition;
  const groupType = isGroup ? ('AND' in condition ? 'AND' : 'OR') : undefined;
  const conditionsInGroup = groupType ? condition[groupType] : [];

  return (
    <Card
      size="small"
      title={name.length > 1 ? `Условие` : 'Корневое условие'}
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
      <div style={{ display: isGroup ? 'block' : 'none' }}>
        {groupType && (
          <Space direction="vertical" style={{ width: '100%' }}>
            {conditionsInGroup?.map((_, index) => {
              const currentPath = [...name, groupType, index];
              const handleRemove = () =>
                usePriceModifierStore
                  .getState()
                  .actions.removeCondition(currentPath);
              return (
                <ConditionBuilder
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
      </div>

      {/* --- Блок для ЛИСТА --- */}
      <div style={{ display: !isGroup ? 'block' : 'none' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <label>Источник</label>
          <Select
            value={condition.source}
            onChange={(value) => updateConditionField(name, 'source', value)}
            style={{ width: '100%' }}
            options={[
              { value: CONDITION_SOURCE.ORDER, label: 'Заказ' },
              { value: CONDITION_SOURCE.ITEM, label: 'Элемент' },
            ]}
          />

          <label>Поле</label>
          <Input
            placeholder="например: totalPrice"
            value={condition.path}
            onChange={(e) => updateConditionField(name, 'path', e.target.value)}
          />

          <label>Оператор</label>
          <Select
            value={condition.operator}
            onChange={(value) => updateConditionField(name, 'operator', value)}
            style={{ width: '100%' }}
            options={[
              { value: CONDITION_OPERATOR.EQ, label: 'Равно' },
              { value: CONDITION_OPERATOR.GT, label: 'Больше' },
              { value: CONDITION_OPERATOR.LT, label: 'Меньше' },
              { value: CONDITION_OPERATOR.GTE, label: 'Больше или равно' },
              { value: CONDITION_OPERATOR.LTE, label: 'Меньше или равно' },
            ]}
          />

          <label>Значение</label>
          <InputNumber
            style={{ width: '100%' }}
            value={condition.value}
            onChange={(value) => updateConditionField(name, 'value', value)}
          />

          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => transformToGroup(name, 'AND')}>
              Превратить в группу (AND)
            </Button>
            <Button onClick={() => transformToGroup(name, 'OR')}>
              Превратить в группу (OR)
            </Button>
          </Space>
        </Space>
      </div>
    </Card>
  );
};
