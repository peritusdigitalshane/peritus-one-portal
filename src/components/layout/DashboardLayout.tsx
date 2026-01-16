import { useState, ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutGrid,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  ShoppingBag,
  Package,
  Shield,
  Menu,
  X,
  Headphones,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
}

const baseNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { path: "/dashboard/services", label: "My Services", icon: Package },
  { path: "/dashboard/shop", label: "Shop", icon: ShoppingBag },
  { path: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { path: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { path: "/dashboard/settings", label: "Settings", icon: Settings },
];

export const DashboardLayout = ({
  children,
  title,
  subtitle,
  headerActions,
}: DashboardLayoutProps) => {
  const { user, signOut, isSuperAdmin, hasSupportAccess } = useAuth();
  
  // Build nav items dynamically based on user roles
  const navItems = [
    ...baseNavItems.slice(0, 3), // Dashboard, My Services, Shop
    ...(hasSupportAccess ? [{ path: "/dashboard/tickets", label: "Support Tickets", icon: Headphones }] : []),
    ...baseNavItems.slice(3), // Billing, Invoices, Settings
  ];
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - always visible on desktop, slide-in on mobile */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-card border-r flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Peritus ONE Logo" className="w-10 h-10" />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight text-foreground">
                Peritus ONE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Customer Portal
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          {isSuperAdmin && (
            <>
              <Link
                to="/super-admin/tickets"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <Headphones className="w-5 h-5" />
                Ticket Management
              </Link>
              <Link
                to="/super-admin"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="w-5 h-5" />
                Admin Portal
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {headerActions}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
              {userInitials}
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};
