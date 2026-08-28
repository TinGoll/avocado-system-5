import {
  AutoComplete,
  Input,
  type AutoCompleteProps,
  type InputProps,
} from 'antd';
import type { BaseOptionType, DefaultOptionType } from 'antd/es/select';
import type { ReactElement } from 'react';

type BrowserSafeAutoCompleteProps<
  ValueType,
  OptionType extends BaseOptionType | DefaultOptionType,
> = Omit<AutoCompleteProps<ValueType, OptionType>, 'placeholder'> &
  Pick<InputProps, 'placeholder'>;

export const BrowserSafeAutoComplete = <
  ValueType = unknown,
  OptionType extends BaseOptionType | DefaultOptionType = DefaultOptionType,
>({
  placeholder,
  ...props
}: BrowserSafeAutoCompleteProps<ValueType, OptionType>): ReactElement => (
  <AutoComplete {...props}>
    <Input autoComplete="new-password" placeholder={placeholder} />
  </AutoComplete>
);
