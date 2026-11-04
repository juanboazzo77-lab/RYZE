/**
 * Textos del modo entrenador. Es un piloto cerrado en Argentina: por ahora sólo en español
 * (no pasan por el diccionario de idiomas). Si el modo se abre al público, se mueven allá.
 */
export const TC = {
  settingsRow: 'Entrenador',
  settingsRowDesc: 'Conectá con tu entrenador o sumate como entrenador',
  pageTitle: 'Entrenador',

  clientTitle: 'Mi entrenador',
  clientIntro: 'Si tenés un entrenador en Forza AI, pegá el código que te dio para que pueda seguir tu progreso.',
  codeLabel: 'Código del entrenador',
  codePlaceholder: 'Ej: ABCD2345',
  codeContinue: 'Continuar',
  codeInvalid: 'No encontramos un entrenador con ese código. Revisalo con tu entrenador.',
  codeSelf: 'Ese es tu propio código.',
  codeAlready: 'Ya tenés un entrenador. Dejá de compartir con el actual para conectar con otro.',
  codeFull: 'Ese entrenador no tiene lugar por ahora.',
  codeTrainerAccount: 'Tu cuenta es de entrenador y no se puede conectar con otro entrenador.',
  alreadyClient: 'Esta cuenta ya es de cliente. Para ser entrenador, creá otra cuenta con otro mail.',
  consentTitle: 'Vas a compartir tus datos con {name}',
  consentShare:
    'Tu entrenador va a poder ver todo sobre vos: tu perfil completo, tu objetivo, tu peso, tus entrenamientos, tus comidas, tus pasos, tus récords, tus revisiones semanales y lo que el coach recuerda de vos (incluye lesiones o molestias). Desde que ingresás su código, también maneja tu rutina y tus objetivos de nutrición (los crea y los edita) y chatea con vos, sin pedirte permiso cada vez.',
  consentNot:
    'No ve tu email ni tu teléfono. Solo ve las fotos que subas en tu revisión semanal (las demás no se comparten, y se borran si dejás de compartir). Fuera de tu rutina y tu dieta, no puede cambiar nada de tu cuenta. Tu entrenador puede usar la IA de Forza AI para analizar tus datos y prepararte planes: esos datos se procesan con un proveedor de IA externo.',
  consentStop:
    'Podés dejar de compartir cuando quieras, y desde ese momento deja de ver tus datos y de manejar tu rutina y tu dieta.',
  consentCheck: 'Entiendo y acepto compartir estos datos con mi entrenador',
  consentAccept: 'Aceptar y compartir',
  consentCancel: 'Cancelar',
  linked: 'Estás compartiendo tus datos con {name} desde el {date}.',
  stop: 'Dejar de compartir',
  stopConfirm: '¿Dejar de compartir tus datos con tu entrenador? Va a dejar de verlos ahora mismo.',
  stopped: 'Listo, tu entrenador ya no ve tus datos.',

  cancelTitle: 'Dejar de ser entrenador',
  cancelHelp:
    'Tu cuenta vuelve a ser de cliente, con tu panel y tus datos de siempre. Tus clientes dejan de estar conectados con vos, y se borran tu perfil de entrenador, tus notas y tus chats con clientes. Las rutinas y dietas que armaste siguen en la cuenta de cada cliente.',
  cancelButton: 'Dejar de ser entrenador',
  cancelConfirm:
    '¿Dejar de ser entrenador? Tus clientes se desconectan y se borran tus notas y tus chats con ellos. Tu cuenta vuelve a ser de cliente, con tu panel de siempre. Esto no se puede deshacer.',
  trainerTitle: 'Soy entrenador',
  trainerIntro:
    'Si sos entrenador, pedí acceso. Revisamos tu título o certificado y, si está todo bien, te activamos el panel para seguir a tus clientes.',
  nameLabel: 'Tu nombre como entrenador',
  bioLabel: 'Presentación (opcional)',
  credentialLabel: 'Título o certificado',
  credentialPlaceholder: 'Ej: Profesor de Educación Física, UNLP 2018',
  apply: 'Pedir acceso',
  applied: 'Recibimos tu solicitud.',
  pending: 'Tu solicitud está en revisión. Te avisamos cuando esté lista.',
  suspended: 'Tu cuenta de entrenador está suspendida. Escribinos si creés que es un error.',
  panelLink: 'Ir a mi panel de entrenador',
  inviteTitle: 'Tu código para clientes',
  inviteHelp: 'Pasale este código a tus clientes. Ellos lo ingresan en Ajustes → Entrenador y aceptan compartir sus datos con vos.',
  copy: 'Copiar',
  copied: 'Código copiado',
  renew: 'Cambiar código',
  renewConfirm: '¿Cambiar tu código? El anterior deja de funcionar para clientes nuevos (los que ya están conectados siguen igual).',
  error: 'No se pudo completar. Probá de nuevo.',

  panelTitle: 'Mis clientes',
  panelEmpty: 'Todavía no tenés clientes conectados. Pasales tu código para que se conecten.',
  panelCount: '{n} clientes',
  lastActivity: 'Última actividad',
  never: 'Sin actividad todavía',
  today: 'hoy',
  daysAgo: 'hace {n} días',
  dayAgo: 'hace 1 día',
  weight: 'Peso',
  change30: 'en 30 días',
  attention: {
    OK: 'Al día',
    LATE: 'Atrasado',
    INACTIVE: 'Sin actividad',
    NEW: 'Nuevo',
  },

  back: 'Volver a mis clientes',
  goalLabel: 'Objetivo',
  basicsTitle: 'Perfil',
  injuries: 'Lesiones o limitaciones',
  targetTitle: 'Objetivo de nutrición',
  weightTitle: 'Peso (últimos 60 días)',
  workoutsTitle: 'Últimos entrenamientos',
  noWorkouts: 'Todavía no completó entrenamientos.',
  nutritionTitle: 'Comidas (últimos 7 días)',
  noNutrition: 'No cargó comidas en los últimos 7 días.',
  planTitle: 'Rutina actual',
  noPlan: 'No tiene una rutina activa.',
  checkinsTitle: 'Revisiones semanales',
  noCheckins: 'Todavía no hizo revisiones.',
  memoryTitle: 'Lo que el coach recuerda',
  noMemory: 'El coach todavía no anotó nada.',
  removeClient: 'Quitar cliente',
  removeConfirm: '¿Quitar a este cliente? Dejás de ver sus datos.',

  adminTitle: 'Entrenadores',
  adminEmpty: 'Todavía nadie pidió acceso como entrenador.',
  approve: 'Aprobar',
  suspend: 'Suspender',
  reactivate: 'Reactivar',
  setPending: 'Pasar a pendiente',
  statuses: { PENDING: 'Pendiente', ACTIVE: 'Activo', SUSPENDED: 'Suspendido' },
} as const;

