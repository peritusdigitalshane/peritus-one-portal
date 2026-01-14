import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
import logo from "@/assets/logo.png";

interface Product {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  price: number;
  billing_type: string;
  category: string | null;
}

interface UserPurchase {
  id: string;
  product_id: string;
  status: string;
  price_paid: number;
  next_billing_date: string | null;
  purchased_at: string;
  product?: Product;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user, loading, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch user purchases with product details
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('user_purchases')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
      } else {
        setPurchases(purchasesData || []);
      }

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      } else {
        setInvoices(invoicesData || []);
      }

      setLoadingData(false);
    };

    if (user) {
      fetchData();
    }
  }, [user]);

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

  const activeServices = purchases.filter(p => p.status === 'active' && p.product?.billing_type !== 'one-time');
  const totalMonthly = activeServices.reduce((sum, p) => {
    if (p.product?.billing_type === 'monthly') return sum + Number(p.price_paid);
    if (p.product?.billing_type === 'annual') return sum + (Number(p.price_paid) / 12);
    return sum;
  }, 0);

  const nextBillingDate = purchases
    .filter(p => p.next_billing_date)
    .sort((a, b) => new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime())[0]?.next_billing_date;

  const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r hidden lg:flex flex-col">
        <div className="p-6">
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
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card rounded-2xl border p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Active Services</span>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="font-display text-3xl font-bold text-foreground">{purchases.length}</div>
                  <div className="text-muted-foreground text-sm">Subscriptions & products</div>
                </div>

                <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Monthly Spend</span>
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-accent" />
                    </div>
                  </div>
                  <div className="font-display text-3xl font-bold text-foreground">
                    ${totalMonthly.toFixed(0)}
                  </div>
                  <div className="text-muted-foreground text-sm">Recurring total</div>
                </div>

                <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Next Billing</span>
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-success" />
                    </div>
                  </div>
                  <div className="font-display text-2xl font-bold text-foreground">
                    {nextBillingDate ? formatDate(nextBillingDate) : 'N/A'}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {nextBillingDate ? 'Upcoming payment' : 'No recurring services'}
                  </div>
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

                  {purchases.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="font-medium text-foreground mb-2">No active services</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Browse our shop to find products and services
                      </p>
                      <Button variant="hero" asChild>
                        <Link to="/dashboard/shop">
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Browse Shop
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {purchases.slice(0, 5).map((purchase) => (
                          <div 
                            key={purchase.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-2xl">
                                {purchase.product?.icon || '📦'}
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{purchase.product?.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {purchase.product?.billing_type === 'one-time' ? 'One-time purchase' : 
                                   `${purchase.product?.billing_type} • Next: ${purchase.next_billing_date ? formatDate(purchase.next_billing_date) : 'N/A'}`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-semibold text-foreground">
                                  ${Number(purchase.price_paid).toFixed(0)}
                                  {purchase.product?.billing_type === 'monthly' && '/mo'}
                                  {purchase.product?.billing_type === 'annual' && '/yr'}
                                </div>
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

                      <Button variant="outline" className="w-full mt-4 gap-2" asChild>
                        <Link to="/dashboard/shop">
                          <Plus className="w-4 h-4" />
                          Browse More Services
                        </Link>
                      </Button>
                    </>
                  )}
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

                  {invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No invoices yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div 
                          key={invoice.id} 
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div>
                            <div className="font-medium text-foreground">{invoice.invoice_number}</div>
                            <div className="text-sm text-muted-foreground">{formatDate(invoice.created_at)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold text-foreground">${Number(invoice.amount).toFixed(0)}</div>
                              <div className={`text-xs capitalize ${invoice.status === 'paid' ? 'text-success' : 'text-warning'}`}>
                                {invoice.status}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "600ms" }}>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
