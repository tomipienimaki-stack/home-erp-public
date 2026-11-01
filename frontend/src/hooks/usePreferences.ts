import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PreferencesAPI } from '../lib/api';

const KEY = ['preferences'] as const;

export function usePreferences() {
  return useQuery({ queryKey: KEY, queryFn: PreferencesAPI.list });
}

export function useCreatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: PreferencesAPI.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PreferencesAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
