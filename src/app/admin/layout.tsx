import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { AdminSessionProvider } from "@/components/admin/admin-session-provider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminSessionProvider>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminSessionProvider>
  );
}
