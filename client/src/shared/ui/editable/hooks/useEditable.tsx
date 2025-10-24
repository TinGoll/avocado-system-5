import { uniq } from 'es-toolkit';
import {
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { defaultIgnoredOutsideClasses } from '../defaultIgnoredOutsideClasses';
import type {
  ChangeFn,
  ControlProps,
  EditableCoreProps,
} from '../editable.types';
import {
  EditableContext,
  type EditableContextValue,
} from '../provider/editable.context';

export type EditableHookReturn<T> = {
  editing: boolean;
  value?: T;
  reasonValue?: string | null;
  isDisabled?: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  controlRef: RefObject<HTMLElement | null>;
  controlProps: ControlProps<T>;

  startEdit: () => void;
  stopEdit: () => void;
  setReasonValue: Dispatch<React.SetStateAction<string | null>>;
  onConfirm: () => void;
  onCancel: () => void;
  onChange: ChangeFn;
};

export const useEditable = <T,>(
  props: EditableCoreProps<T>,
): EditableHookReturn<T> => {
  const {
    name,
    defaultValue,
    disabled,
    cancelOnBlur: localCancelOnBlur,
    confirmOnBlur: localConfirmOnBlur,
    defaultReasonValue,
    resetValueOnEditingEnd: localResetValueOnEditingEnd,
    saveValueOnEditingEnd: localSaveValueOnEditingEnd,
    ignoredOutsideClasses: localIgnoredOutsideClasses,
    onSave,
    onCancel,
    onEditingBegin,
    onEditingEnd,
  } = props;

  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [initialValue, setInitialValue] = useState<T | undefined>(defaultValue);
  const [reasonValue, setReasonValue] = useState<string | null>(
    defaultReasonValue || null,
  );

  const latestValueRef = useRef(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const [editing, setEditing] = useState<boolean>(false);
  const isDisabled = disabled;

  const containerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLElement>(null);
  const context = use(EditableContext) || ({} as EditableContextValue);
  const {
    cancelOnBlur: globalCancelOnBlur,
    confirmOnBlur: globalConfirmOnBlur,
    ignoredOutsideClasses: globalIgnoredOutsideClasses,
    resetValueOnEditingEnd: globalResetValueOnEditingEnd,
    saveValueOnEditingEnd: globalSaveValueOnEditingEnd,
    activeEditableId,
    clearActiveEditableId,
    setActiveEditableId,
  } = context;

  const confirmOnBlur = localConfirmOnBlur ?? globalConfirmOnBlur;
  const cancelOnBlur = localCancelOnBlur ?? globalCancelOnBlur;
  const resetValueOnEditingEnd =
    localResetValueOnEditingEnd ?? globalResetValueOnEditingEnd;
  const saveValueOnEditingEnd =
    localSaveValueOnEditingEnd ?? globalSaveValueOnEditingEnd;

  const ignoredOutsideClasses: string[] = useMemo(() => {
    return uniq([
      ...defaultIgnoredOutsideClasses,
      ...(globalIgnoredOutsideClasses || []),
      ...(localIgnoredOutsideClasses || []),
    ]);
  }, [globalIgnoredOutsideClasses, localIgnoredOutsideClasses]);

  const startEdit = useCallback((): void => {
    if (!editing && !isDisabled) {
      const currentVal = latestValueRef.current;

      setInitialValue(currentVal);
      setValue(currentVal);
      setEditing(true);
      setActiveEditableId?.(name);
      onEditingBegin?.(name);
    }
  }, [editing, isDisabled, setActiveEditableId, name, onEditingBegin]);

  const stopEdit = useCallback((): void => {
    if (editing) {
      setEditing(false);
      if (resetValueOnEditingEnd) {
        setValue(initialValue);
      }
      clearActiveEditableId?.();
      onEditingEnd?.(name);
    }
  }, [
    clearActiveEditableId,
    editing,
    initialValue,
    name,
    onEditingEnd,
    resetValueOnEditingEnd,
  ]);

  const confirm = useCallback((): void => {
    const currentValueToSave = latestValueRef.current;
    const isNeedSaving = currentValueToSave !== initialValue;

    if (isNeedSaving) {
      onSave?.(name, currentValueToSave, reasonValue);
    }
    stopEdit();
  }, [initialValue, name, onSave, reasonValue, stopEdit]);

  const cancel = useCallback(() => {
    onCancel?.();
    setValue(initialValue);
    stopEdit();
  }, [initialValue, onCancel, stopEdit]);

  const change: ChangeFn = (event) => {
    let newValue: T | undefined;
    if (
      event &&
      typeof event === 'object' &&
      'target' in event &&
      event.target instanceof HTMLElement
    ) {
      const targetValue = (
        event.target as HTMLInputElement | HTMLTextAreaElement
      ).value;
      if (typeof targetValue === 'number') {
        newValue = parseFloat(targetValue) as T;
      } else {
        newValue = targetValue as T;
      }
    } else {
      newValue = event as T;
    }
    setValue(newValue);
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        setTimeout(() => {
          confirm();
        }, 0);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    },
    [cancel, confirm],
  );

  // Ловим клик внеобласти.
  useEffect(() => {
    if (!editing || (!cancelOnBlur && !confirmOnBlur)) {
      return;
    }

    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement;
      const isIgnoredClick = ignoredOutsideClasses?.some((className) =>
        target?.closest(`.${className}`),
      );

      if (
        containerRef.current &&
        !containerRef.current?.contains(target) &&
        !isIgnoredClick
      ) {
        if (confirmOnBlur) {
          confirm();
        } else if (cancelOnBlur) {
          cancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    cancel,
    cancelOnBlur,
    confirm,
    confirmOnBlur,
    editing,
    ignoredOutsideClasses,
  ]);

  // Для закрытия всех Editable кроме текущего.
  useEffect(() => {
    if (!editing || !activeEditableId) {
      return;
    }

    if (activeEditableId !== name) {
      if (saveValueOnEditingEnd) {
        confirm();
      } else {
        cancel();
      }
    }
  }, [activeEditableId, cancel, confirm, editing, name, saveValueOnEditingEnd]);

  useEffect(() => {
    if (editing && controlRef.current) {
      const timerId = setTimeout(() => {
        const currentControl = controlRef.current as HTMLElement | null;
        if (currentControl && typeof currentControl.focus === 'function') {
          currentControl.focus();
        }
      }, 50);
      return (): void => clearTimeout(timerId);
    }

    return undefined;
  }, [editing]);

  const controlProps: ControlProps<T> = {
    value,
    onChange: change,
    defaultValue,
    onKeyDown: handleKeyDown,
  };

  return {
    editing,
    value,
    reasonValue,
    isDisabled,
    containerRef,
    controlRef,
    controlProps,

    startEdit,
    stopEdit,
    setReasonValue,
    onConfirm: confirm,
    onCancel: cancel,
    onChange: change,
  };
};
