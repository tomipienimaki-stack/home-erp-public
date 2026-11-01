import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RecipesAPI } from '../lib/api';

const KEY = ['recipes'] as const;

export function useRecipes(filters?: { meal_type?: string; tag?: string }) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: () => RecipesAPI.list(filters),
  });
}

export function useRecipe(id: string | null) {
  return useQuery({
    queryKey: [...KEY, id, 'detail'],
    queryFn: () => RecipesAPI.get(id!),
    enabled: !!id,
  });
}

export function useRecipeAvailability(id: string | null) {
  return useQuery({
    queryKey: [...KEY, id, 'availability'],
    queryFn: () => RecipesAPI.availability(id!),
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: RecipesAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => RecipesAPI.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => RecipesAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
