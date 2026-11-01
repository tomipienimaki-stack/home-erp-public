import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MealPlanAPI } from '../lib/api';

const KEY = ['meal-plan'] as const;
const PANTRY_KEY = ['pantry'] as const;
const SHOPPING_KEY = ['shopping'] as const;

export function useCurrentMealPlan() {
  return useQuery({
    queryKey: [...KEY, 'current'],
    queryFn: MealPlanAPI.current,
  });
}

/** Tietyn viikon suunnitelma; ilman viikkoa oletusviikko. */
export function useMealPlanWeek(weekStart: string | null) {
  return useQuery({
    queryKey: [...KEY, weekStart ?? 'current'],
    queryFn: () => (weekStart ? MealPlanAPI.byWeek(weekStart) : MealPlanAPI.current()),
  });
}

export function useGenerateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: Parameters<typeof MealPlanAPI.generate>[0]) =>
      MealPlanAPI.generate(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAddEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      MealPlanAPI.addEntry(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entryId, body }: { id: string; entryId: string; body: any }) =>
      MealPlanAPI.updateEntry(id, entryId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entryId }: { id: string; entryId: string }) =>
      MealPlanAPI.deleteEntry(id, entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkCooked() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, entryId }: { id: string; entryId: string }) =>
      MealPlanAPI.markCooked(id, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: PANTRY_KEY });
      qc.invalidateQueries({ queryKey: SHOPPING_KEY });
    },
  });
}

export function useGenerateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MealPlanAPI.generateShoppingList(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHOPPING_KEY }),
  });
}

export function useBatchSuggestions(id: string | null) {
  return useQuery({
    queryKey: [...KEY, id, 'batch'],
    queryFn: () => MealPlanAPI.batchSuggestions(id!),
    enabled: !!id,
  });
}
