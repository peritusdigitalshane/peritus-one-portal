import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield,
  ArrowLeft,
  Loader2,
  Search,
  Package,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Wifi,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  status: string;
  price_paid: number;
  purchased_at: string;
  next_billing_date: string | null;
  stripe_subscription_id: string | null;
  fulfilled: boolean;
  fulfilled_at: string | null;
  notes: string | null;
  // Customer details for service orders
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_postcode: string | null;
  profiles: {
    email: string;
    full_name: string | null;
  };
  products: {
    name: string;
    billing_type: string;
    category: string | null;
  };
}

const statusConfig = {
  active: { label: "Active", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
  pending: { label: "Pending", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  past_due: { label: "Past Due", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
};

const PurchaseManagement = () => {
  const { user, loading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fulfilledFilter, setFulfilledFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (!loading && user && !isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [user, loading, isSuperAdmin, navigate]);

  const fetchPurchases = async () => {
    try {
      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("user_purchases")
        .select(`
          *,
          products(name, billing_type, category)
        `)
        .order("purchased_at", { ascending: false });

      if (purchasesError) throw purchasesError;

      // Fetch profiles separately
      const userIds = [...new Set(purchasesData?.map(p => p.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedData = purchasesData?.map(purchase => ({
        ...purchase,
        profiles: profilesMap.get(purchase.user_id) || { email: "", full_name: null },
      })) || [];

      setPurchases(mergedData as Purchase[]);
    } catch (error: any) {
      toast({
        title: "Error fetching purchases",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPurchases();
    }
  }, [isSuperAdmin]);

  const handleToggleFulfilled = async (purchase: Purchase) => {
    setUpdatingId(purchase.id);
    try {
      const newFulfilled = !purchase.fulfilled;
      const { error } = await supabase
        .from("user_purchases")
        .update({
          fulfilled: newFulfilled,
          fulfilled_at: newFulfilled ? new Date().toISOString() : null,
        })
        .eq("id", purchase.id);

      if (error) throw error;

      setPurchases((prev) =>
        prev.map((p) =>
          p.id === purchase.id
            ? { ...p, fulfilled: newFulfilled, fulfilled_at: newFulfilled ? new Date().toISOString() : null }
            : p
        )
      );

      toast({
        title: newFulfilled ? "Marked as fulfilled" : "Marked as unfulfilled",
        description: `${purchase.products?.name} for ${purchase.profiles?.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating purchase",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.customer_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.customer_last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
    const matchesFulfilled =
      fulfilledFilter === "all" ||
      (fulfilledFilter === "fulfilled" && purchase.fulfilled) ||
      (fulfilledFilter === "unfulfilled" && !purchase.fulfilled);
    const matchesCategory = 
      categoryFilter === "all" || 
      (purchase.products?.category?.toLowerCase() || "other") === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesFulfilled && matchesCategory;
  });

  // Get unique categories from purchases
  const categories = [...new Set(purchases.map(p => p.products?.category?.toLowerCase() || "other"))];

  // Internet services pending fulfillment
  const pendingInternetServices = purchases.filter(
    p => p.products?.category?.toLowerCase() === "internet" && !p.fulfilled && p.status === "active"
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price: number, billingType: string) => {
    const formatted = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(price);
    if (billingType === "monthly") return `${formatted}/mo`;
    if (billingType === "annual") return `${formatted}/yr`;
    return formatted;
  };

  const stats = {
    total: purchases.length,
    active: purchases.filter((p) => p.status === "active").length,
    fulfilled: purchases.filter((p) => p.fulfilled).length,
    pending: purchases.filter((p) => !p.fulfilled && p.status === "active").length,
    internetPending: pendingInternetServices.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/super-admin">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-foreground">
                Purchase Management
              </h1>
              <p className="text-xs text-muted-foreground">
                View and manage all customer purchases
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Shield className="w-3 h-3" />
            Super Admin
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Internet Services Alert */}
        {stats.internetPending > 0 && (
          <Card 
            className="mb-6 border-blue-500/50 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors"
            onClick={() => {
              setCategoryFilter("internet");
              setFulfilledFilter("unfulfilled");
              setStatusFilter("active");
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Internet Services to Order</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats.internetPending} service{stats.internetPending !== 1 ? 's' : ''} awaiting provisioning
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-500 text-white">{stats.internetPending}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{stats.fulfilled}</div>
              <p className="text-sm text-muted-foreground">Fulfilled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-colors ${categoryFilter === "internet" ? "ring-2 ring-blue-500" : "hover:bg-muted/50"}`}
            onClick={() => setCategoryFilter(categoryFilter === "internet" ? "all" : "internet")}
          >
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-500">{stats.internetPending}</div>
              <p className="text-sm text-muted-foreground">Internet Pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, email, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <Package className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fulfilledFilter} onValueChange={setFulfilledFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Fulfillment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                </SelectContent>
              </Select>
              {(categoryFilter !== "all" || statusFilter !== "all" || fulfilledFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setCategoryFilter("all");
                    setStatusFilter("all");
                    setFulfilledFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Purchases Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Purchases</CardTitle>
            <CardDescription>
              {filteredPurchases.length} of {purchases.length} purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No purchases found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Done</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purchased</TableHead>
                      <TableHead>Fulfilled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => {
                      const status = statusConfig[purchase.status as keyof typeof statusConfig] || statusConfig.pending;
                      const StatusIcon = status.icon;

                      return (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            <Checkbox
                              checked={purchase.fulfilled}
                              onCheckedChange={() => handleToggleFulfilled(purchase)}
                              disabled={updatingId === purchase.id}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {purchase.customer_first_name && purchase.customer_last_name
                                  ? `${purchase.customer_first_name} ${purchase.customer_last_name}`
                                  : purchase.profiles?.full_name || "No name"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {purchase.customer_email || purchase.profiles?.email}
                              </div>
                              {purchase.customer_phone && (
                                <div className="text-xs text-muted-foreground">
                                  📞 {purchase.customer_phone}
                                </div>
                              )}
                              {purchase.customer_address && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  📍 {purchase.customer_address}, {purchase.customer_city} {purchase.customer_state} {purchase.customer_postcode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{purchase.products?.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {purchase.products?.category || "Uncategorized"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatPrice(
                              purchase.price_paid,
                              purchase.products?.billing_type || "one-time"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${status.bg} ${status.color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(purchase.purchased_at)}</TableCell>
                          <TableCell>
                            {purchase.fulfilled ? (
                              <span className="text-sm text-green-500">
                                {purchase.fulfilled_at
                                  ? formatDate(purchase.fulfilled_at)
                                  : "Yes"}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PurchaseManagement;
