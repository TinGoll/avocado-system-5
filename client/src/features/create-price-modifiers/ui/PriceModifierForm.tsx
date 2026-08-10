import {
  Alert,
  Button,
  Divider,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
} from 'antd';
import { useRef, useState, type FC } from 'react';

import {
  MODIFER_TYPE,
  toCreatePriceModifierDto,
  toUpdatePriceModifierDto,
  usePriceModifiers,
  type PriceModifier,
} from '@entities/price-modifiers';

import { useConditionPathSchemas } from '../api/useConditionPathSchemas';
import { usePriceModifierStore } from '../model/priceModifierStore';

import { ConditionBuilder } from './ConditionBuilder';

type Props = {
  onSaved?: (modifier: PriceModifier) => void;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return 'Не удалось сохранить модификатор';
  }

  const response = 'response' in error ? error.response : undefined;
  if (typeof response === 'object' && response !== null && 'data' in response) {
    const data = response.data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const apiError = data.error;
      if (
        typeof apiError === 'object' &&
        apiError !== null &&
        'message' in apiError &&
        typeof apiError.message === 'string'
      ) {
        return apiError.message;
      }
    }
  }

  return error instanceof Error
    ? error.message
    : 'Не удалось сохранить модификатор';
};

export const PriceModifierForm: FC<Props> = ({ onSaved }) => {
  const modifier = usePriceModifierStore((state) => state.modifier);
  const { updateField } = usePriceModifierStore((state) => state.actions);
  const { create, update, isLoading: isModifiersLoading } = usePriceModifiers();
  const {
    data: schemas,
    error: schemasError,
    isLoading: isSchemasLoading,
  } = useConditionPathSchemas();
  const [saveError, setSaveError] = useState<string>();
  const [isSaved, setIsSaved] = useState(false);
  const submitLock = useRef(false);
  const isSaving = create.isMutating || update.isMutating;

  const handleSubmit = async () => {
    if (submitLock.current || isSaving) return;

    submitLock.current = true;
    setSaveError(undefined);
    setIsSaved(false);
    const finalState = usePriceModifierStore.getState().modifier;

    try {
      const savedModifier = finalState.id
        ? await update.trigger(
            finalState.id,
            toUpdatePriceModifierDto(finalState),
          )
        : await create.trigger(toCreatePriceModifierDto(finalState));

      setIsSaved(true);
      onSaved?.(savedModifier);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      submitLock.current = false;
    }
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

        <label>Приоритет применения</label>
        <InputNumber
          style={{ width: '100%' }}
          precision={0}
          step={1}
          placeholder="Меньшее значение применяется раньше"
          value={modifier.priority}
          onChange={(value) => updateField('priority', value)}
        />
      </Space>

      <Divider orientation="left">Условия применения</Divider>

      {(isSchemasLoading || isModifiersLoading) && (
        <Spin aria-label="Загрузка модификаторов" />
      )}
      {schemasError && (
        <Alert
          type="error"
          message="Не удалось загрузить разрешённые поля условий"
        />
      )}
      {schemas && <ConditionBuilder name={['conditions']} schemas={schemas} />}

      {saveError && <Alert type="error" message={saveError} showIcon />}
      {isSaved && (
        <Alert type="success" message="Модификатор сохранён" showIcon />
      )}

      <Divider />

      <Space>
        <Button
          type="primary"
          onClick={handleSubmit}
          loading={isSaving}
          disabled={isSaving}
        >
          Сохранить
        </Button>
      </Space>
    </div>
  );
};
