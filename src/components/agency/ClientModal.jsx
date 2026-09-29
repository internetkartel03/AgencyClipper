import { useEffect, useState } from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { analyzeChannel, analysisToClient, isApiConfigurationError } from '@/lib/channel-analysis';
import { money } from '@/lib/agency-data';
import { isYouTubeChannelUrl } from '@/lib/video-rules';

const initial = { name: '', channelUrl: '', planType: 'TEAM_ONLY', monthlyFee: 5000, customPlanLabel: '', setupFee: 30000, startDate: '', status: 'ACTIVE', notes: '' };
const planDefaults = { TEAM_ONLY: 5000, PERSONAL_INVOLVED: 10000 };

export default function ClientModal({ open, onOpenChange, client, onSave }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ ...initial, ...client }); setError(''); setApiMissing(false); } }, [open, client]);
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const choosePlan = planType => setForm(current => ({ ...current, planType, monthlyFee: planDefaults[planType] ?? current.monthlyFee }));
  const stepFee = direction => set('monthlyFee', Math.min(20000, Math.max(1000, (Number(form.monthlyFee) || 1000) + direction * 1000)));
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!isYouTubeChannelUrl(form.channelUrl)) { setError('Enter a valid YouTube channel URL.'); return; }
    setBusy(true); let analysis = {};
    try {
      if (!client && form.channelUrl) {
        try { analysis = analysisToClient(await analyzeChannel(form.channelUrl)); }
        catch (err) { if (isApiConfigurationError(err)) setApiMissing(true); else setError('Channel analysis failed, but you can still save the client manually.'); }
      }
      await onSave({ ...form, ...analysis, name: analysis.name || form.name || 'New client', monthlyFee: Number(form.monthlyFee), setupFee: Number(form.setupFee) });
      onOpenChange(false);
    } catch (err) { setError(err?.message || 'Could not save this client.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="agency-modal max-h-[90vh] max-w-2xl overflow-y-auto">
    <DialogHeader className=""><DialogTitle className="">{client ? 'Edit client' : 'Add client'}</DialogTitle><DialogDescription className="">{client ? 'Update client and plan details.' : 'Paste a channel URL and configure the plan. AI will fill in the strategy profile.'}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="mt-2 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2"><label className="agency-field sm:col-span-2"><span>YouTube channel URL</span><input type="url" value={form.channelUrl} onChange={e => set('channelUrl', e.target.value)} placeholder="https://youtube.com/@channel" required /></label>
        <label className="agency-field"><span>Client / channel name</span><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Auto-filled by analysis" /></label>
        <label className="agency-field"><span>Start date</span><input type="date" value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} /></label></div>
      <fieldset><legend className="mb-3 text-sm font-medium text-agency-primary">Plan type</legend><div className="grid gap-2 sm:grid-cols-3">{['TEAM_ONLY','PERSONAL_INVOLVED','CUSTOM'].map(plan => <button type="button" key={plan} onClick={() => choosePlan(plan)} className={`agency-plan-option ${form.planType === plan ? 'is-active' : ''}`}><span>{plan === 'TEAM_ONLY' ? 'Team only' : plan === 'PERSONAL_INVOLVED' ? 'Personal involved' : 'Custom'}</span>{plan !== 'CUSTOM' && <small>{money(planDefaults[plan])}/mo</small>}</button>)}</div></fieldset>
      {form.planType === 'CUSTOM' && <div className="grid gap-4 sm:grid-cols-[210px_1fr]"><div><span className="mb-2 block text-sm text-agency-muted">Monthly fee</span><div className="agency-stepper"><button type="button" onClick={() => stepFee(-1)} aria-label="Decrease monthly fee"><Minus /></button><strong>{money(form.monthlyFee)}</strong><button type="button" onClick={() => stepFee(1)} aria-label="Increase monthly fee"><Plus /></button></div></div><label className="agency-field"><span>Custom plan label</span><input value={form.customPlanLabel || ''} onChange={e => set('customPlanLabel', e.target.value)} placeholder="$3000 — ideation and channel management" /></label></div>}
      {form.planType !== 'CUSTOM' && <label className="agency-field"><span>Monthly fee</span><input type="number" min="0" step="100" value={form.monthlyFee} onChange={e => set('monthlyFee', e.target.value)} /></label>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="agency-field"><span>Setup fee</span><input type="number" min="0" step="100" value={form.setupFee} onChange={e => set('setupFee', e.target.value)} /></label><label className="agency-field"><span>Status</span><select value={form.status} onChange={e => set('status', e.target.value)}><option value="ACTIVE">Active</option><option value="CHURNED">Churned</option></select></label></div>
      <label className="agency-field"><span>Notes</span><textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></label>
      {apiMissing && <div className="rounded-xl border border-orange-400/20 bg-orange-400/10 p-3 text-sm text-orange-300">AI analysis is not configured yet. The client will still be saved and can be analyzed later.</div>}{error && <p className="text-sm text-[#FF453A]">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" className="agency-button-secondary" onClick={() => onOpenChange(false)}>Cancel</button><button disabled={busy} className="agency-button-primary">{busy ? <><span className="agency-spinner" /> {client ? 'Saving…' : 'Analyzing…'}</> : <><Sparkles className="h-4 w-4" />{client ? 'Save changes' : 'Analyze & add'}</>}</button></div>
    </form>
  </DialogContent></Dialog>;
}
