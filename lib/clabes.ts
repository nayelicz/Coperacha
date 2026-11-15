// CLABEs pre-autorizadas del evento para probar CoDi sin esperar el registro en Banxico.
export const CLABES_EVENTO = [
  { nombre: "Ramón Orraca", clabe: "012180015826225713" },
  { nombre: "Santiago Tena", clabe: "012180015913466252" },
  { nombre: "Adrian Soto", clabe: "014180606004536217" },
  { nombre: "Miriam Nava", clabe: "012180015355682429" },
  { nombre: "David Perez", clabe: "127180016558860385" },
] as const;

const PESOS = [3, 7, 1];

/** Valida el dígito verificador de una CLABE de 18 dígitos. */
export function clabeValida(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  // Las CLABEs del evento se aceptan tal cual (vienen de la hoja del hackatón).
  if (CLABES_EVENTO.some((c) => c.clabe === clabe)) return true;
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += ((Number(clabe[i]) * PESOS[i % 3]) % 10);
  const dv = (10 - (suma % 10)) % 10;
  return dv === Number(clabe[17]);
}

export function nombreDeClabe(clabe: string): string | undefined {
  return CLABES_EVENTO.find((c) => c.clabe === clabe)?.nombre;
}

export function clabeCorta(clabe: string): string {
  return `•••• ${clabe.slice(-4)}`;
}
