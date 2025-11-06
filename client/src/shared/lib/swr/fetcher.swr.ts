import axios, { AxiosError, type AxiosRequestConfig, type Method } from 'axios';

import { showErrorMessage } from '@app/providers/messageProxy';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

interface FetcherArgs<D = unknown> {
  url: string;
  method?: Method;
  params?: Record<string, unknown>;
  data?: D;
  config?: AxiosRequestConfig;
}

const errorMessageMap: Record<string, string> = {
  'duplicate key value violates unique constraint':
    'Такой элемент уже существует',
  'null value in column': 'Не все обязательные поля заполнены',
  'violates foreign key constraint':
    'Объект связан с другими данными и не может быть удалён',
  UNAUTHORIZED: 'Вы не авторизованы',
  FORBIDDEN: 'У вас нет доступа к этому действию',
  NOT_FOUND: 'Объект не найден',
};

function mapErrorMessage(message: string): string {
  const key = Object.keys(errorMessageMap).find((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );

  return key ? errorMessageMap[key] : message;
}

export const fetcher = async <R = unknown, D = unknown>({
  url,
  method = 'GET',
  params,
  data,
  config,
}: FetcherArgs<D>): Promise<R> => {
  try {
    const response = await api.request<R>({
      url,
      method,
      params,
      data,
      ...config,
    });

    return response.data;
  } catch (err) {
    const error = err as AxiosError<ErrorResponse>;

    const serverMessage =
      error.response?.data?.error?.message ||
      error.message ||
      'Unknown error occurred';

    const userFriendlyMessage = mapErrorMessage(serverMessage);

    showErrorMessage(userFriendlyMessage);
    throw error;
  }
};
