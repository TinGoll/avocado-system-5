import { useEffect, useState } from 'react';

export const formatPhoneNumber = async (
  phoneNumber?: string,
): Promise<string> => {
  if (!phoneNumber) {
    return '';
  }
  const preparedNumber =
    phoneNumber[0] !== '+' ? `+${phoneNumber}` : phoneNumber;

  try {
    const { PhoneNumberUtil } = await import('google-libphonenumber');
    const phoneUtil = PhoneNumberUtil.getInstance();
    const parsedNumber = phoneUtil.parse(preparedNumber);
    const rawNumber = `${parsedNumber.getCountryCode()}${parsedNumber?.getNationalNumber()}`;
    const formattedNumber = `+${rawNumber}`.replace(
      /^(\+\d)(\d{3})(\d{3})(\d{2})(\d{2})$/,
      '$1 $2 $3-$4-$5',
    );

    return formattedNumber;
  } catch {
    return phoneNumber;
  }
};

type UseFormatPhoneNumberReturn = {
  formattedPhoneNumber: string;
};

export const useFormatPhoneNumber = (
  phoneNumber?: string,
): UseFormatPhoneNumberReturn => {
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState<string>('');

  useEffect(() => {
    const formatNumber = async (): Promise<void> => {
      if (phoneNumber) {
        const formatted = await formatPhoneNumber(phoneNumber);
        setFormattedPhoneNumber(formatted);
      }
    };

    formatNumber();
  }, [phoneNumber]);

  return {
    formattedPhoneNumber,
  };
};
