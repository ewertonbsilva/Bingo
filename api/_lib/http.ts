export function json(res: any, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export function allowMethod(req: any, res: any, methods: string[]) {
  if (methods.includes(req.method || "")) {
    return true;
  }

  res.setHeader("Allow", methods.join(", "));
  json(res, 405, { error: "Metodo nao permitido." });
  return false;
}

export async function readJsonBody<T>(req: any): Promise<T> {
  if (req.body && typeof req.body === "object") {
    return req.body as T;
  }

  if (typeof req.body === "string" && req.body) {
    return JSON.parse(req.body) as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return (raw ? JSON.parse(raw) : {}) as T;
}

export function getQueryString(value: unknown) {
  if (Array.isArray(value)) {
    return String(value[0] ?? "");
  }
  return String(value ?? "");
}

export function getQueryNumber(value: unknown) {
  const num = Number(getQueryString(value));
  return Number.isFinite(num) ? num : NaN;
}

export function handleError(res: any, error: unknown, fallback = "Erro interno do servidor.", status = 500) {
  const message = error instanceof Error ? error.message : fallback;
  json(res, status, { error: message || fallback });
}
