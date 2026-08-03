type FullNameParts = {
  lastName?: string;
  firstName?: string;
  middleName?: string;
};

const capitalize = (word?: string): string => {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

export const buildFullName = ({
  lastName,
  firstName,
  middleName,
}: FullNameParts): string => {
  const l = lastName?.trim();
  const f = firstName?.trim();
  const m = middleName?.trim();

  if (l && !f && !m) return capitalize(l);
  if (!l && f && !m) return capitalize(f);
  if (!l && !f && m) return capitalize(m);

  if (!l && f && m) return `${capitalize(f)} ${capitalize(m)}`;

  if (l && f && !m) return `${capitalize(l)} ${capitalize(f[0])}.`;

  if (l && !f && m) return `${capitalize(l)} ${capitalize(m)}`;

  if (l && f && m)
    return `${capitalize(l)} ${capitalize(f[0])}. ${capitalize(m[0])}.`;

  return '';
};
