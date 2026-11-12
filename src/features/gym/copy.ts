/** Textos de las pantallas de gimnasios (sólo español por ahora). */
export const GYM = {
  // Formulario público
  applyTitle: 'Forza AI para tu gimnasio',
  applyIntro:
    'Tus clientes escanean tu QR, se crean la cuenta y pagan su plan: un coach con IA que les arma la rutina y la dieta con las máquinas de tu gimnasio. Vos no pagás nada, llevás tus cuotas, tus clases y tus retos, y ves quiénes dejaron de entrenar. Dejanos tus datos y te contactamos.',
  fName: 'Nombre del gimnasio',
  fCity: 'Ciudad',
  fContactName: 'Tu nombre',
  fEmail: 'Email de contacto',
  fPhone: 'Teléfono o WhatsApp',
  fMembers: 'Cuántos socios tiene, aproximado',
  fMessage: 'Algo más que quieras contarnos',
  send: 'Enviar',
  sending: 'Enviando…',
  sentTitle: '¡Gracias! Recibimos tus datos',
  sentText: 'Los revisamos y te escribimos al mail que dejaste. Hasta que te autoricemos, el gimnasio todavía no tiene código.',
  errInvalid: 'Revisá el nombre del gimnasio, tu nombre y el email.',
  errTooMany: 'Hay muchas solicitudes por ahora. Probá de nuevo más tarde.',
  errGeneric: 'No se pudo enviar. Probá de nuevo.',

  // Socio (Ajustes)
  memberTitle: 'Gimnasio',
  memberIntro: 'Si tu gimnasio usa Forza AI, ingresá su código y probás todo gratis 3 días. Después activás tu plan con tu gimnasio para seguir.',
  codeLabel: 'Código del gimnasio',
  codePlaceholder: 'ABCD-2345',
  join: 'Ingresar',
  joining: 'Ingresando…',
  joined: '¡Listo! Ya estás en {name}: probás todo gratis 3 días.',
  joinedNoTrial: 'Ya estás conectado a {name}, pero tu prueba gratis ya la usaste: activá tu plan para seguir.',
  errInvalidCode: 'Ese código no existe o el gimnasio todavía no está activo.',
  errFull: 'Este gimnasio no tiene más lugares por ahora. Avisale al gimnasio.',
  errAlready: 'Ya estás en un gimnasio. Primero salí del actual.',
  inGymTitle: 'Estás en {name}',
  inGymText:
    'Usás Forza AI sin pagar mientras tu gimnasio siga activo. El gimnasio ve cuántos socios usan la app en total, no tus datos de salud.',
  leave: 'Salir del gimnasio',
  leaveConfirm: '¿Salir de este gimnasio? Vas a volver a tu plan normal.',
  left: 'Saliste del gimnasio.',
  shareTitle: 'Que mi gimnasio vea mi nombre y mi actividad',
  shareText:
    'Si lo activás, el dueño ve tu nombre y hace cuántos días entrenaste por última vez, para poder ayudarte si te alejás. Tu peso, tus fotos y tus comidas nunca se comparten. Podés apagarlo cuando quieras.',
  joinShareLabel: 'Dejar que mi gimnasio vea mi nombre y cuándo entrené por última vez',
  joinShareHelp:
    'Así el gimnasio puede ayudarte si te alejás. Nunca ve tu peso, tus fotos ni tus comidas. Lo podés apagar cuando quieras en Ajustes, en Gimnasio.',
  noGymTitle: 'Todavía no estás en un gimnasio',
  noGymText: 'Si tu gimnasio te pasó un código, ingresalo acá: probás todo gratis 3 días. Si escaneás el QR del gimnasio y activás tu plan, también queda conectado.',
  trialActiveTitle: 'Prueba gratis: te quedan {days}',
  trialActiveText: 'Probás todo con {name}. Para seguir cuando termine, activá tu plan: es el mismo que se activa escaneando el QR del gimnasio.',
  trialEndedTitle: 'Terminó tu prueba gratis',
  trialEndedText: 'Seguís conectado a {name}, pero para volver a usar tu plan, el coach y las clases activá tu plan con el gimnasio.',
  activatePlan: 'Activar mi plan',
  rowDesc: 'Tu gimnasio en Forza AI',
  rowDescIn: 'Estás en {name}',

  // Admin
  adminTitle: 'Gimnasios',
  adminEmpty: 'Todavía no hay gimnasios.',
  pending: 'Pendiente',
  active: 'Activo',
  suspended: 'Suspendido',
  rejected: 'Rechazado',
  approve: 'Aprobar',
  reject: 'Rechazar',
  suspend: 'Suspender',
  reactivate: 'Reactivar',
  limitLabel: 'Cupo de socios',
  saveLimit: 'Guardar cupo',
  newCode: 'Cambiar código',
  newCodeConfirm: '¿Cambiar el código? El anterior deja de servir (los socios que ya entraron siguen adentro).',
  members: 'socios',
  trainedWeek: 'entrenaron esta semana',
  fullWarning: 'Cupo lleno',
  saved: 'Guardado.',
  error: 'No se pudo completar. Probá de nuevo.',
} as const;

export const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
