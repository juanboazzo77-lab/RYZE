/**
 * Errores tipados del núcleo de IA. El resto del sistema NUNCA hace string
 * matching sobre mensajes: se chequea `instanceof`.
 *
 * Regla transversal: una falla de IA nunca bloquea una operación de negocio.
 * Quien llama al Gateway atrapa `AiError` y muestra un fallback.
 */

export type AiErrorCode =
  | 'BUDGET_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'PROVIDER_ERROR'
  | 'INVALID_OUTPUT'
  | 'TOOL_LIMIT'
  | 'CANCELLED'
  | 'PERMISSION_DENIED'
  | 'NOT_CONFIGURED'
  | 'BAD_REQUEST';

export class AiError extends Error {
  readonly code: AiErrorCode;
  /** Mensaje apto para mostrarle al usuario final (sin detalles técnicos). */
  readonly userMessage: string;

  constructor(code: AiErrorCode, message: string, userMessage?: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
    this.userMessage =
      userMessage ?? 'No pudimos generar la respuesta ahora. Probá de nuevo en un rato.';
  }
}

export class AiRateLimitedError extends AiError {
  constructor(label: string) {
    super(
      'RATE_LIMITED',
      `Límite de uso de IA alcanzado (${label})`,
      'Alcanzaste el límite de uso de IA de tu plan por hoy. Volvé mañana o pasate a PRO.',
    );
    this.name = 'AiRateLimitedError';
  }
}

export class AiPermissionError extends AiError {
  constructor(feature: string) {
    super(
      'PERMISSION_DENIED',
      `La feature "${feature}" no está disponible en el plan actual`,
      'Esta función es parte de FitAI PRO.',
    );
    this.name = 'AiPermissionError';
  }
}

export class AiNotConfiguredError extends AiError {
  constructor() {
    super(
      'NOT_CONFIGURED',
      'ANTHROPIC_API_KEY no está configurada',
      'La IA todavía no está configurada en esta instalación.',
    );
    this.name = 'AiNotConfiguredError';
  }
}
