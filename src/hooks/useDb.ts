import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '../services/db';
import type { Subscriber, Profile } from '../types/db';

// --- Subscribers ---

export function useSubscribers() {
  return useQuery({
    queryKey: ['subscribers'],
    queryFn: db.listSubscribers,
  });
}

export function useSubscriber(imsi: string) {
  return useQuery({
    queryKey: ['subscriber', imsi],
    queryFn: () => db.getSubscriber(imsi),
    enabled: !!imsi,
  });
}

export function useCreateSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: db.createSubscriber,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  });
}

export function useUpdateSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ imsi, data }: { imsi: string; data: Partial<Subscriber> }) =>
      db.updateSubscriber(imsi, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  });
}

export function useDeleteSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: db.deleteSubscriber,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  });
}

// --- Profiles ---

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: db.listProfiles,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: db.createProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Profile> }) =>
      db.updateProfile(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: db.deleteProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

// --- Accounts ---

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: db.listAccounts,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password, roles }: { username: string; password: string; roles: string[] }) =>
      db.createAccount(username, password, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, data }: { username: string; data: { roles?: string[]; password?: string } }) =>
      db.updateAccount(username, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: db.deleteAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
