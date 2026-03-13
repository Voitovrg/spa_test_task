import axios, { type InternalAxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    (typeof window !== "undefined" ? window.location.origin : ""),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ——— Типы ошибок API ———

export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly data?: unknown;
  public readonly validationErrors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    statusText: string,
    data?: unknown,
    validationErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.validationErrors = validationErrors;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isValidationError(): boolean {
    return this.status === 400 && !!this.validationErrors;
  }
}

export class RequestAbortedError extends Error {
  constructor(message = "Запрос отменён") {
    super(message);
    this.name = "RequestAbortedError";
  }
}

// ——— Метаданные запроса (время для отмены предыдущих) ———

export interface RequestMeta {
  requestTime: number;
  requestKey?: string;
}

declare module "axios" {
  interface InternalAxiosRequestConfig {
    meta?: RequestMeta;
  }
}

// ——— Response interceptor: нормализация ошибок ———

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(new RequestAbortedError(error.message || "Запрос отменён"));
    }

    if (!error.response) {
      // Сеть, таймаут и т.д.
      const message =
        error.code === "ECONNABORTED"
          ? "Превышено время ожидания ответа"
          : error.message || "Ошибка сети";
      return Promise.reject(new ApiError(message, 0, "NetworkError", undefined));
    }

    const { status, statusText, data } = error.response;
    const message =
      typeof data?.message === "string"
        ? data.message
        : data?.error || statusText || `Ошибка ${status}`;

    // Попытка извлечь ошибки валидации (например, { errors: { field: ["msg"] } })
    const validationErrors =
      status === 400 && data && typeof data === "object" && data.errors
        ? (data.errors as Record<string, string[]>)
        : undefined;

    return Promise.reject(
      new ApiError(message, status, statusText, data, validationErrors),
    );
  },
);

// ——— Request interceptor: добавление времени запроса ———

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const requestKey = config.meta?.requestKey;
  const requestTime = config.meta?.requestTime ?? Date.now();
  config.meta = {
    ...config.meta,
    requestTime,
    requestKey,
  };
  return config;
});

// ——— Abort ———
// Для отмены запроса передавайте AbortSignal в config: api.get(url, { signal })

// ——— Отмена предыдущего запроса по ключу (по времени запроса) ———

interface PendingRequest {
  controller: AbortController;
  requestTime: number;
}

const pendingByKey = new Map<string, PendingRequest>();

/**
 * Выполняет запрос с отменой предыдущего по тому же ключу.
 * Если вызывается новый запрос с тем же key, у предыдущего вызывается abort,
 * и обрабатывается только ответ от запроса с более свежим временем.
 */
export async function withCancelPrevious<T>(
  key: string,
  requestFn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const requestTime = Date.now();

  const pending = pendingByKey.get(key);
  if (pending) {
    pending.controller.abort();
    pendingByKey.delete(key);
  }

  pendingByKey.set(key, { controller, requestTime });

  try {
    const result = await requestFn(controller.signal);
    const current = pendingByKey.get(key);
    if (current?.requestTime === requestTime) {
      pendingByKey.delete(key);
    }
    return result;
  } catch (err) {
    const current = pendingByKey.get(key);
    if (current?.requestTime === requestTime) {
      pendingByKey.delete(key);
    }
    throw err;
  }
}

/**
 * Отменить все ожидающие запросы по ключу (или все, если key не передан).
 */
export function cancelPending(key?: string): void {
  if (key) {
    const pending = pendingByKey.get(key);
    if (pending) {
      pending.controller.abort();
      pendingByKey.delete(key);
    }
  } else {
    pendingByKey.forEach((p) => p.controller.abort());
    pendingByKey.clear();
  }
}

export default api;
