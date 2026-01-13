import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Package, 
  Loader2, 
  Wifi, 
  Server, 
  Shield, 
  Mail, 
  Cloud, 
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_type: string;
  category: string | null;
  features: string[];
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

const categoryIcons: Record<string, React.ReactNode> = {
  internet: <Wifi className="w-6 h-6" />,
  hosting: <Server className="w-6 h-6" />,
  security: <Shield className="w-6 h-6" />,
  email: <Mail className="w-6 h-6" />,
  cloud: <Cloud className="w-6 h-6" />,
  other: <Globe className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  internet: "from-blue-500 to-cyan-500",
  hosting: "from-purple-500 to-pink-500",
  security: "from-red-500 to-orange-500",
  email: "from-green-500 to-emerald-500",
  cloud: "from-indigo-500 to-violet-500",
  other: "from-gray-500 to-slate-500",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  active: { label: "Active", variant: "default", icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <XCircle className="w-4 h-4" /> },
  pending: { label: "Pending", variant: "secondary", icon: <AlertCircle className="w-4 h-4" /> },
};

const MyServices = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<UserPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchPurchases = async () => {
    if (!user) return;

    const { data: purchasesData, error: purchasesError } = await supabase
      .from("user_purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
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
    } else {
      setPurchases([]);
    }
    setLoading(false);
  };

  const handleSyncSubscriptions = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to sync subscriptions");
        return;
      }

      const { data, error } = await supabase.functions.invoke("sync-user-subscriptions", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Sync error:", error);
        toast.error("Failed to sync subscriptions");
        return;
      }

      if (data.synced > 0) {
        toast.success(`Synced ${data.synced} subscription(s): ${data.services.join(", ")}`);
        await fetchPurchases();
      } else {
        toast.info(data.message || "No new subscriptions to sync");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync subscriptions");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-foreground">My Services</h1>
                <p className="text-xs text-muted-foreground">Manage your active services</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSyncSubscriptions}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync from Stripe
            </Button>
            <Button onClick={() => navigate("/shop")}>
              Browse More Services
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {purchases.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No active services</h3>
            <p className="text-muted-foreground mb-6">
              You haven't purchased any services yet. Browse our shop to get started!
            </p>
            <Button onClick={() => navigate("/shop")}>Browse Shop</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((purchase) => {
              const product = purchase.product;
              const category = product?.category || "other";
              const status = statusConfig[purchase.status];

              return (
                <Card key={purchase.id} className="overflow-hidden">
                  {/* Gradient header */}
                  <div className={`h-2 bg-gradient-to-r ${categoryColors[category]}`} />
                  
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[category]} flex items-center justify-center text-white`}>
                        {categoryIcons[category]}
                      </div>
                      <Badge variant={status.variant} className="gap-1">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4">{product?.name || "Unknown Service"}</CardTitle>
                    {product?.description && (
                      <CardDescription>{product.description}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">
                        ${purchase.price_paid.toFixed(2)}
                        {product?.billing_type !== "one-time" && (
                          <span className="text-muted-foreground">/{product?.billing_type === "monthly" ? "mo" : "yr"}</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Purchased</span>
                      <span>{format(new Date(purchase.purchased_at), "MMM d, yyyy")}</span>
                    </div>

                    {purchase.next_billing_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next Billing</span>
                        <span>{format(new Date(purchase.next_billing_date), "MMM d, yyyy")}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t flex gap-2">
                      <Button variant="outline" className="flex-1" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyServices;
