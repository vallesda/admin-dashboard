/**
 * CAT — el ciclo de un producto por encargo. Puro: sin base de datos, sin red.
 *
 * La promesa que hace la tienda es: *«pídelo antes del martes a las 6, y el
 * viernes lo tienes»*. Eso es un ciclo semanal recurrente, no una fecha, y
 * convertirlo en las dos fechas concretas que ve un cliente es donde está toda
 * la dificultad.
 *
 * Tres cosas hacen que no sea trivial:
 *
 * 1. **Quien mira después del corte ve el ciclo siguiente.** Alguien que entra
 *    el miércoles no puede pedir para este viernes; su corte es el martes que
 *    viene y su entrega el viernes de después.
 * 2. **El día de llegada puede caer antes que el de corte en la semana.** Corte
 *    el viernes y llegada el martes es un ciclo legítimo — cruza el domingo.
 * 3. **Todo se mide en la hora del mostrador**, no en la del servidor. Una
 *    función en Vercel corre en UTC, y «antes del martes a las 6» significa las
 *    6 de Monterrey.
 *
 * Separado del servicio por la misma razón que `state-machine.ts`: esto decide
 * qué fecha se le promete a una persona, y una regla que sólo puede ejercitarse
 * escribiendo filas es una regla que nadie ejercita.
 */

/** La zona del mostrador. México suprimió el horario de verano en 2022, pero se
 *  calcula el desfase en lugar de fijarlo: una constante quemada es una bomba
 *  con retardo cada vez que un país cambia de opinión. */
export const SHOP_TIME_ZONE = 'America/Monterrey';

export type PreorderCycle = {
  /** 0 = domingo … 6 = sábado. */
  cutoffWeekday: number;
  /** Hora local del mostrador, 0–23. */
  cutoffHour: number;
  arrivalWeekday: number;
};

export type PreorderWindow = {
  /** Hasta cuándo se puede pedir para esta entrega. */
  orderBy: Date;
  /** Cuándo llega. */
  arrivesOn: Date;
};

const DAY_MS = 86_400_000;

export const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/**
 * Las partes de un instante, leídas en la zona del mostrador.
 *
 * `en-CA` porque formatea como `2026-08-30`, que es lo único que se puede
 * partir sin ambigüedad.
 */
function shopParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(instant);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  const weekdayName = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    weekdayName,
  );

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: weekday < 0 ? 0 : weekday,
  };
}

/**
 * El desfase de la zona respecto a UTC, en minutos, para un instante dado.
 *
 * Se deduce comparando la hora civil de la zona con la de UTC en vez de
 * consultarse en una tabla: así sigue siendo correcto si México reinstaura el
 * horario de verano o si el mostrador se muda de huso.
 */
function offsetMinutes(instant: Date, timeZone: string): number {
  const local = shopParts(instant, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );

  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/**
 * Convierte una fecha y hora *civiles del mostrador* al instante que le
 * corresponde.
 *
 * Se resuelve en dos pasos porque el desfase depende del instante y el instante
 * depende del desfase: se estima con el primer desfase y se corrige con el que
 * corresponde al resultado. Dos pasos bastan salvo en el salto de un cambio de
 * horario, que aquí no existe.
 */
function fromShopTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, 0, 0);
  const firstGuess = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);

  return new Date(naive - offsetMinutes(firstGuess, timeZone) * 60_000);
}

/** Cuántos días hay que avanzar desde `from` para llegar a `target`. */
function daysUntil(from: number, target: number): number {
  return (target - from + 7) % 7;
}

/**
 * El ciclo vigente para quien mira ahora mismo.
 *
 * Devuelve el corte que todavía se puede alcanzar y la entrega que le
 * corresponde. Si el corte de esta semana ya pasó —aunque sea por un minuto—
 * devuelve el de la semana siguiente: prometer una fecha que ya no se puede
 * cumplir es peor que dar una más lejana.
 */
export function nextPreorderWindow(
  cycle: PreorderCycle,
  now: Date = new Date(),
  timeZone: string = SHOP_TIME_ZONE,
): PreorderWindow {
  const local = shopParts(now, timeZone);

  let daysToCutoff = daysUntil(local.weekday, cycle.cutoffWeekday);

  // Hoy es el día del corte: sólo sirve si la hora todavía no llegó.
  if (daysToCutoff === 0 && local.hour >= cycle.cutoffHour) {
    daysToCutoff = 7;
  }

  const cutoffDay = new Date(
    Date.UTC(local.year, local.month - 1, local.day) + daysToCutoff * DAY_MS,
  );

  const orderBy = fromShopTime(
    cutoffDay.getUTCFullYear(),
    cutoffDay.getUTCMonth() + 1,
    cutoffDay.getUTCDate(),
    cycle.cutoffHour,
    timeZone,
  );

  /*
   * La llegada se cuenta desde el corte, no desde hoy.
   *
   * Y cuando cae en el mismo día de la semana que el corte, se entiende como la
   * semana siguiente: «pide el martes, llega el martes» es un ciclo de siete
   * días, no de cero — nadie promete entregar en el mismo instante del corte.
   */
  const daysToArrival =
    daysUntil(cycle.cutoffWeekday, cycle.arrivalWeekday) || 7;

  const arrivalDay = new Date(cutoffDay.getTime() + daysToArrival * DAY_MS);

  const arrivesOn = fromShopTime(
    arrivalDay.getUTCFullYear(),
    arrivalDay.getUTCMonth() + 1,
    arrivalDay.getUTCDate(),
    // Mediodía y no medianoche: la fecha es lo que importa, y las 00:00 de una
    // zona se convierten en el día anterior en cuanto alguien las formatea en
    // otra. El mediodía sobrevive a cualquier redondeo.
    12,
    timeZone,
  );

  return { orderBy, arrivesOn };
}

/** Cuánto falta para el corte, en horas. Negativo no ocurre: siempre es futuro. */
export function hoursUntilCutoff(window: PreorderWindow, now: Date = new Date()): number {
  return Math.max(0, Math.floor((window.orderBy.getTime() - now.getTime()) / 3_600_000));
}

/**
 * La promesa, dicha como la diría el mostrador.
 *
 * Una sola frase, con los dos datos que importan y en el orden en que se
 * piensan: hasta cuándo puedo pedir, y cuándo lo tengo.
 */
export function describePreorder(
  window: PreorderWindow,
  timeZone: string = SHOP_TIME_ZONE,
): string {
  const day = (d: Date) =>
    new Intl.DateTimeFormat('es-MX', {
      timeZone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);

  const hour = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: 'numeric',
    hour12: true,
  }).format(window.orderBy);

  return `Pídelo antes del ${day(window.orderBy)} a las ${hour} y llega el ${day(window.arrivesOn)}.`;
}

/** La versión corta, para una tarjeta del catálogo. */
export function shortPreorderLabel(
  window: PreorderWindow,
  timeZone: string = SHOP_TIME_ZONE,
): string {
  const weekday = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    weekday: 'long',
  }).format(window.arrivesOn);

  return `Llega el ${weekday}`;
}
