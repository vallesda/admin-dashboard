import { describe, expect, it } from 'vitest';

import {
  describePreorder,
  nextPreorderWindow,
  type PreorderCycle,
} from './preorder';

/** El ejemplo del negocio: pide antes del martes a las 6 pm, llega el viernes. */
const mejillones: PreorderCycle = {
  cutoffWeekday: 2, // martes
  cutoffHour: 18,
  arrivalWeekday: 5, // viernes
};

const TZ = 'America/Monterrey';

/** Un instante a partir de una hora civil de Monterrey (UTC−6, sin horario de verano). */
const enMonterrey = (iso: string) => new Date(`${iso}-06:00`);

/** El día de la semana de un instante, leído en Monterrey. */
const diaEn = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'short' }).format(d);

const fechaEn = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

describe('el ciclo del ejemplo: martes 6 pm → viernes', () => {
  it('un lunes ofrece el martes de esa misma semana', () => {
    // Lunes 31 de agosto de 2026.
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-08-31T10:00'), TZ);

    expect(diaEn(w.orderBy)).toBe('Tue');
    expect(fechaEn(w.orderBy)).toBe('2026-09-01');
    expect(diaEn(w.arrivesOn)).toBe('Fri');
    expect(fechaEn(w.arrivesOn)).toBe('2026-09-04');
  });

  it('el martes por la mañana todavía alcanza ese mismo corte', () => {
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-09-01T09:00'), TZ);

    expect(fechaEn(w.orderBy)).toBe('2026-09-01');
    expect(fechaEn(w.arrivesOn)).toBe('2026-09-04');
  });

  it('el martes a las 17:59 todavía alcanza', () => {
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-09-01T17:59'), TZ);
    expect(fechaEn(w.orderBy)).toBe('2026-09-01');
  });

  it('el martes a las 18:00 ya no: pasa al ciclo siguiente', () => {
    // Prometer una fecha que ya no se puede cumplir es peor que dar una más
    // lejana. Un minuto después del corte, el cliente ve el martes siguiente.
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-09-01T18:00'), TZ);

    expect(fechaEn(w.orderBy)).toBe('2026-09-08');
    expect(fechaEn(w.arrivesOn)).toBe('2026-09-11');
  });

  it('el miércoles ve el martes siguiente', () => {
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-09-02T08:00'), TZ);

    expect(fechaEn(w.orderBy)).toBe('2026-09-08');
    expect(fechaEn(w.arrivesOn)).toBe('2026-09-11');
  });

  it('el viernes —día de entrega del ciclo anterior— ya mira al siguiente', () => {
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-09-04T12:00'), TZ);
    expect(fechaEn(w.orderBy)).toBe('2026-09-08');
  });
});

describe('ciclos que cruzan el domingo', () => {
  it('corte el viernes y llegada el martes son cuatro días, no tres hacia atrás', () => {
    const cruzado: PreorderCycle = {
      cutoffWeekday: 5,
      cutoffHour: 12,
      arrivalWeekday: 2,
    };

    const w = nextPreorderWindow(cruzado, enMonterrey('2026-09-03T09:00'), TZ);

    expect(fechaEn(w.orderBy)).toBe('2026-09-04'); // viernes
    expect(fechaEn(w.arrivesOn)).toBe('2026-09-08'); // martes siguiente
    expect(w.arrivesOn.getTime()).toBeGreaterThan(w.orderBy.getTime());
  });

  it('la llegada nunca cae antes que el corte', () => {
    for (let cutoff = 0; cutoff < 7; cutoff++) {
      for (let arrival = 0; arrival < 7; arrival++) {
        const w = nextPreorderWindow(
          { cutoffWeekday: cutoff, cutoffHour: 12, arrivalWeekday: arrival },
          enMonterrey('2026-09-02T08:00'),
          TZ,
        );

        expect(
          w.arrivesOn.getTime() > w.orderBy.getTime(),
          `corte ${cutoff} → llegada ${arrival}`,
        ).toBe(true);
      }
    }
  });

  it('mismo día de corte y llegada significa la semana siguiente, no cero días', () => {
    const w = nextPreorderWindow(
      { cutoffWeekday: 2, cutoffHour: 18, arrivalWeekday: 2 },
      enMonterrey('2026-08-31T10:00'),
      TZ,
    );

    const dias = Math.round(
      (w.arrivesOn.getTime() - w.orderBy.getTime()) / 86_400_000,
    );

    expect(dias).toBeGreaterThanOrEqual(6);
    expect(dias).toBeLessThanOrEqual(8);
  });
});

describe('la hora es la del mostrador, no la del servidor', () => {
  it('las 23:30 UTC del lunes son todavía lunes en Monterrey', () => {
    // 23:30Z del lunes = 17:30 del lunes en Monterrey (UTC−6). El corte del
    // martes sigue por delante. Un servidor que razonara en UTC vería martes y
    // ofrecería el ciclo equivocado.
    const w = nextPreorderWindow(mejillones, new Date('2026-08-31T23:30:00Z'), TZ);

    expect(fechaEn(w.orderBy)).toBe('2026-09-01');
  });

  it('las 05:00 UTC del miércoles son todavía martes en Monterrey', () => {
    // 05:00Z del miércoles = 23:00 del martes en Monterrey, ya pasado el corte
    // de las 18:00 — así que toca el ciclo siguiente.
    const w = nextPreorderWindow(mejillones, new Date('2026-09-02T05:00:00Z'), TZ);

    expect(fechaEn(w.orderBy)).toBe('2026-09-08');
  });
});

describe('cómo se le cuenta al cliente', () => {
  it('dice hasta cuándo pedir y cuándo llega, en una frase', () => {
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-08-31T10:00'), TZ);
    const frase = describePreorder(w, TZ);

    expect(frase).toContain('martes');
    expect(frase).toContain('viernes');
    expect(frase).toMatch(/antes del/);
  });

  it('la fecha de llegada no se corre un día al formatearla', () => {
    // Se ancla al mediodía justamente por esto: las 00:00 de una zona se
    // convierten en el día anterior en cuanto alguien las formatea en otra.
    const w = nextPreorderWindow(mejillones, enMonterrey('2026-08-31T10:00'), TZ);

    expect(diaEn(w.arrivesOn)).toBe('Fri');
    expect(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', weekday: 'short' }).format(
        w.arrivesOn,
      ),
    ).toBe('Fri');
  });
});
