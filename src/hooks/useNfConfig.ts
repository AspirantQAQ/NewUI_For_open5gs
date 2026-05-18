import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as configService from '../services/config';

export function useSyncStatus() {
  return useQuery({
    queryKey: ['syncStatus'],
    queryFn: configService.getSyncStatus,
    refetchInterval: 30000,
  });
}

export function useNfConfig(nfType: string) {
  return useQuery({
    queryKey: ['nfConfig', nfType],
    queryFn: () => configService.getNfConfig(nfType),
    enabled: !!nfType,
  });
}

export function useUpdateNfConfig(nfType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, unknown>) => configService.updateNfConfig(nfType, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfConfig', nfType] });
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
    },
  });
}

export function useSyncNf(nfType: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => configService.syncNfConfig(nfType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['nfConfig', nfType] });
    },
  });
}

export function useSyncAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: configService.syncAllNfConfigs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
    },
  });
}
