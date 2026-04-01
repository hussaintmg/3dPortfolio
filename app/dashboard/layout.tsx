import DashboardLayout from "../../Components/layouts/DashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  // We use this layout for the `/dashboard` route group so it automatically wraps
  // the page and any nested routes.
  return (
    <div className="bg-background text-foreground antialiased min-h-screen">
       <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
}
