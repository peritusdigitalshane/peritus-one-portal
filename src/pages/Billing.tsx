import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  CreditCard, 
  Loader2, 
  DollarSign,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
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
  cancelled_at: string | null;
  product?: Product;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Active", variant: "default", icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <XCircle className="w-4 h-4" /> },
  pending: { label: "Pending", variant: "secondary", icon: <AlertCircle className="w-4 h-4" /> },
};

const Billing = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!user) return;

      const { data: purchasesData, error: purchasesError } = await supabase
        .from("user_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });

      if (purchasesError) {
        console.error("Error fetching purchases:", purchasesError);
        setLoading(false);
        return;
      }

      if (purchasesData && purchasesData.length > 0) {
        const productIds = [...new Set(purchasesData.map(p => p.product_id))];
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);

        const purchasesWithProducts = purchasesData.map(purchase => ({
          ...purchase,
          product: productsData?.find(p => p.id === purchase.product_id),
        }));

        setPurchases(purchasesWithProducts);
      }
      setLoading(false);
    };

    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const activePurchases = purchases.filter(p => p.status === "active");
  const monthlySpend = activePurchases.reduce((sum, p) => {
    if (p.product?.billing_type === "monthly") {
      return sum + p.price_paid;
    } else if (p.product?.billing_type === "yearly") {
      return sum + (p.price_paid / 12);
    }
    return sum;
  }, 0);

  const nextBillingDate = activePurchases
    .filter(p => p.next_billing_date)
    .sort((a, b) => new Date(a.next_billing_date!).getTime() - new Date(b.next_billing_date!).getTime())[0]?.next_billing_date;

  const handleCancelSubscription = async (purchaseId: string) => {
    const { error } = await supabase
      .from("user_purchases")
      .update({ 
        status: "cancelled", 
        cancelled_at: new Date().toISOString() 
      })
      .eq("id", purchaseId);

    if (error) {
      console.error("Error cancelling subscription:", error);
    } else {
      setPurchases(prev => prev.map(p => 
        p.id === purchaseId 
          ? { ...p, status: "cancelled", cancelled_at: new Date().toISOString() }
          : p
      ));
    }
  };

  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in to manage billing",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        "https://rrsrbmunjsinjuaewnmg.supabase.co/functions/v1/create-customer-portal",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            return_url: window.location.href,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to open billing portal");
      }

      // Redirect to Stripe Customer Portal
      window.location.href = result.url;
    } catch (error: any) {
      console.error("Error opening billing portal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Billing"
      subtitle="Manage your subscriptions and billing"
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-foreground">{activePurchases.length}</p>
                </div>
                <Package className="w-10 h-10 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Spend</p>
                  <p className="text-3xl font-bold text-foreground">${monthlySpend.toFixed(2)}</p>
                </div>
                <DollarSign className="w-10 h-10 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing</p>
                  <p className="text-3xl font-bold text-foreground">
                    {nextBillingDate 
                      ? format(new Date(nextBillingDate), "MMM d")
                      : "N/A"}
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Billing Portal Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Manage Billing
            </CardTitle>
            <CardDescription>
              View invoices, update payment methods, and manage your subscriptions through Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#635BFF] to-[#0A2540] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div>
                  <p className="font-medium">Stripe Customer Portal</p>
                  <p className="text-sm text-muted-foreground">
                    Update payment methods, download invoices, and manage subscriptions
                  </p>
                </div>
              </div>
              <Button onClick={handleOpenBillingPortal} disabled={openingPortal}>
                {openingPortal ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Open Portal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Subscriptions</CardTitle>
            <CardDescription>
              View and manage all your active and past subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No subscriptions yet</p>
                <p className="text-sm mb-4">Visit the shop to purchase services</p>
                <Button onClick={() => navigate("/dashboard/shop")}>Browse Shop</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => {
                    const status = statusConfig[purchase.status] || statusConfig.pending;
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-medium">
                          {purchase.product?.name || "Unknown Service"}
                        </TableCell>
                        <TableCell>
                          ${purchase.price_paid.toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {purchase.product?.billing_type || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {purchase.next_billing_date 
                            ? format(new Date(purchase.next_billing_date), "MMM d, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {purchase.status === "active" && purchase.product?.billing_type !== "one-time" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelSubscription(purchase.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
