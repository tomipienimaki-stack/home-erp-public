import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FavoritesAPI } from '../lib/api';
import type { FavoriteProduct, ImportedFavoriteItem, StoreId } from '../types';

const KEY = ['favorites'] as const;
const SHOPPING_KEY = ['shopping'] as const;

export function useFavorites() {
  return useQuery({ queryKey: KEY, queryFn: FavoritesAPI.list });
}

export function useCreateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: FavoritesAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<FavoriteProduct> }) =>
      FavoritesAPI.update(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<FavoriteProduct[]>(KEY);
      qc.setQueryData<FavoriteProduct[]>(KEY, (curr) =>
        curr?.map((f) => (f.id === id ? { ...f, ...body } as FavoriteProduct : f)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => FavoritesAPI.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<FavoriteProduct[]>(KEY);
      qc.setQueryData<FavoriteProduct[]>(KEY, (curr) => curr?.filter((f) => f.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useImportFavoritesText() {
  return useMutation({
    mutationFn: ({ text, default_store }: { text: string; default_store?: StoreId }) =>
      FavoritesAPI.importText(text, default_store),
  });
}

export function useBulkInsertFavorites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ImportedFavoriteItem[]) => FavoritesAPI.bulkInsert(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddFavoriteToShopping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity?: number }) =>
      FavoritesAPI.addToShopping(id, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHOPPING_KEY }),
  });
}
