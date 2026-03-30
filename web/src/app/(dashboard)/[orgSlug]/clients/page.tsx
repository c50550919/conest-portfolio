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
import { Search, Plus } from 'lucide-react';
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
}

const statusColors: Record<string, string> = {
  intake: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  placed: 'bg-green-100 text-green-800',
  exited: 'bg-gray-100 text-gray-800',
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
        // API not ready yet — will work after Task 4.1
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
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${orgSlug}/clients/${client.id}`}
                      className="hover:underline text-primary"
                    >
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
    </div>
  );
}
