import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Modal, Select } from 'antd';
import { useState, type FC } from 'react';

import {
  COLOR_TYPE,
  colorTypeNames,
  useColors,
  type Color,
} from '@entities/color';
import { useCustomers, type Customer } from '@entities/customer';
import { useFacadePanels, type FacadePanel } from '@entities/facade-panel';
import {
  useFacadeProfiles,
  type FacadeProfile,
} from '@entities/facade-profile';
import {
  MATERIAL_TYPE,
  materialTypeMap,
  useMaterials,
  type Material,
} from '@entities/material';
import { usePatinas, type Patina } from '@entities/patina';
import {
  CUSTOMER_PRICING_METHOD,
  useProductTemplates,
  type ProductTemplate,
} from '@entities/product';
import {
  CALCULATION_METHOD,
  calculationMethodNameMap,
  useProductionOperations,
  type ProductionOperation,
} from '@entities/production-operation';
import { useVarnishes, type Varnish } from '@entities/varnish';
import { CreateColorButton } from '@features/create-color';
import { CreateFacadePanelButton } from '@features/create-facade-panel';
import { CreateFacadeProfileButton } from '@features/create-facade-profile';
import { CreateMaterialButton } from '@features/create-material';
import { CreatePatinaButton } from '@features/create-patina';
import {
  CreateProductionOperationButton,
  getPreviewError,
  ProductionOperationEditorFields,
} from '@features/create-production-operation';
import { CreateProductTemplatesButton } from '@features/create-production-templates';
import { CreateVarnishButton } from '@features/create-varnish';

import type { CatalogField, CatalogKind } from '../model/catalog';
import {
  getProductTemplateEditValues,
  normalizeProductTemplateEditValues,
} from '../model/product-template-edit';

import { EditableCatalogTable } from './EditableCatalogTable';
import { ProductTemplateEditForm } from './ProductTemplateEditForm';

const addButtonProps = {
  type: 'primary' as const,
  icon: <PlusOutlined />,
};

const requiredName = {
  editor: { kind: 'text' as const },
  required: true,
};

const customerFields: CatalogField<Customer>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName },
  {
    title: 'Уровень',
    dataIndex: 'level',
    editor: {
      kind: 'select',
      options: [
        { value: 'bronze', label: 'Бронзовый' },
        { value: 'silver', label: 'Серебряный' },
        { value: 'gold', label: 'Золотой' },
      ],
    },
    required: true,
  },
];

const materialFields: CatalogField<Material>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName },
  {
    title: 'Тип материала',
    dataIndex: 'type',
    editor: {
      kind: 'select',
      options: Object.values(MATERIAL_TYPE).map((value) => ({
        value,
        label: materialTypeMap[value],
      })),
    },
    render: (value) => materialTypeMap[value as Material['type']],
    required: true,
  },
];

const colorFields: CatalogField<Color>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName },
  {
    title: 'Тип красителя',
    dataIndex: 'type',
    editor: {
      kind: 'select',
      options: Object.values(COLOR_TYPE).map((value) => ({
        value,
        label: colorTypeNames[value],
      })),
    },
    render: (value) => colorTypeNames[value as Color['type']],
    required: true,
  },
];

const facadePanelFields: CatalogField<FacadePanel>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName },
  {
    title: 'Стиль',
    dataIndex: ['characteristics', 'style'],
    editor: { kind: 'text' },
  },
];

const facadeProfileFields: CatalogField<FacadeProfile>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName, width: 220 },
  {
    title: 'Ширина, мм',
    dataIndex: ['characteristics', 'width'],
    editor: { kind: 'number', min: 0 },
    required: true,
    align: 'right',
  },
  {
    title: 'Глубина паза, мм',
    dataIndex: ['characteristics', 'grooveDepth'],
    editor: { kind: 'number', min: 0 },
    required: true,
    align: 'right',
  },
  {
    title: 'Ширина паза, мм',
    dataIndex: ['characteristics', 'grooveWidth'],
    editor: { kind: 'number', min: 0 },
    align: 'right',
  },
  {
    title: 'Стиль',
    dataIndex: ['characteristics', 'style'],
    editor: { kind: 'text' },
  },
];

const nameOnlyFields: CatalogField<Patina | Varnish>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName },
];

const operationFields: CatalogField<ProductionOperation>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName },
  {
    title: 'Единица расчёта',
    dataIndex: 'calculationMethod',
    editor: {
      kind: 'select',
      options: Object.values(CALCULATION_METHOD).map((value) => ({
        value,
        label: calculationMethodNameMap[value],
      })),
    },
    render: (value) =>
      calculationMethodNameMap[
        value as ProductionOperation['calculationMethod']
      ],
    required: true,
  },
  {
    title: 'Стоимость за единицу',
    dataIndex: 'costPerUnit',
    editor: { kind: 'number', min: 0.01, precision: 2 },
    required: true,
    align: 'right',
    render: (value) =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
      }).format(Number(value) || 0),
  },
];

