/** Registro compartido de actores móviles (para que montacargas y personas se vean entre sí). Coordenadas de mundo. */
export interface Actor {
  x: number;
  z: number;
  /** dirección de avance (unitaria) */
  hx: number;
  hz: number;
  speed: number;
  kind: 'person' | 'forklift';
}

export const actors = new Map<string, Actor>();

if (import.meta.env.DEV) (window as unknown as { __actors: typeof actors }).__actors = actors;
