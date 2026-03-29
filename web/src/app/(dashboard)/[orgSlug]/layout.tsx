import { Sidebar } from '@/components/sidebar';
import { DemoBanner } from '@/components/demo-banner';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // In demo, org name is hardcoded. In MVP, fetch from API.
  const orgName = 'Charlotte Housing Partners';

  return (
    <div className="flex h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar orgSlug={orgSlug} orgName={orgName} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
