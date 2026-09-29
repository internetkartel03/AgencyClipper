import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, ExternalLink, Plus, Search, Trash2, UsersRound } from 'lucide-react';
import ClientModal from '@/components/agency/ClientModal';
import { ErrorState, LoadingState, PageHeader } from '@/components/agency/AgencyUI';
import { agencyKeys, labelize, money, useClients, useEntityMutation, useProgress } from '@/lib/agency-data';
import { base44 } from '@/api/base44Client';

const stageClass = stage => ({ PUBLISHED: 'green', IN_REVIEW: 'orange', UPLOADING: 'blue', FILMING: 'purple' }[stage] || 'neutral');

export default function Clients() {
  const clients = useClients(); const progress = useProgress();
  const mutation = useEntityMutation('Client', agencyKeys.clients);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('ACTIVE'); const [editMode, setEditMode] = useState(false);
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState(null);
  const latestStage = useMemo(() => Object.fromEntries((progress.data || []).sort((a,b) => new Date(a.updatedAt || a.updated_date).getTime() - new Date(b.updatedAt || b.updated_date).getTime()).map(item => [item.client, item.stage])), [progress.data]);
  const filtered = useMemo(() => (clients.data || []).filter(client => (status === 'ALL' || client.status === status) && `${client.name} ${client.planType}`.toLowerCase().includes(search.toLowerCase())), [clients.data, search, status]);
  const save = data => mutation.mutateAsync({ action: editing ? 'update' : 'create', id: editing?.id, data });
  const remove = async client => {
    const related = await Promise.all(['Payment','TeamMember','ClientProgress','AnalyticsSnapshot'].map(entity => base44.entities[entity].filter({ client:client.id }, '-created_date', 1)));
    if (related.some(records => records.length)) { window.alert(`${client.name} has related history and cannot be deleted safely. Keep the client churned to preserve financial and production records.`); return; }
    if (window.confirm(`Permanently delete ${client.name}? This cannot be undone.`)) mutation.mutate({ action: 'delete', id: client.id });
  };
  if (clients.isLoading || progress.isLoading) return <LoadingState />;
  if (clients.isError) return <ErrorState />;
  return <section className="agency-enter"><PageHeader title="Clients" description={`${clients.data?.filter(c => c.status === 'ACTIVE').length || 0} active clients · ${money((clients.data || []).filter(c => c.status === 'ACTIVE').reduce((sum,c) => sum + (Number(c.monthlyFee) || 0), 0))} MRR`} actions={<><button className="agency-button-secondary" onClick={() => setEditMode(v => !v)}><Edit3 className="h-4 w-4" />{editMode ? 'Done editing' : 'Edit'}</button><button className="agency-button-primary" onClick={() => { setEditing(null); setModal(true); }}><Plus className="h-4 w-4" />Add client</button></>} />
    <div className="agency-glass mb-5 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row"><label className="agency-search flex-1"><Search /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients or plans…" /></label><select className="agency-filter" value={status} onChange={e => setStatus(e.target.value)}><option value="ACTIVE">Active clients</option><option value="CHURNED">Churned clients</option><option value="ALL">All clients</option></select></div>
    {filtered.length === 0 ? <div className="agency-glass flex min-h-72 flex-col items-center justify-center rounded-2xl text-center"><UsersRound className="mb-4 h-9 w-9 text-[#64D2FF]"/><h2 className="text-lg font-semibold text-agency-primary">{clients.data?.length ? 'No matching clients' : 'Your client roster starts here'}</h2><p className="mt-2 text-sm text-agency-muted">{clients.data?.length ? 'Try a different search or filter.' : 'Add a YouTube channel to create its strategy profile.'}</p></div> : <div className="grid gap-4">{filtered.map(client => { const stage = latestStage[client.id] || 'WAITING_FOR_FOOTAGE'; return <div key={client.id} className="agency-glass group grid items-center gap-4 rounded-2xl p-4 sm:grid-cols-[minmax(240px,1fr)_180px_210px_140px_auto]">
      <Link to={`/clients/${client.id}`} className="flex min-w-0 items-center gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5">{client.channelThumbnail ? <img src={client.channelThumbnail} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center font-semibold text-[#64D2FF]">{client.name?.[0]}</div>}</div><div className="min-w-0"><p className="truncate font-semibold text-agency-primary">{client.name}</p><p className="mt-1 flex items-center gap-1 text-xs text-agency-muted">View channel profile <ExternalLink className="h-3 w-3"/></p></div></Link>
      <div><p className="agency-mobile-label">Plan</p><p className="text-sm text-agency-primary">{client.planType === 'CUSTOM' ? client.customPlanLabel || 'Custom' : labelize(client.planType)}</p></div>
      <div><p className="agency-mobile-label">Production</p><span className={`agency-status ${stageClass(stage)}`}>{labelize(stage)}</span></div>
      <div><p className="agency-mobile-label">MRR contribution</p><p className="font-semibold tabular-nums text-agency-primary">{money(client.monthlyFee)}<span className="font-normal text-agency-muted">/mo</span></p></div>
      <div className={`flex justify-end gap-1 transition ${editMode ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'}`}><button className="agency-icon-button h-9 w-9 rounded-lg" onClick={() => { setEditing(client); setModal(true); }} aria-label={`Edit ${client.name}`}><Edit3 className="m-auto h-4 w-4"/></button>{client.status === 'CHURNED' && <button className="agency-icon-button h-9 w-9 rounded-lg text-[#FF453A]" onClick={() => remove(client)} aria-label={`Delete ${client.name}`}><Trash2 className="m-auto h-4 w-4"/></button>}</div>
    </div>; })}</div>}
    <ClientModal open={modal} onOpenChange={setModal} client={editing} onSave={save}/>
  </section>;
}
