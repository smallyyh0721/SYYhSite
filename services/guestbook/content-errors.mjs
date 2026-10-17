export class ContentError extends Error {
  constructor(statusCode, message, code, extra = {}) {
    super(message);
    this.name = "ContentError";
    this.statusCode = statusCode;
    this.code = code;
    this.expose = true;
    this.safe = true;
    if (extra.retryAfter != null) this.retryAfter = extra.retryAfter;
  }
}

export class MediaError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "MediaError";
    this.code = code;
    this.safe = true;
  }
}

export function safeMessage(error) {
  if (error && error.safe && typeof error.message === "string") {
    return error.message.slice(0, 200);
  }
  return "文件未能通过校验，原件已保留，可稍后重试。";
}
