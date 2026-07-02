const SECRET_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key"
]);

export function createApiObserver(options = {}) {
  const mode = options.mode ?? "off";
  const logger = options.logger ?? console.log;

  return {
    emit(event) {
      const sanitizedEvent = sanitizeApiEvent({
        timestamp: new Date().toISOString(),
        ...event
      });

      if (mode === "stdout") {
        logger(JSON.stringify(sanitizedEvent));
      }

      return sanitizedEvent;
    }
  };
}

export function sanitizeApiEvent(event) {
  const sanitizedEvent = {
    ...event
  };

  if (sanitizedEvent.headers) {
    sanitizedEvent.headers = sanitizeHeaders(sanitizedEvent.headers);
  }

  if (sanitizedEvent.body) {
    sanitizedEvent.body = "[redacted]";
  }

  if (sanitizedEvent.requestBody) {
    sanitizedEvent.requestBody = "[redacted]";
  }

  if (sanitizedEvent.apiKey) {
    sanitizedEvent.apiKey = "[redacted]";
  }

  if (sanitizedEvent.token) {
    sanitizedEvent.token = "[redacted]";
  }

  return sanitizedEvent;
}

function sanitizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => {
      return SECRET_HEADER_NAMES.has(name.toLowerCase())
        ? [name, "[redacted]"]
        : [name, value];
    })
  );
}
