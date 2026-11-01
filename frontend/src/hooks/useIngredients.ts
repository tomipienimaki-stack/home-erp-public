import { useQuery } from '@tanstack/react-query';
import { IngredientsAPI } from '../lib/api';

const KEY = ['ingredients'] as const;

export function useIngredients() {
  return useQuery({ queryKey: KEY, queryFn: () => IngredientsAPI.list() });
}
