'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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
        <span className="text-sm text-muted-foreground">
          {filtered.length} clients
        </span>
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
                    {client.first_name} {client.last_name}
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
