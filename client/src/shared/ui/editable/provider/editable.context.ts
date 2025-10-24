import { createContext, type ReactNode } from 'react';

export interface EditableContextValue {
  confirmOnBlur?: boolean;
  cancelOnBlur?: boolean;
  resetValueOnEditingEnd?: boolean;
  saveValueOnEditingEnd?: boolean;
  ignoredOutsideClasses?: string[];

  activeEditableId?: string | null;
  setActiveEditableId?: (id: string) => void;
  clearActiveEditableId?: () => void;
}

type EditableSetting = Omit<
  EditableContextValue,
  'activeEditableId' | 'setActiveEditableId' | 'clearActiveEditableId'
>;

export interface EditableProviderProps {
  settings?: EditableSetting;
  children?: ReactNode;
}

export const EditableContext = createContext<EditableContextValue | null>(null);
