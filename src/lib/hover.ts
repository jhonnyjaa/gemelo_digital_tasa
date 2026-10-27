import { create } from 'zustand';

/** El hover vive aparte del store principal: cambia ~20 veces/s y no debe re-renderizar la interfaz. */
export const useHover = create<{ id: number | null; set: (id: number | null) => void }>((set) => ({
  id: null,
  set: (id) => set((s) => (s.id === id ? s : { id })),
}));