const pricingMethodNames: Record<
  ProductTemplate['customerPricingMethod'],
  string
> = {
  [CUSTOMER_PRICING_METHOD.PER_ITEM]: 'За штуку',
  [CUSTOMER_PRICING_METHOD.LINEAR_METER]: 'За погонный метр',
  [CUSTOMER_PRICING_METHOD.AREA]: 'По площади',
  [CUSTOMER_PRICING_METHOD.VOLUME]: 'По объёму',
};

const productFields: CatalogField<ProductTemplate>[] = [
  { title: 'Название', dataIndex: 'name', ...requiredName, width: 220 },
  { title: 'Группа', dataIndex: 'group', editor: { kind: 'text' } },
  {
    title: 'Ширина, мм',
    dataIndex: ['defaultCharacteristics', 'width'],
    editor: { kind: 'number', min: 0 },
    form: false,
    align: 'right',
  },
  {
    title: 'Высота, мм',
    dataIndex: ['defaultCharacteristics', 'height'],
    editor: { kind: 'number', min: 0 },
    form: false,
    align: 'right',
  },
  {
    title: 'Толщина, мм',
    dataIndex: ['defaultCharacteristics', 'thickness'],
    editor: { kind: 'number', min: 0 },
    form: false,
    align: 'right',
  },
  {
    title: 'Способ расчёта цены',
    dataIndex: 'customerPricingMethod',
    editor: {
      kind: 'select',
      options: Object.values(CUSTOMER_PRICING_METHOD).map((value) => ({
        value,
        label: pricingMethodNames[value],
      })),
    },
    render: (value) =>
      pricingMethodNames[value as ProductTemplate['customerPricingMethod']],
    required: true,
  },
  {
    title: 'Базовая цена',
    dataIndex: 'baseCustomerPrice',
    editor: { kind: 'number', min: 0.01, precision: 2 },
    required: true,
    align: 'right',
    render: (value) =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
      }).format(Number(value) || 0),
  },
  {
    title: 'Работы',
    dataIndex: 'operations',
    form: false,
    render: (value) =>
      ((value as ProductTemplate['operations']) ?? [])
        .map(({ name }) => name)
        .join(', ') || '—',
  },
  {
    title: 'Характеристики по умолчанию (JSON)',
    dataIndex: 'defaultCharacteristics',
    editor: { kind: 'json', rows: 9 },
    inline: false,
    table: false,
  },
  {
    title: 'Атрибуты (JSON)',
    dataIndex: 'attributes',
    editor: { kind: 'json', rows: 9 },
    inline: false,
    table: false,
  },
];

