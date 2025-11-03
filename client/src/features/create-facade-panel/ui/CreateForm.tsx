import { css } from '@emotion/css';
import {
  App,
  AutoComplete,
  Button,
  Form,
  Input,
  Skeleton,
  type FormProps,
} from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { useMemo, type FC } from 'react';

import type { FacadePanel } from '@entities/facade-panel';

import { useCreateFacadePanel } from '../hooks/useCreateFacadePanel';
import type { FieldType } from '../model/types';

const styles = {
  form: css`
    box-sizing: border-box;
    & .ant-form-item {
      margin-bottom: 16px;
    }
  `,
  formActions: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    padding-top: 16px;
  `,
};

type Props = {
  onCreated?: (color: FacadePanel) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm<FieldType>();
  const { isMutating, trigger, panels, isLoading } = useCreateFacadePanel();
  const { notification } = App.useApp();

  const styleOptions = useMemo<DefaultOptionType[]>(() => {
    if (!panels?.length) return [];
    const unique = Array.from(
      new Set(
        panels
          .map((p) => p.characteristics?.style)
          .filter((s): s is string => Boolean(s?.trim())),
      ),
    );
    return unique.map((value) => ({ value }));
  }, [panels]);

  const handleSearch = (text: string) => {
    if (!text) return styleOptions;

    const filtered = styleOptions.filter((opt) => {
      const value = opt.value ? String(opt.value) : '';
      return value.toLowerCase().includes(text.toLowerCase());
    });

    if (!filtered.some((o) => o.value === text)) {
      return [{ value: text }, ...filtered];
    }

    return filtered;
  };

  const handleFinish: FormProps<FieldType>['onFinish'] = (values) => {
    trigger({
      name: values.name,
      characteristics: {
        style: values.style,
      },
    }).then((data) => {
      onCreated?.(data);
      notification.success({
        message: 'Филёнка успешно добавлена',
      });
      form.resetFields();
    });
  };

  const handleCancel = () => {
    onCancel?.();
    form.resetFields();
  };
  return (
    <Skeleton loading={isLoading} active>
      <Form
        name="create_panel_form"
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={{}}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          label="Название"
          name="name"
          tooltip="Название филёнки должно быть уникальным"
          rules={[{ required: true, message: 'Введи название филёнки' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<FieldType>
          label="Стиль филёнки"
          name="style"
          tooltip="Выберите стиль филёнки из предложенных  вариантов или введите свой. Можно оставить пустым."
          rules={[{ required: false, message: 'Выбери стиль филёнки' }]}
        >
          <AutoComplete
            options={styleOptions}
            onSearch={handleSearch}
            placeholder="Введите или выберите стиль"
            allowClear
            filterOption={false}
          />
        </Form.Item>
        <div className={styles.formActions}>
          <Button variant="solid" color="danger" onClick={handleCancel}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit" loading={isMutating}>
            Добавить
          </Button>
        </div>
      </Form>
    </Skeleton>
  );
};
