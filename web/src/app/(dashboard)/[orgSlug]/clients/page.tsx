'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { ClientAvatar } from '@/components/client-avatar';
import { ClientDrawer } from '@/components/client-drawer';
import api from '@/lib/api';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  status: 'intake' | 'ready' | 'placed' | 'exited';
  language_primary: string | null;
  household_size: number;
  budget_max: number | null;
  intake_date: string | null;
  case_manager_first_name?: string;
  case_manager_last_name?: string;
  photo_url?: string | null;
}

const statusColors: Record<string, string> = {
  intake: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-300',
  ready: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300',
  placed: 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300',
  exited: 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-300',
};

export default function ClientsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    household_size: 1,
    language_primary: 'English',
    budget_max: '',
    preferred_area: '',
    phone: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/orgs/${orgSlug}/clients`, {
        ...newClient,
        budget_max: newClient.budget_max ? parseInt(newClient.budget_max, 10) : null,
        status: 'intake',
        intake_date: new Date().toISOString().slice(0, 10),
      });
      setShowAdd(false);
      setNewClient({ first_name: '', last_name: '', household_size: 1, language_primary: 'English', budget_max: '', preferred_area: '', phone: '', email: '' });
      const { data } = await api.get(`/orgs/${orgSlug}/clients`);
      setClients(data.data);
    } catch {
      alert('Failed to create client.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function fetchClients() {
      try {
        const { data } = await api.get(`/orgs/${orgSlug}/clients`);
        setClients(data.data || []);
      } catch {
        setClients([]);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [orgSlug]);

  const filtered = clients.filter((c) => {
    const matchesSearch =
      !search ||
      `${c.first_name} ${c.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await api.post(`/orgs/${orgSlug}/clients/bulk-delete`, { ids: Array.from(selected) });
      setClients((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
      setShowBulkDelete(false);
    } catch {
      alert('Failed to delete clients.');
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Client Roster</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {filtered.length} clients
          </span>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New Client Intake</DialogTitle>
                <DialogDescription>
                  Enter the client&apos;s basic information to start the placement process.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" required value={newClient.first_name} onChange={(e) => setNewClient((p) => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" required value={newClient.last_name} onChange={(e) => setNewClient((p) => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="household_size">Household Size</Label>
                    <Input id="household_size" type="number" min={1} required value={newClient.household_size} onChange={(e) => setNewClient((p) => ({ ...p, household_size: parseInt(e.target.value, 10) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Primary Language</Label>
                    <Input id="language" value={newClient.language_primary} onChange={(e) => setNewClient((p) => ({ ...p, language_primary: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Monthly Budget ($)</Label>
                    <Input id="budget" type="number" min={0} placeholder="1200" value={newClient.budget_max} onChange={(e) => setNewClient((p) => ({ ...p, budget_max: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Preferred Area</Label>
                    <Input id="area" placeholder="e.g., NoDa, Plaza Midwood" value={newClient.preferred_area} onChange={(e) => setNewClient((p) => ({ ...p, preferred_area: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" type="tel" value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Client'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="intake">Intake</option>
          <option value="ready">Ready</option>
          <option value="placed">Placed</option>
          <option value="exited">Exited</option>
        </select>

        {/* Bulk actions */}
        {someSelected && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <button onClick={toggleSelectAll} className="p-1 hover:text-primary transition-colors">
                  {allFilteredSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : someSelected ? (
                    <MinusSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Household</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Case Manager</TableHead>
              <TableHead>Intake Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow key={client.id} className={`cursor-pointer ${selected.has(client.id) ? 'bg-primary/5' : ''}`} onClick={() => setDrawerClientId(client.id)}>
                  <TableCell>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(client.id); }} className="p-1 hover:text-primary transition-colors">
                      {selected.has(client.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${orgSlug}/clients/${client.id}`}
                      className="hover:underline text-primary flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ClientAvatar
                        clientId={client.id}
                        orgSlug={orgSlug}
                        firstName={client.first_name}
                        lastName={client.last_name}
                        photoUrl={client.photo_url}
                        size="sm"
                      />
                      {client.first_name} {client.last_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[client.status]}
                    >
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.language_primary || '—'}</TableCell>
                  <TableCell>{client.household_size}</TableCell>
                  <TableCell>
                    {client.budget_max
                      ? `$${client.budget_max.toLocaleString()}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {client.case_manager_first_name
                      ? `${client.case_manager_first_name} ${client.case_manager_last_name || ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {client.intake_date
                      ? new Date(client.intake_date).toLocaleDateString()
                      : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Client quick-preview drawer */}
      <ClientDrawer
        clientId={drawerClientId}
        orgSlug={orgSlug}
        onClose={() => setDrawerClientId(null)}
      />

      {/* Bulk delete confirmation dialog */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selected.size} Client{selected.size !== 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription>
              This will permanently delete the selected client{selected.size !== 1 ? 's' : ''}. Placement records will remain in the system. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? 'Deleting...' : `Delete ${selected.size} Client${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
