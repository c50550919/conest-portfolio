'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { login, getMyOrgs } from '@/lib/auth';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const orgs = await getMyOrgs();
        if (orgs.length === 1) {
          router.push(`/${orgs[0].orgSlug}`);
        } else if (orgs.length > 1) {
          router.push('/select-org');
        } else {
          setError('No organization membership found.');
        }
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/8 rounded-full blur-[128px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="relative w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/placd-mark.png"
            alt="Placd"
            width={160}
            height={52}
            className="h-12 w-auto"
            priority
          />
        </div>

        <Card className="bg-white/[0.04] backdrop-blur-xl border-white/[0.08] shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-semibold text-white">
              Welcome back
            </CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to your housing placement dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/[0.06] border-white/[0.1] text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-medium rounded-lg h-11 transition-all shadow-lg shadow-blue-500/20"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500 text-center">
                Demo: sarah.chen@chp-demo.org / Demo1234!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
