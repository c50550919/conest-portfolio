'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';

interface OrgSettings {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  plan_tier: string;
}

interface TeamMember {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

const roleColors: Record<string, string> = {
  org_admin: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300',
  program_director: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300',
  case_manager: 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-300',
  super_admin: 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300',
};

const DEFAULT_WEIGHTS = {
  location: 25,
  budget: 25,
  householdSize: 20,
  languageCultural: 15,
  accessibility: 10,
  servicesProximity: 5,
};

const WEIGHT_LABELS: Record<string, string> = {
  location: 'Location',
  budget: 'Budget',
  householdSize: 'Household Size',
  languageCultural: 'Language/Cultural',
  accessibility: 'Accessibility',
  servicesProximity: 'Services Proximity',
};

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const [settingsRes, membersRes] = await Promise.all([
          api.get(`/orgs/${orgSlug}/settings`),
          api.get(`/orgs/${orgSlug}/members`),
        ]);
        setSettings(settingsRes.data.data);
        setMembers(membersRes.data.data || []);
      } catch {
        // Fallback demo data
        setSettings({
          name: 'Charlotte Housing Partners',
          email: 'admin@chp-demo.org',
          phone: '704-555-0100',
          address: '400 S Tryon St',
          city: 'Charlotte',
          state: 'NC',
          zip: '28202',
          plan_tier: 'professional',
        });
        setMembers([
          {
            id: '1',
            email: 'sarah.chen@chp-demo.org',
            first_name: 'Sarah',
            last_name: 'Chen',
            role: 'org_admin',
          },
          {
            id: '2',
            email: 'marcus.johnson@chp-demo.org',
            first_name: 'Marcus',
            last_name: 'Johnson',
            role: 'program_director',
          },
          {
            id: '3',
            email: 'ana.rivera@chp-demo.org',
            first_name: 'Ana',
            last_name: 'Rivera',
            role: 'case_manager',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [orgSlug]);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="matching">Matching Weights</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Organization Profile</CardTitle>
                <Badge variant="secondary">{settings.plan_tier}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={settings.name} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={settings.email || ''} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={settings.phone || ''} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={settings.address || ''} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={settings.city || ''} readOnly />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={settings.state || ''} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input value={settings.zip || ''} readOnly />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={roleColors[member.role] || ''}
                        >
                          {member.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Matching Algorithm Weights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{WEIGHT_LABELS[key]}</Label>
                    <span className="text-sm font-medium">{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={value}
                    onChange={(e) =>
                      setWeights((prev) => ({
                        ...prev,
                        [key]: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Total:{' '}
                  {Object.values(weights).reduce((sum, v) => sum + v, 0)}%
                </span>
                <Button
                  variant="outline"
                  onClick={() => setWeights(DEFAULT_WEIGHTS)}
                >
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
