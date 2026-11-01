import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PantryAPI } from '../lib/api';
import type { PantryItem } from '../types';

const KEY = ['pantry'] as const;
const SHOPPING_KEY = ['shopping'] as const;

export function usePantry() {
  return useQuery({ queryKey: KEY, queryFn: PantryAPI.list });
}

export function useCreatePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PantryAPI.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: SHOPPING_KEY });
    },
  });
}

export function useUpdatePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PantryItem> }) =>
      PantryAPI.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<PantryItem[]>(KEY);
      qc.setQueryData<PantryItem[]>(KEY, (curr) =>
        curr?.map((i) => (i.id === id ? { ...i, ...body } : i)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: SHOPPING_KEY });
    },
  });
}

export function useDeletePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PantryAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useConsumePantryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      PantryAPI.consume(id, amount),
    onMutate: async ({ id, amount }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<PantryItem[]>(KEY);
      qc.setQueryData<PantryItem[]>(KEY, (curr) =>
        curr?.map((i) =>
          i.id === id
            ? { ...i, current_quantity: Math.max(0, Number(i.current_quantity) - amount) }
            : i,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: SHOPPING_KEY });
    },
  });
}
