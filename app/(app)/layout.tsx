import { AppTopbar } from "@/components/app-topbar";
import { Toaster } from "@/components/ui/sonner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppTopbar />
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

