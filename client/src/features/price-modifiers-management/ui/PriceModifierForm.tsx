import { Button, Divider, Input, InputNumber, Select, Space } from 'antd';

import { MODIFER_TYPE } from '@entities/price-modifiers';

import { usePriceModifierStore } from '../model/priceModifierStore';

import { ConditionBuilder } from './ConditionBuilder';

export const PriceModifierForm: React.FC = () => {
  const modifier = usePriceModifierStore((state) => state.modifier);
  const { updateField } = usePriceModifierStore((state) => state.actions);

  const handleSubmit = () => {
    const finalState = usePriceModifierStore.getState().modifier;
    // eslint-disable-next-line no-console
    console.log('✅ Price Modifier:', finalState);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Divider orientation="left">Основные параметры</Divider>

      <Space direction="vertical" style={{ width: '100%' }}>
        <label>Название</label>
        <Input
          placeholder="Например: Скидка при сумме > 1000"
          value={modifier.name}
          onChange={(e) => updateField('name', e.target.value)}
        />

        <label>Тип модификатора</label>
        <Select
          value={modifier.type}
          onChange={(value) => updateField('type', value)}
          options={[
            { value: MODIFER_TYPE.PERCENTAGE, label: 'Процент' },
            { value: MODIFER_TYPE.FIXED_AMOUNT, label: 'Фиксированная сумма' },
          ]}
        />

        <label>Значение</label>
        <InputNumber
          style={{ width: '100%' }}
          placeholder="Например: 10 (означает 10%)"
          value={modifier.value}
          onChange={(value) => updateField('value', value)}
        />
      </Space>

      <Divider orientation="left">Условия применения</Divider>

      <ConditionBuilder name={['conditions']} />

      <Divider />

      <Space>
        <Button type="primary" onClick={handleSubmit}>
          💾 Сохранить
        </Button>
      </Space>
    </div>
  );
};
