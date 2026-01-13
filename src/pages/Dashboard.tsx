import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutGrid, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut,
  ArrowUpRight,
  Download,
  Calendar,
  ChevronRight,
  ShoppingBag,
  Package,
  Sparkles,
  Plus,
  Loader2,
  Shield
} from "lucide-react";

// Mock data - will be replaced with real data from Stripe/backend
const activeServices = [
  { 
    id: 1, 
    name: "Professional Web Hosting", 
    type: "Subscription",
    status: "active", 
    price: 29,
    nextBilling: "Feb 15, 2026",
    icon: "🌐"
  },
  { 
    id: 2, 
    name: "Business Email Suite", 
    type: "Subscription",
    status: "active", 
    price: 15,
    nextBilling: "Feb 15, 2026",
    icon: "📧"
  },
  { 
    id: 3, 
    name: "Cloud Storage Pro", 
    type: "Subscription",
    status: "active", 
    price: 19,
    nextBilling: "Feb 20, 2026",
    icon: "☁️"
  },
];

const recentPurchases = [
  { id: "ORD-001", item: "SSL Certificate", date: "Jan 10, 2026", amount: 99, type: "one-time" },
  { id: "ORD-002", item: "Domain Registration", date: "Jan 5, 2026", amount: 15, type: "annual" },
  { id: "ORD-003", item: "SEO Audit Report", date: "Dec 20, 2025", amount: 149, type: "one-time" },
];

const recentInvoices = [
  { id: "INV-001", date: "Jan 15, 2026", amount: 63, status: "paid" },
  { id: "INV-002", date: "Dec 15, 2025", amount: 63, status: "paid" },
  { id: "INV-003", date: "Nov 15, 2025", amount: 63, status: "paid" },
];

const Dashboard = () => {
  const { user, loading, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalMonthly = activeServices.reduce((sum, s) => sum + s.price, 0);
  const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r hidden lg:flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight text-foreground">
                Peritus ONE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Customer Portal
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium"
          >
            <LayoutGrid className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/dashboard/services" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <Package className="w-5 h-5" />
            My Services
          </Link>
          <Link 
            to="/dashboard/shop" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Shop
          </Link>
          <Link 
            to="/dashboard/billing" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Billing
          </Link>
          <Link 
            to="/dashboard/invoices" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <FileText className="w-5 h-5" />
            Invoices
          </Link>
          <Link 
            to="/dashboard/settings" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          {isSuperAdmin && (
            <Link 
              to="/super-admin" 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              <Shield className="w-5 h-5" />
              Admin Portal
            </Link>
          )}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {userName}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/support">Get Support</Link>
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm">
              {userInitials}
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Active Services</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="font-display text-3xl font-bold text-foreground">{activeServices.length}</div>
              <div className="text-muted-foreground text-sm">Subscriptions & products</div>
            </div>

            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Monthly Spend</span>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="font-display text-3xl font-bold text-foreground">${totalMonthly}</div>
              <div className="text-muted-foreground text-sm">Recurring total</div>
            </div>

            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Next Billing</span>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-success" />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-foreground">Feb 15</div>
              <div className="text-muted-foreground text-sm">In 32 days</div>
            </div>

            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Account Status</span>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-success" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="font-display text-2xl font-bold text-foreground">Active</span>
              </div>
              <div className="text-muted-foreground text-sm">All services running</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Active Services */}
            <div className="lg:col-span-2 bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Active Services</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/services">
                    View All
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-3">
                {activeServices.map((service) => (
                  <div 
                    key={service.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-2xl">
                        {service.icon}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{service.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service.type} • Next: {service.nextBilling}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-foreground">${service.price}/mo</div>
                        <div className="flex items-center gap-1 text-xs text-success">
                          <div className="w-1.5 h-1.5 rounded-full bg-success" />
                          Active
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Browse More Services
              </Button>
            </div>

            {/* Recent Invoices */}
            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Recent Invoices</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/invoices">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div>
                      <div className="font-medium text-foreground">{invoice.id}</div>
                      <div className="text-sm text-muted-foreground">{invoice.date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold text-foreground">${invoice.amount}</div>
                        <div className="text-xs text-success capitalize">{invoice.status}</div>
                      </div>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Purchases */}
          <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "600ms" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg font-semibold text-foreground">Recent Purchases</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/orders">
                  View All Orders
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {recentPurchases.map((purchase) => (
                <div 
                  key={purchase.id}
                  className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{purchase.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      {purchase.type}
                    </span>
                  </div>
                  <div className="font-medium text-foreground mb-1">{purchase.item}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{purchase.date}</span>
                    <span className="font-semibold text-foreground">${purchase.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "700ms" }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/dashboard/shop">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span>Browse Shop</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/dashboard/billing">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Payment Methods</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/dashboard/invoices">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Download Invoice</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/dashboard/settings">
                  <Settings className="w-5 h-5 text-primary" />
                  <span>Account Settings</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
