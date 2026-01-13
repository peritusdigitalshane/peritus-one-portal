import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  BarChart3, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut,
  ArrowUpRight,
  Download,
  Zap,
  Calendar,
  ChevronRight
} from "lucide-react";

// Mock data - will be replaced with real data from Stripe/backend
const userService = {
  plan: "Professional",
  speed: "500 Mbps",
  status: "active",
  nextBilling: "Feb 15, 2026",
  monthlyPrice: 79,
  dataUsed: 245,
  dataTotal: "Unlimited",
};

const recentInvoices = [
  { id: "INV-001", date: "Jan 15, 2026", amount: 79, status: "paid" },
  { id: "INV-002", date: "Dec 15, 2025", amount: 79, status: "paid" },
  { id: "INV-003", date: "Nov 15, 2025", amount: 79, status: "paid" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r hidden lg:flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Wifi className="w-5 h-5 text-primary-foreground" />
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
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/dashboard/services" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <Wifi className="w-5 h-5" />
            My Services
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
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">Welcome back, John</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/support">Get Support</Link>
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
              JD
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl border p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-foreground">{userService.plan}</div>
              <div className="text-primary font-medium">{userService.speed}</div>
            </div>

            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Connection Status</span>
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-success" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="font-display text-2xl font-bold text-foreground capitalize">{userService.status}</span>
              </div>
              <div className="text-muted-foreground text-sm">All systems operational</div>
            </div>

            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Next Billing</span>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-foreground">{userService.nextBilling}</div>
              <div className="text-muted-foreground">${userService.monthlyPrice}/month</div>
            </div>

            <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Data Usage</span>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="font-display text-2xl font-bold text-foreground">{userService.dataUsed} GB</div>
              <div className="text-muted-foreground">{userService.dataTotal}</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Service Overview */}
            <div className="lg:col-span-2 bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Service Overview</h2>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/services">
                    Manage
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Active Subscription</div>
                    <div className="font-display text-2xl font-bold text-foreground mb-1">
                      {userService.plan} Plan
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-primary" />
                        {userService.speed}
                      </span>
                      <span>•</span>
                      <span>Unlimited Data</span>
                    </div>
                  </div>
                  <Button variant="hero" size="sm">
                    Upgrade Plan
                  </Button>
                </div>
              </div>

              {/* Usage Chart Placeholder */}
              <div className="h-48 bg-muted/50 rounded-xl flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Usage chart will appear here</p>
                </div>
              </div>
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

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "600ms" }}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span>Update Payment</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span>Upgrade Plan</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Download Invoice</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <span>Account Settings</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
