import { Typography } from 'antd';
import type { TextProps } from 'antd/lib/typography/Text';
import { type FC } from 'react';

import { useFormatPhoneNumber } from '@shared/hooks/usePhoneFormater';

const { Text } = Typography;

interface Props extends TextProps {
  phone?: string;
}

export const FormattedPhoneNumber: FC<Props> = ({ phone, ...props }) => {
  const { formattedPhoneNumber } = useFormatPhoneNumber(phone);
  return <Text {...props}>{formattedPhoneNumber}</Text>;
};
