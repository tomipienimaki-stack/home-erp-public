import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsAPI } from '../lib/api';

const KEY = ['settings'] as const;

export function useSettings() {
  return useQuery({ queryKey: KEY, queryFn: SettingsAPI.get });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopping_weekdays: number[]) =>
      SettingsAPI.update({ shopping_weekdays }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['meal-plan'] });
    },
  });
}
