import { type FC, useCallback, useMemo, useState } from 'react';

import {
  EditableContext,
  type EditableProviderProps,
} from './editable.context';

const emptySetting: EditableProviderProps['settings'] = {};

export const EditableProvider: FC<EditableProviderProps> = ({
  children,
  settings = emptySetting,
}) => {
  const {
    cancelOnBlur,
    confirmOnBlur,
    ignoredOutsideClasses,
    resetValueOnEditingEnd,
    saveValueOnEditingEnd,
  } = settings;
  const [activeEditableId, setActiveEditableId] = useState<string | null>(null);
  const clearActiveEditableId = useCallback(
    () => setActiveEditableId(null),
    [],
  );

  const contextValue = useMemo(
    () => ({
      cancelOnBlur,
      confirmOnBlur,
      ignoredOutsideClasses,
      resetValueOnEditingEnd,
      saveValueOnEditingEnd,
      activeEditableId,
      setActiveEditableId,
      clearActiveEditableId,
    }),
    [
      cancelOnBlur,
      confirmOnBlur,
      ignoredOutsideClasses,
      resetValueOnEditingEnd,
      saveValueOnEditingEnd,
      activeEditableId,
      setActiveEditableId,
      clearActiveEditableId,
    ],
  );

  return <EditableContext value={contextValue}>{children}</EditableContext>;
};
