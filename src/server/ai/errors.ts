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
  constructor(label: string, userMessage?: string) {
    super(
      'RATE_LIMITED',
      `Límite de uso de IA alcanzado (${label})`,
      userMessage ?? 'Alcanzaste el límite de uso de IA de tu plan por hoy. Volvé mañana o pasate a PRO.',
    );
    this.name = 'AiRateLimitedError';
  }
}

export class AiPermissionError extends AiError {
  constructor(feature: string) {
    super(
      'PERMISSION_DENIED',
      `La feature "${feature}" no está disponible en el plan actual`,
      'Esta función es parte de FORZA AI PRO.',
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

/**
 * Lo que se le muestra a la persona cuando falla un pedido a la IA. Nunca lleva códigos ni detalles técnicos (eso queda
 * en el log del servidor): el mensaje propio del error (límite, plan, sin configurar) o uno amable según el tipo de falla.
 */
export function friendlyAiMessage(e: unknown): string {
  if (e instanceof AiRateLimitedError || e instanceof AiPermissionError || e instanceof AiNotConfiguredError) return e.userMessage;
  if (e instanceof AiError) {
    switch (e.code) {
      case 'TIMEOUT':
        return 'La IA está tardando más de lo normal. Probá de nuevo en un minuto.';
      case 'INVALID_OUTPUT':
        return 'La IA no pudo armar bien la respuesta esta vez. Probá de nuevo.';
      case 'PROVIDER_ERROR':
        return 'La IA tiene mucha demanda en este momento. Probá de nuevo en un minuto.';
      default:
        return e.userMessage;
    }
  }
  return 'No pudimos generar la respuesta ahora. Probá de nuevo en un minuto.';
}