const CustomerCreateButton: FC = () => {
  const { create } = useCustomers();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Pick<Customer, 'name' | 'level'>>();

  const handleCreate = async (values: Pick<Customer, 'name' | 'level'>) => {
    try {
      await create.trigger(values);
      message.success('Клиент добавлен');
      setOpen(false);
      form.resetFields();
    } catch {
      message.error('Не удалось добавить клиента');
    }
  };

  return (
    <>
      <Button {...addButtonProps} onClick={() => setOpen(true)}>
        Добавить клиента
      </Button>
      <Modal
        title="Новый клиент"
        open={open}
        okText="Добавить"
        cancelText="Отмена"
        confirmLoading={create.isMutating}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Уровень"
            name="level"
            initialValue="bronze"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'bronze', label: 'Бронзовый' },
                { value: 'silver', label: 'Серебряный' },
                { value: 'gold', label: 'Золотой' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

const CustomersCatalog: FC = () => {
  const { customers, update, remove, isLoading, error } = useCustomers();
  return (
    <EditableCatalogTable
      title="Клиенты"
      emptyText="Клиентов пока нет"
      items={customers}
      fields={customerFields}
      loading={isLoading}
      error={error}
      headerAction={<CustomerCreateButton />}
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const MaterialsCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useMaterials();
  return (
    <EditableCatalogTable
      title="Материалы"
      emptyText="Материалов пока нет"
      items={data?.materials ?? []}
      fields={materialFields}
      loading={isLoading}
      error={error}
      headerAction={
        <CreateMaterialButton {...addButtonProps}>
          Добавить материал
        </CreateMaterialButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const ColorsCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useColors();
  return (
    <EditableCatalogTable
      title="Красители"
      emptyText="Красителей пока нет"
      items={data?.colors ?? []}
      fields={colorFields}
      loading={isLoading}
      error={error}
      headerAction={
        <CreateColorButton {...addButtonProps}>
          Добавить краситель
        </CreateColorButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const FacadePanelsCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useFacadePanels();
  return (
    <EditableCatalogTable
      title="Филёнки"
      emptyText="Филёнок пока нет"
      items={data?.panels ?? []}
      fields={facadePanelFields}
      loading={isLoading}
      error={error}
      headerAction={
        <CreateFacadePanelButton {...addButtonProps}>
          Добавить филёнку
        </CreateFacadePanelButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const FacadeProfilesCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useFacadeProfiles();
  return (
    <EditableCatalogTable
      title="Фасадные профили"
      emptyText="Профилей пока нет"
      items={data?.profiles ?? []}
      fields={facadeProfileFields}
      loading={isLoading}
      error={error}
      headerAction={
        <CreateFacadeProfileButton {...addButtonProps}>
          Добавить профиль
        </CreateFacadeProfileButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const PatinasCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = usePatinas();
  return (
    <EditableCatalogTable
      title="Патины"
      emptyText="Патин пока нет"
      items={data?.patinas ?? []}
      fields={nameOnlyFields as CatalogField<Patina>[]}
      loading={isLoading}
      error={error}
      headerAction={
        <CreatePatinaButton {...addButtonProps}>
          Добавить патину
        </CreatePatinaButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const VarnishesCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useVarnishes();
  return (
    <EditableCatalogTable
      title="Лаки"
      emptyText="Лаков пока нет"
      items={data?.varnishes ?? []}
      fields={nameOnlyFields as CatalogField<Varnish>[]}
      loading={isLoading}
      error={error}
      headerAction={
        <CreateVarnishButton {...addButtonProps}>
          Добавить лак
        </CreateVarnishButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
    />
  );
};

const ProductionOperationsCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useProductionOperations();
  return (
    <EditableCatalogTable
      title="Производственные работы"
      emptyText="Работ пока нет"
      items={data?.operations ?? []}
      fields={operationFields}
      loading={isLoading}
      error={error}
      headerAction={
        <CreateProductionOperationButton {...addButtonProps}>
          Добавить работу
        </CreateProductionOperationButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
      editForm={{
        getInitialValues: (record) => ({
          ...record,
          preview: {
            name: 'Тестовый продукт',
            width: 500,
            height: 860,
            thickness: 20,
            quantity: 1,
            profileWidth: 50,
            grooveDepth: 10,
          },
        }),
        normalizeValues: (values) => {
          const operation = { ...values };
          delete operation.preview;
          return operation;
        },
        onSaveError: (saveError, form) => {
          const details = getPreviewError(saveError);
          if (
            details.field === 'calculationFormula' ||
            details.field === 'displayNameTemplate'
          ) {
            form.setFields([
              {
                name: details.field,
                errors: [details.message ?? 'Проверьте значение'],
              },
            ]);
          }
        },
        render: (form) => (
          <>
            <Form.Item
              label="Название"
              name="name"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Стоимость за единицу"
              name="costPerUnit"
              rules={[{ required: true }]}
            >
              <Input type="number" min={0.01} step={0.01} />
            </Form.Item>
            <Form.Item
              label="Единица расчёта"
              name="calculationMethod"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.values(CALCULATION_METHOD).map((value) => ({
                  value,
                  label: calculationMethodNameMap[value],
                }))}
              />
            </Form.Item>
            <ProductionOperationEditorFields form={form} />
          </>
        ),
      }}
    />
  );
};

const ProductsCatalog: FC = () => {
  const { data, update, remove, isLoading, error } = useProductTemplates();
  const {
    data: operationsData,
    error: operationsError,
    isLoading: isOperationsLoading,
  } = useProductionOperations();
  const products = data?.products ?? [];
  return (
    <EditableCatalogTable
      title="Номенклатура"
      emptyText="Номенклатуры пока нет"
      items={products}
      fields={productFields}
      loading={isLoading || isOperationsLoading}
      error={error}
      headerAction={
        <CreateProductTemplatesButton {...addButtonProps}>
          Добавить позицию
        </CreateProductTemplatesButton>
      }
      onUpdate={update.trigger}
      onDelete={remove.trigger}
      editForm={{
        render: (_form, record) => (
          <ProductTemplateEditForm
            products={products}
            currentProduct={record}
            operations={operationsData?.operations ?? []}
            operationsError={operationsError}
          />
        ),
        getInitialValues: (record) =>
          getProductTemplateEditValues(record) as unknown as Record<
            string,
            unknown
          >,
        normalizeValues: (values) =>
          normalizeProductTemplateEditValues(
            values as unknown as Parameters<
              typeof normalizeProductTemplateEditValues
            >[0],
          ),
      }}
    />
  );
};

type Props = {
  catalog: CatalogKind;
};

export const CatalogPage: FC<Props> = ({ catalog }) => {
  switch (catalog) {
    case 'customers':
      return <CustomersCatalog />;
    case 'materials':
      return <MaterialsCatalog />;
    case 'colors':
      return <ColorsCatalog />;
    case 'facade-panels':
      return <FacadePanelsCatalog />;
    case 'facade-profiles':
      return <FacadeProfilesCatalog />;
    case 'patinas':
      return <PatinasCatalog />;
    case 'varnishes':
      return <VarnishesCatalog />;
    case 'production-operations':
      return <ProductionOperationsCatalog />;
    case 'products':
      return <ProductsCatalog />;
  }
};
