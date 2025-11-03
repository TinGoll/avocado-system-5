import { css } from '@emotion/css';
import {
  App,
  AutoComplete,
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Skeleton,
  type FormProps,
} from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import { useMemo, type FC } from 'react';

import type { FacadeProfile } from '@entities/facade-profile';

import { useCreateFacadeProfile } from '../hooks/useCreateFacadeProfile';
import type { FieldType } from '../model/types';

const styles = {
  form: css`
    box-sizing: border-box;
    & .ant-form-item {
      margin-bottom: 16px;
    }

    & .form-divider {
      margin: 8px 0;
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
  onCreated?: (profile: FacadeProfile) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm<FieldType>();
  const { isMutating, trigger, isLoading, profiles } = useCreateFacadeProfile();
  const { notification } = App.useApp();

  const styleOptions = useMemo<DefaultOptionType[]>(() => {
    if (!profiles?.length) return [];
    const unique = Array.from(
      new Set(
        profiles
          .map((p) => p.characteristics?.style)
          .filter((s): s is string => Boolean(s?.trim())),
      ),
    );
    return unique.map((value) => ({ value }));
  }, [profiles]);

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
        width: values.width,
        grooveDepth: values.grooveDepth,
        grooveWidth: values.grooveWidth,
        style: values.style,
      },
    }).then((data) => {
      onCreated?.(data);
      notification.success({
        message: 'Фасадный профиль успешно добавлен',
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
        name="create_profile_form"
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
          tooltip="Название профиля должно быть уникальным"
          rules={[{ required: true, message: 'Введи название профиля' }]}
        >
          <Input />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item<FieldType>
              label="Ширина профиля в мм."
              name="width"
              rules={[{ required: true, message: 'Обязательный параметр' }]}
            >
              <InputNumber />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FieldType>
              label="Глубина паза в мм."
              name="grooveDepth"
              tooltip="Глубина паза учавствует в расчете филёнки."
              rules={[
                {
                  required: true,
                  message: 'Обязательный параметр',
                },
              ]}
            >
              <InputNumber />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FieldType>
              label="Стиль профиля"
              name="style"
              tooltip="Стиль - необязательный параметр, но можно задействовать для увеличения гибкости ценообразования"
            >
              <AutoComplete
                options={styleOptions}
                onSearch={handleSearch}
                placeholder="Введите или выберите стиль"
                allowClear
                filterOption={false}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item<FieldType>
              tooltip="Можно оставить пустым."
              label="Ширина паза в мм."
              name="grooveWidth"
            >
              <InputNumber />
            </Form.Item>
          </Col>
        </Row>

        <Divider className="form-divider" />
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
