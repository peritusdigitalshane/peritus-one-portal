import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PendingOrder {
  id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  products: {
    id: string;
    name: string;
    price: number;
    billing_type: string;
    description: string | null;
  };
}

export const PendingOrdersAlert = () => {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const fetchPendingOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("pending_orders")
        .select("id, product_id, quantity, notes, products(id, name, price, billing_type, description)")
        .is("claimed_by", null);

      if (error) throw error;
      setPendingOrders(data as PendingOrder[]);
    } catch (error: any) {
      console.error("Error fetching pending orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, [user]);

  const handlePurchase = async (order: PendingOrder) => {
    setPurchasingId(order.id);
    try {
      // First claim the pending order
      const { error: claimError } = await supabase
        .from("pending_orders")
        .update({
          claimed_by: user?.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (claimError) throw claimError;

      // Then redirect to checkout
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productId: order.product_id },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      // Unclaim the order if checkout fails
      await supabase
        .from("pending_orders")
        .update({
          claimed_by: null,
          claimed_at: null,
        })
        .eq("id", order.id);

      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setPurchasingId(null);
    }
  };

  const formatPrice = (price: number, billingType: string) => {
    const formatted = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(price);
    return billingType === "monthly" ? `${formatted}/mo` : formatted;
  };

  if (loading || pendingOrders.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-6 border-primary/50 bg-primary/5">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Pending Orders
        <Badge variant="secondary">{pendingOrders.length}</Badge>
      </AlertTitle>
      <AlertDescription className="mt-4">
        <p className="text-sm text-muted-foreground mb-4">
          You have orders waiting for payment. Complete your purchase below.
        </p>
        <div className="space-y-3">
          {pendingOrders.map((order) => (
            <Card key={order.id} className="bg-background">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{order.products?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.products
                      ? formatPrice(
                          order.products.price * order.quantity,
                          order.products.billing_type
                        )
                      : "-"}
                    {order.quantity > 1 && ` (x${order.quantity})`}
                  </p>
                  {order.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: {order.notes}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handlePurchase(order)}
                  disabled={purchasingId === order.id}
                >
                  {purchasingId === order.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  Pay Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};
