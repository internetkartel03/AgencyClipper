import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const agencyKeys = {
  clients: ['agency', 'clients'],
  progress: ['agency', 'progress'],
  payments: ['agency', 'payments'],
  team: ['agency', 'team'],
  analytics: ['agency', 'analytics'],
  leads: ['agency', 'leads'],
  objectives: ['agency', 'objectives'],
  knowledge: ['agency', 'knowledge'],
  thumbnailSessions: ['agency', 'thumbnail-sessions'],
  thumbnailMessages: ['agency', 'thumbnail-messages'],
};

const list = entity => async () => base44.entities[entity].list('-created_date', 500);

export const useClients = () => useQuery({ queryKey: agencyKeys.clients, queryFn: list('Client') });
export const useProgress = () => useQuery({ queryKey: agencyKeys.progress, queryFn: list('ClientProgress') });
export const usePayments = (options = {}) => useQuery({ queryKey: agencyKeys.payments, queryFn: list('Payment'), ...options });
export const useTeam = () => useQuery({ queryKey: agencyKeys.team, queryFn: list('TeamMember') });
export const useAnalytics = () => useQuery({ queryKey: agencyKeys.analytics, queryFn: list('AnalyticsSnapshot') });
export const useLeads = () => useQuery({ queryKey: agencyKeys.leads, queryFn: list('Lead') });
export const useObjectives = () => useQuery({ queryKey: agencyKeys.objectives, queryFn: list('DailyObjective') });
export const useKnowledge = () => useQuery({ queryKey: agencyKeys.knowledge, queryFn: list('KnowledgeEntry') });
export const useThumbnailSessions = () => useQuery({ queryKey: agencyKeys.thumbnailSessions, queryFn: list('ThumbnailSession') });
export const useThumbnailMessages = () => useQuery({ queryKey: agencyKeys.thumbnailMessages, queryFn: list('ThumbnailMessage') });

export function useEntityMutation(entity, key) {
  const queryClient = useQueryClient();
  return useMutation({
    /** @param {{action: 'create'|'update'|'delete', id?: string, data?: Record<string, any>}} variables */
    mutationFn: ({ action, id, data }) => {
      if (action === 'create') return base44.entities[entity].create(data);
      if (action === 'delete') return base44.entities[entity].delete(id);
      return base44.entities[entity].update(id, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export const money = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(Number(value) || 0);

export const shortDate = value => value
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
  : '—';

export const labelize = value => (value || '').toLowerCase().split('_').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ');

export function parseJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}