export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

/** "hoy", "hace 1 día", "hace N días" a partir de una fecha ISO y la de hoy. */
export function relativeDay(iso: string | null, todayISO: string): string {
  if (!iso) return TC.never;
  const days = Math.max(0, Math.round((Date.parse(`${todayISO}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000));
  if (days === 0) return TC.today;
  if (days === 1) return TC.dayAgo;
  return fill(TC.daysAgo, { n: days });
}

export const GOAL_LABEL: Record<string, string> = {
  LOSE_FAT: 'Bajar grasa',
  GAIN_MUSCLE: 'Ganar músculo',
  RECOMP: 'Recomposición',
  MAINTAIN: 'Mantener',
  STRENGTH: 'Fuerza',
  PERFORMANCE: 'Rendimiento',
  UNDECIDED: 'Sin definir',
};

export const EXPERIENCE_LABEL: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

export const SEX_LABEL: Record<string, string> = { MALE: 'Hombre', FEMALE: 'Mujer', OTHER: 'Otro' };

export const MEMORY_CATEGORY_LABEL: Record<string, string> = {
  HEALTH: 'Salud',
  PREFERENCE: 'Gustos',
  SCHEDULE: 'Horarios',
  GOAL: 'Metas',
  OTHER: 'Otros',
};

/** Cómo se dibuja cada estado de atención (el distintivo no tiene variante "peligro"). */
export const ATTENTION_BADGE: Record<
  'OK' | 'LATE' | 'INACTIVE' | 'NEW',
  { variant: 'success' | 'warning' | 'outline' | 'secondary'; className?: string }
> = {
  OK: { variant: 'success' },
  LATE: { variant: 'warning' },
  INACTIVE: { variant: 'outline', className: 'border-destructive/60 text-destructive' },
  NEW: { variant: 'secondary' },
};

/** Textos del chat entre entrenador y cliente (piloto, sólo en español). */
export const CHAT = {
  button: 'Chat',
  buttonWithName: 'Chatear con {name}',
  title: 'Chat con {name}',
  back: 'Volver',
  notice:
    'Por seguridad, los mensajes se revisan de forma automática para que la conversación se mantenga dentro de Forza AI. No se pueden enviar teléfonos, correos, enlaces ni usuarios de redes.',
  placeholder: 'Escribí un mensaje…',
  send: 'Enviar',
  empty: 'Todavía no hay mensajes. Escribí el primero.',
  seen: 'Visto',
  unread: '{n} sin leer',
  rate: 'Estás escribiendo muy rápido. Esperá un momento.',
  notLinked: 'Esta conversación ya no está disponible.',
  error: 'No se pudo enviar. Probá de nuevo.',
  tooLong: 'El mensaje es muy largo.',
  blocked: {
    PHONE: 'No se pueden enviar teléfonos. Por tu seguridad, la conversación se mantiene dentro de Forza AI.',
    EMAIL: 'No se pueden enviar correos. Por tu seguridad, la conversación se mantiene dentro de Forza AI.',
    LINK: 'No se pueden enviar enlaces. Por tu seguridad, la conversación se mantiene dentro de Forza AI.',
    HANDLE: 'No se pueden enviar usuarios de redes. Por tu seguridad, la conversación se mantiene dentro de Forza AI.',
    APP: 'No se pueden nombrar otras apps de mensajes. Por tu seguridad, la conversación se mantiene dentro de Forza AI.',
    OFF_PLATFORM: 'La conversación tiene que mantenerse dentro de Forza AI. Reformulá el mensaje sin pedir contacto por afuera.',
  },
  blockedAttempts: '{n} intentos bloqueados (30 días)',
} as const;

/** Elección de tipo de cuenta al crear la cuenta (cliente o entrenador). */
export const ACCOUNT = {
  title: '¿Cómo vas a usar Forza AI?',
  subtitle: 'Elegí una. Son cuentas separadas: si sos las dos cosas, usá un mail para cada una.',
  clientTitle: 'Soy cliente',
  clientDesc: 'Quiero entrenar, llevar mi alimentación y mi progreso.',
  trainerTitle: 'Soy entrenador',
  trainerDesc: 'Quiero seguir a mis clientes, armarles el plan y chatear con ellos.',
  trainerFormTitle: 'Tu cuenta de entrenador',
  trainerFormIntro:
    'Contanos quién sos. Revisamos tu título o certificado y, cuando esté aprobado, se activa tu panel. No vas a tener que completar el cuestionario de cliente.',
  back: 'Volver',
  pendingTitle: 'Tu cuenta está en revisión',
} as const;

/** Seguimiento 1 a 1, rutina y dieta del cliente (piloto, sólo en español). */
export const FU = {
  followTitle: 'Seguimiento 1 a 1',
  nextLabel: 'Próximo seguimiento',
  nextNone: 'Sin fecha',
  nextSave: 'Guardar fecha',
  nextClear: 'Quitar fecha',
  nextOverdue: 'Vencido',
  notesTitle: 'Notas privadas',
  notesHelp: 'Solo las ves vos. Sirven para recordar cómo viene cada cliente.',
  noteAdd: 'Agregar nota',
  notePlaceholder: 'Ej: Hablamos del hombro, probar press con mancuernas.',
  noteDelete: 'Borrar',
  noNotes: 'Todavía no hay notas.',
  feedbackTitle: 'Feedback de la revisión',
  feedbackPlaceholder: 'Escribile su feedback. Le llega por el chat.',
  feedbackSend: 'Enviar feedback',
  feedbackSent: 'Feedback enviado',
  feedbackDone: 'Tu feedback',
  savedOk: 'Guardado',
  error: 'No se pudo completar. Probá de nuevo.',

  planTitle: 'Rutina y dieta',
  routinesTitle: 'Rutinas',
  noRoutines: 'Todavía no tiene rutinas.',
  activeBadge: 'Activa',
  daysCount: '{n} días',
  editRoutine: 'Editar',
  newRoutineName: 'Nombre de la rutina nueva',
  newRoutine: 'Crear rutina',
  tellRoutine: 'Avisarle que actualicé la rutina',
  tellDiet: 'Avisarle que actualicé la dieta',
  told: 'Aviso enviado por el chat',
  dietTitle: 'Dieta: objetivos diarios',
  kcal: 'Calorías',
  protein: 'Proteína (g)',
  carbs: 'Carbohidratos (g)',
  fat: 'Grasa (g)',
  dietNote: 'Pautas para tu cliente (opcional)',
  dietNotePlaceholder: 'Ej: Priorizá proteína en cada comida. Tomá 2 L de agua.',
  dietSave: 'Guardar objetivos',
  dietInvalid: 'Revisá los números: calorías entre 1000 y 6000, proteína entre 30 y 400 g.',
  backToClient: 'Volver al cliente',
  routineEditorTitle: 'Rutina de {name}',
} as const;

/** IA del entrenador (piloto, sólo en español). */
export const AIC = {
  navLabel: 'Asistente',
  title: 'Asistente de IA',
  subtitle: 'Preguntale por tus clientes: quién necesita atención, cómo viene cada uno y qué ajustar.',
  allClients: 'Todos mis clientes',
  clientLabel: 'Hablar sobre',
  placeholder: 'Escribí tu pregunta…',
  send: 'Enviar',
  thinking: 'Pensando…',
  empty: 'Probá con una de estas preguntas:',
  examples: [
    '¿A quién tengo que escribirle hoy?',
    'Resumime cómo viene cada cliente',
    '¿Quién se está estancando?',
  ],
  exampleForClient: ['Resumime cómo viene este cliente', '¿Qué ajustarías en su rutina?', '¿Cómo viene con la alimentación?'],
  limit: 'Llegaste al tope de mensajes de IA de hoy. Mañana se renueva.',
  error: 'No se pudo obtener una respuesta. Probá de nuevo.',
  noClient: 'No encontré a ese cliente entre los tuyos.',
  disclaimer: 'La IA puede equivocarse: revisá los datos. No reemplaza tu criterio profesional.',
  reset: 'Nueva conversación',
  askAboutClient: 'Preguntar a la IA sobre este cliente',

  draftTitle: 'Crear rutina con IA',
  draftHelp:
    'La IA arma un borrador con el perfil de tu cliente. Queda sin activar y con el nombre "Borrador": lo revisás y lo ajustás antes de activarlo.',
  draftBrief: 'Indicaciones (opcional)',
  draftBriefPlaceholder: 'Ej: 4 días, énfasis en espalda, sin sentadilla por la rodilla.',
  draftButton: 'Crear borrador con IA',
  drafting: 'Armando el borrador… (puede tardar hasta un minuto)',
  draftLimit: 'Llegaste al tope de borradores de hoy. Mañana se renueva.',
  draftError: 'No se pudo armar el borrador. Probá de nuevo.',

  suggestDiet: 'Sugerir objetivos',
  suggestMissing: 'Faltan datos del cliente (peso, altura, objetivo o actividad) para calcular.',
  suggested: 'Sugerencia cargada: revisala y ajustala antes de guardar.',
} as const;

/** Lo que ve un cliente conectado con un entrenador (piloto, sólo en español). */
export const MANAGED = {
  coachTitle: 'Tu entrenador maneja tu seguimiento',
  coachText:
    'Mientras estés conectado con {name}, tu rutina, tu dieta y tus revisiones las maneja él o ella. Por eso el Coach con IA no está disponible. Escribile por el chat para consultarle lo que necesites.',
  coachCta: 'Chatear con mi entrenador',
  plansTitle: 'No necesitás ningún plan',
  plansText:
    'Estás conectado con tu entrenador, que maneja tu seguimiento. Mientras sigas conectado, usás la app sin pagar ningún plan.',
  plansBack: 'Volver a Ajustes',
  checkinNotice:
    'Tu entrenador va a revisar esta revisión y te manda su feedback por el chat. Las fotos que subas las ve solo tu entrenador.',
  photosNote:
    'Las fotos que subas las ve solo tu entrenador y se guardan de forma privada. Se borran si dejás de compartir con él.',
  checkinSent: 'Revisión enviada. Tu entrenador la va a mirar y te escribe por el chat.',
  checkinFeedback: 'Feedback de tu entrenador',
  checkinWaiting: 'Todavía no te dio su feedback.',
} as const;

/** Revisión semanal que hace el entrenador (piloto, sólo en español). */
export const REV = {
  pending: 'Revisión pendiente',
  reviewed: 'Revisada',
  period: 'Del {from} al {to}',
  weekOf: 'Semana del {date}',
  stats: 'Números de la revisión',
  avgWeight: 'Peso promedio',
  change: 'Cambio de peso',
  kcal: 'Adherencia a calorías',
  protein: 'Adherencia a proteína',
  workouts: 'Entrenamientos',
  feel: 'Cómo se sintió (1 a 5)',
  dietNote: 'Sobre la dieta',
  clientNotes: 'Notas del cliente',
  photos: 'Fotos de la revisión',
  photosHelp: 'Solo las ves vos. Los enlaces vencen en una hora; recargá la página para verlas de nuevo.',
  noPhotos: 'No subió fotos en esta revisión.',
  suggest: 'Sugerir feedback con IA',
  suggesting: 'Redactando…',
  suggested: 'Borrador cargado: revisalo y corregilo antes de enviarlo.',
  suggestError: 'No se pudo redactar el borrador. Escribilo vos o probá de nuevo.',
  suggestLimit: 'Llegaste al tope de mensajes de IA de hoy.',
} as const;
