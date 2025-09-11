import './globals.css';
import NavBar from '@/components/NavBar';
import { SidebarProvider } from '@/components/SidebarProvider';
import { ClientSessionProvider } from '@/lib/imports';

export const metadata = {
  title: 'Ethiopian Orthodox Sunday School',
  description: 'Attendance management for Sunday School',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen">
        <ClientSessionProvider>
          <SidebarProvider>
            <div className="flex flex-col min-h-screen">
              <NavBar />
              <main className="container-responsive flex-1 px-0 mx-auto max-w-full
                sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-7xl mt-4">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </ClientSessionProvider>
      </body>
    </html>
  );
}