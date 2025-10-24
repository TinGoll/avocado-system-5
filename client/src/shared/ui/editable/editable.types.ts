import type dayjs from 'dayjs';

export type SelectEventValue = string | string[];
export type DatePickerValue = dayjs.Dayjs | null;

export type ChangeFn = (
  event:
    | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    | SelectEventValue
    | DatePickerValue,
) => void;

export interface ControlProps<T> {
  value?: T;
  onChange?: ChangeFn;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<Element>) => void;
  className?: string;
  placeholder?: string;
  defaultValue?: T;
}

export interface EditableCoreProps<T> {
  name: string;
  defaultValue?: T;
  disabled?: boolean;

  reason?: boolean | string;
  defaultReasonValue?: string;
  reasonRequired?: boolean;
  cancelOnBlur?: boolean;
  confirmOnBlur?: boolean;
  resetValueOnEditingEnd?: boolean;
  saveValueOnEditingEnd?: boolean;
  ignoredOutsideClasses?: string[];

  onSave?: (name: string, value: T | undefined, reason?: string | null) => void;
  onCancel?: () => void;
  onEditingBegin?: (name: string) => void;
  onEditingEnd?: (name: string) => void;
}

export interface EditableProps<T> extends EditableCoreProps<T> {
  control: React.ReactNode | ((props: ControlProps<T>) => React.ReactNode);
  children?: React.ReactNode;
  className?: string;
  loading?: boolean;
  editIcon?: React.ReactNode;
  block?: boolean;
  css?: React.CSSProperties | undefined;
}
