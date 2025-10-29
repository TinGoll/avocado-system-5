import { Button, Modal, type ButtonProps } from 'antd';
import { useState } from 'react';

type CreateEntityButtonProps<T> = ButtonProps & {
  title: string;
  FormComponent: React.ComponentType<{
    onCreated: (entity: T) => void;
    onCancel: () => void;
  }>;
  onCreated?: (entity: T) => void;
};

export const CreateEntityButton = <T,>({
  title,
  FormComponent,
  onCreated,
  ...props
}: CreateEntityButtonProps<T>) => {
  const [open, setOpen] = useState(false);

  const showModal = (event: React.MouseEvent<HTMLElement>) => {
    props.onClick?.(event);
    setOpen(true);
  };

  const handleCancel = (): void => {
    setOpen(false);
  };

  const handleCreate = (entity: T): void => {
    onCreated?.(entity);
    handleCancel();
  };

  return (
    <>
      <Button {...props} onClick={showModal} disabled={open} />
      <Modal
        title={title}
        open={open}
        onCancel={handleCancel}
        okButtonProps={{ hidden: true }}
        cancelButtonProps={{ hidden: true }}
      >
        <FormComponent onCreated={handleCreate} onCancel={handleCancel} />
      </Modal>
    </>
  );
};
