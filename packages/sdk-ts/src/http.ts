export class ErabiSdkError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ErabiSdkError";
  }
}

export async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    const error = (json.error ?? {}) as { code?: string; message?: string; details?: unknown };
    throw new ErabiSdkError(
      response.status,
      error.code ?? "http_error",
      error.message ?? `${method} ${url} → ${response.status}`,
      error.details,
    );
  }
  return json as T;
}
