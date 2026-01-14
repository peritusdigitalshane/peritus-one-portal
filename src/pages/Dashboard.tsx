import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";
import { 
  CreditCard, 
  ArrowUpRight,
  Download,
  Calendar,
  ChevronRight,
  ShoppingBag,
  Package,
  Sparkles,
  Plus,
  Loader2,
  FileText,
} from "lucide-react";
import { PendingOrdersAlert } from "@/components/dashboard/PendingOrdersAlert";

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [verifyingCheckout, setVerifyingCheckout] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Verify checkout session when returning from Stripe
  useEffect(() => {
    const verifyCheckout = async () => {
      const sessionId = searchParams.get("session_id");
      const checkoutStatus = searchParams.get("checkout");
      
      if (!sessionId || checkoutStatus !== "success" || !user) return;
      
      // Clear the URL params to prevent re-verification on refresh
      setSearchParams({});
      setVerifyingCheckout(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Please log in to complete verification");
          return;
        }

        console.log("Verifying checkout session:", sessionId);
        
        const { data, error } = await supabase.functions.invoke("verify-checkout", {
          body: { sessionId },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error("Verify checkout error:", error);
          toast.error("Failed to verify payment. Your services will appear shortly.");
        } else if (data?.success) {
          if (data.purchasesCreated?.length > 0) {
            toast.success(`Payment confirmed! ${data.purchasesCreated.join(", ")} activated.`);
          } else {
            toast.success("Payment verified successfully!");
          }
          // Refresh purchases
          const { data: purchasesData } = await supabase
            .from('user_purchases')
            .select(`*, product:products(*)`)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('purchased_at', { ascending: false });
          setPurchases(purchasesData || []);
        }
      } catch (err) {
        console.error("Checkout verification error:", err);
        toast.error("Payment verification failed. Please contact support if services don't appear.");
      } finally {
        setVerifyingCheckout(false);
      }
    };

    if (user && !loading) {
      verifyCheckout();
    }
  }, [user, loading, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: purchasesData } = await supabase
        .from('user_purchases')
        .select(`*, product:products(*)`)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });

      setPurchases(purchasesData || []);

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setInvoices(invoicesData || []);
      setLoadingData(false);
    };

    if (user) fetchData();
  }, [user]);

  if (loading || verifyingCheckout) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        {verifyingCheckout && (
          <p className="text-muted-foreground">Verifying your payment...</p>
        )}
      </div>
    );
  }

  if (!user) return null;

  const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there';
  const activeServices = purchases.filter(p => p.status === 'active' && p.product?.billing_type !== 'one-time');
  const totalMonthly = activeServices.reduce((sum, p) => {
    if (p.product?.billing_type === 'monthly') return sum + Number(p.price_paid);
    if (p.product?.billing_type === 'annual') return sum + (Number(p.price_paid) / 12);
    return sum;
  }, 0);

  const nextBillingDate = purchases
    .filter(p => p.next_billing_date)
    .sort((a, b) => new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime())[0]?.next_billing_date;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back, ${userName}`}
      headerActions={
        <Button variant="outline" size="sm" asChild className="hidden sm:flex">
          <Link to="/support">Get Support</Link>
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <PendingOrdersAlert />

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
                <div className="font-display text-3xl font-bold text-foreground">${totalMonthly.toFixed(0)}</div>
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
                    <Link to="/dashboard/services">View All <ArrowUpRight className="w-4 h-4" /></Link>
                  </Button>
                </div>

                {purchases.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-foreground mb-2">No active services</h3>
                    <p className="text-sm text-muted-foreground mb-4">Browse our shop to find products and services</p>
                    <Button variant="hero" asChild>
                      <Link to="/dashboard/shop"><ShoppingBag className="w-4 h-4 mr-2" />Browse Shop</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {purchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
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
                                <div className="w-1.5 h-1.5 rounded-full bg-success" />Active
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4 gap-2" asChild>
                      <Link to="/dashboard/shop"><Plus className="w-4 h-4" />Browse More Services</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Recent Invoices */}
              <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-semibold text-foreground">Recent Invoices</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard/invoices">View All</Link>
                  </Button>
                </div>

                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No invoices yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium text-foreground text-sm">{invoice.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(invoice.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">${invoice.amount.toFixed(2)}</div>
                          <div className={`text-xs ${invoice.status === 'paid' ? 'text-success' : 'text-warning'}`}>
                            {invoice.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
