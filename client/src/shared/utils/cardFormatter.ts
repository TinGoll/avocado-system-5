export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export interface FormatOptions {
  /** Символ-разделитель групп (по умолчанию пробел) */
  separator?: string;
  /** Маскировать все цифры, кроме последних N (если 0 — не маскировать) */
  maskExceptLast?: number;
  /** символ маски (по умолчанию '*') */
  maskChar?: string;
}

/** Убирает всё, кроме цифр */
export const clean = (input: string): string => input.replace(/\D+/g, '');

/** Детект по префиксу. */
export const detectCardType = (digits: string): CardType => {
  if (/^3[47]\d{0,}$/.test(digits)) return 'amex';
  if (/^4\d{0,}$/.test(digits)) return 'visa';
  if (/^(5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720))\d{0,}$/.test(digits))
    return 'mastercard';
  if (/^(6011|65|64[4-9])\d{0,}$/.test(digits)) return 'discover';
  return 'unknown';
};

export const luhnCheck = (digits: string): boolean => {
  const d = clean(digits);
  if (d.length === 0) return false;
  let sum = 0;
  // process right-to-left
  const n = d.length;
  for (let i = 0; i < n; i++) {
    const char = d[n - 1 - i];
    const digit = char.charCodeAt(0) - 48; // safe digit
    if (i % 2 === 1) {
      // double every second digit from the right
      const dbl = digit * 2;
      sum += dbl > 9 ? dbl - 9 : dbl;
    } else {
      sum += digit;
    }
  }
  return sum % 10 === 0;
};

/** Возвращает группы (массив чисел) для форматирования в зависимости от типа карты */
export const getGroupingForType = (type: CardType): number[] => {
  switch (type) {
    case 'amex':
      return [4, 6, 5];
    default:
      return [4, 4, 4, 4, 3];
  }
};

/** Форматирует номер (не меняет курсор) */
export const formatCardNumber = (input: string, separator = ' '): string => {
  const digits = clean(input);
  const type = detectCardType(digits);
  const groups = getGroupingForType(type);

  const parts: string[] = [];
  let idx = 0;
  for (const g of groups) {
    if (idx >= digits.length) break;
    parts.push(digits.slice(idx, idx + g));
    idx += g;
  }
  // если остались цифры, добавим их как последнюю группу
  if (idx < digits.length) parts.push(digits.slice(idx));
  return parts.join(separator);
};

/**
 * Форматирует и возвращает новую позицию курсора.
 * cursorPos — позиция в исходной строке (0..len)
 */
export const formatAndMapCursor = (
  raw: string,
  cursorPos: number,
  options?: FormatOptions,
): { formatted: string; cursor: number } => {
  const separator = options?.separator ?? ' ';
  const maskExceptLast = options?.maskExceptLast ?? 0;
  const maskChar = options?.maskChar ?? '*';

  // Build array of digits and map raw index -> digit index (or -1)
  const rawToDigit: number[] = new Array(raw.length);
  const digitChars: string[] = [];

  let digitIndex = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (/\d/.test(ch)) {
      digitChars.push(ch);
      rawToDigit[i] = digitIndex;
      digitIndex++;
    } else {
      rawToDigit[i] = -1;
    }
  }

  // digit position corresponding to cursor (cursor is between characters)
  // we consider cursorPos in [0..raw.length]; digitCursor is how many digits are before cursor
  let digitCursor = 0;
  for (let i = 0; i < cursorPos; i++) {
    if (rawToDigit[i] !== -1) digitCursor++;
  }

  // produce formatted string while tracking mapping digitIndex -> formatted pos
  const type = detectCardType(digitChars.join(''));
  const groups = getGroupingForType(type);

  const formattedParts: string[] = [];
  const digitToFormattedPos: number[] = []; // maps digit index -> position *after* that digit in formatted string (i.e., cursor if placed after digit)
  let di = 0;
  let outPos = 0;
  for (const g of groups) {
    if (di >= digitChars.length) break;
    const slice = digitChars.slice(di, di + g);
    const partStr = slice
      .map((d, idx) => {
        const globalIdx = di + idx;
        const isMasked =
          maskExceptLast > 0 && globalIdx < digitChars.length - maskExceptLast;
        return isMasked ? maskChar : d;
      })
      .join('');
    formattedParts.push(partStr);
    // fill digitToFormattedPos for digits in this part
    for (let k = 0; k < slice.length; k++) {
      di++;
      outPos += 1; // for this digit
      digitToFormattedPos[di - 1] = outPos; // cursor pos if placed after this digit
    }
    // add separator (but only if there are still digits left)
    if (di < digitChars.length) {
      outPos += separator.length;
    }
  }
  // remaining digits (if any)
  if (di < digitChars.length) {
    const rem = digitChars.slice(di);
    const remStr = rem
      .map((d, idx) => {
        const globalIdx = di + idx;
        const isMasked =
          maskExceptLast > 0 && globalIdx < digitChars.length - maskExceptLast;
        return isMasked ? maskChar : d;
      })
      .join('');
    formattedParts.push(remStr);
    for (let k = 0; k < rem.length; k++) {
      di++;
      outPos += 1;
      digitToFormattedPos[di - 1] = outPos;
    }
  }

  const formatted = formattedParts.join(separator);

  // Now compute resulting cursor: if digitCursor === 0 -> position 0 or before first digit
  let newCursor = 0;
  if (digitCursor === 0) {
    // cursor before first digit -> either 0 or maybe there are leading separators? We'll put 0.
    newCursor = 0;
  } else {
    // cursor is after digit (digitCursor-1)
    const posAfterDigit = digitToFormattedPos[digitCursor - 1];
    // posAfterDigit is position *after* that digit (1-based chars). So cursor = posAfterDigit
    newCursor = posAfterDigit;
  }

  // Ensure newCursor is within [0..formatted.length]
  if (newCursor < 0) newCursor = 0;
  if (newCursor > formatted.length) newCursor = formatted.length;

  return { formatted, cursor: newCursor };
};

/** Маскирует — формат + mask */
export const maskCard = (input: string, options?: FormatOptions): string => {
  const separator = options?.separator ?? ' ';
  const maskExceptLast = options?.maskExceptLast ?? 4;
  const maskChar = options?.maskChar ?? '*';
  const digits = clean(input);
  const type = detectCardType(digits);
  const groups = getGroupingForType(type);

  const parts: string[] = [];
  let idx = 0;
  for (const g of groups) {
    if (idx >= digits.length) break;
    const slice = digits
      .slice(idx, idx + g)
      .split('')
      .map((d, i) => {
        const globalIdx = idx + i;
        const isMasked =
          maskExceptLast > 0 && globalIdx < digits.length - maskExceptLast;
        return isMasked ? maskChar : d;
      })
      .join('');
    parts.push(slice);
    idx += g;
  }
  if (idx < digits.length) {
    const rem = digits
      .slice(idx)
      .split('')
      .map((d, i) => {
        const globalIdx = idx + i;
        const isMasked =
          maskExceptLast > 0 && globalIdx < digits.length - maskExceptLast;
        return isMasked ? maskChar : d;
      })
      .join('');
    parts.push(rem);
  }
  return parts.join(separator);
};
