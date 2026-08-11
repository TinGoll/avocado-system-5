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
import { useEffect, useRef, useState, type FC } from 'react';

import {
  MODIFER_TYPE,
  toCreatePriceModifierDto,
  toUpdatePriceModifierDto,
  usePriceModifiers,
  type PriceModifier,
} from '@entities/price-modifiers';
import { useProductTemplates } from '@entities/product';

import { useConditionPathSchemas } from '../api/useConditionPathSchemas';
import { usePriceModifierStore } from '../model/priceModifierStore';

import { ConditionBuilder } from './ConditionBuilder';

type Props = {
  initialModifier?: PriceModifier;
  onSaved?: (modifier: PriceModifier) => void;
  onCancel?: () => void;
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

export const PriceModifierForm: FC<Props> = ({
  initialModifier,
  onSaved,
  onCancel,
}) => {
  const modifier = usePriceModifierStore((state) => state.modifier);
  const { updateField, setInitialState, reset } = usePriceModifierStore(
    (state) => state.actions,
  );
  const { create, update, isLoading: isModifiersLoading } = usePriceModifiers();
  const {
    data: productTemplatesData,
    error: productTemplatesError,
    isLoading: isProductTemplatesLoading,
  } = useProductTemplates();
  const {
    data: schemas,
    error: schemasError,
    isLoading: isSchemasLoading,
  } = useConditionPathSchemas();
  const [saveError, setSaveError] = useState<string>();
  const [isSaved, setIsSaved] = useState(false);
  const submitLock = useRef(false);
  const isSaving = create.isMutating || update.isMutating;

  useEffect(() => {
    if (initialModifier) {
      setInitialState(initialModifier);
    } else {
      reset();
    }

    return reset;
  }, [initialModifier, reset, setInitialState]);

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

      <Divider orientation="left">Область действия</Divider>

      <Space direction="vertical" style={{ width: '100%' }}>
        <label htmlFor="price-modifier-product-templates">
          Шаблоны продуктов
        </label>
        <Select
          id="price-modifier-product-templates"
          aria-label="Шаблоны продуктов"
          mode="multiple"
          allowClear
          style={{ width: '100%' }}
          loading={isProductTemplatesLoading}
          placeholder="Не выбрано — модификатор действует глобально"
          value={modifier.productTemplates.map(({ id }) => String(id))}
          options={(productTemplatesData?.products ?? []).map((template) => ({
            label: template.name,
            value: String(template.id),
          }))}
          onChange={(templateIds: string[]) => {
            const selectedIds = new Set(templateIds);
            updateField(
              'productTemplates',
              (productTemplatesData?.products ?? []).filter((template) =>
                selectedIds.has(String(template.id)),
              ),
            );
          }}
        />
        <span>
          {modifier.productTemplates.length === 0
            ? 'Глобальный модификатор'
            : `Выбрано шаблонов: ${modifier.productTemplates.length}`}
        </span>
        {productTemplatesError && (
          <Alert
            type="error"
            message="Не удалось загрузить шаблоны продуктов"
            showIcon
          />
        )}
      </Space>

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
        {onCancel && <Button onClick={onCancel}>Отмена</Button>}
      </Space>
    </div>
  );
};
