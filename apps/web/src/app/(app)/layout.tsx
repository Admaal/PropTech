import { AppHeader } from "@/components/app-header";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { requireAuth } from "@/lib/auth-server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { supabase } = await requireAuth();
  const showAdminLink = await isPlatformAdmin(supabase);

  return (
    <div className="min-h-screen">
      <AppHeader showAdminLink={showAdminLink} />
      <main className="mx-auto max-w-300 px-6 py-10">{children}</main>
    </div>
  );
}
