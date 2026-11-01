import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingAPI } from '../lib/api';
import type { ShoppingListItem } from '../types';

const KEY = ['shopping'] as const;
const PANTRY_KEY = ['pantry'] as const;

export function useShoppingList() {
  return useQuery({ queryKey: KEY, queryFn: ShoppingAPI.listPending });
}

export function useCreateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ShoppingAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ShoppingListItem> }) =>
      ShoppingAPI.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteShoppingItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ShoppingAPI.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<ShoppingListItem[]>(KEY);
      qc.setQueryData<ShoppingListItem[]>(KEY, (curr) => curr?.filter((i) => i.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkBought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity_bought }: { id: string; quantity_bought?: number }) =>
      ShoppingAPI.markBought(id, quantity_bought),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<ShoppingListItem[]>(KEY);
      qc.setQueryData<ShoppingListItem[]>(KEY, (curr) => curr?.filter((i) => i.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: PANTRY_KEY });
    },
  });
}

export function useClearBought() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ShoppingAPI.clearBought(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
