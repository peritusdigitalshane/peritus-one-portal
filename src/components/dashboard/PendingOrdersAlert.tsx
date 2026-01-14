import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, AlertCircle, Loader2, Wifi } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  MultiServiceDetailsForm, 
  ServiceItem, 
  ServiceDetailsResult 
} from "@/components/shop/MultiServiceDetailsForm";

interface Product {
  id: string;
  name: string;
  price: number;
  billing_type: string;
  description: string | null;
  category: string | null;
}

interface PendingOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  products: Product;
}

interface PendingOrder {
  id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  products: Product;
  items: PendingOrderItem[];
}

export const PendingOrdersAlert = () => {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  const fetchPendingOrders = async () => {
    if (!user) return;

    try {
      // Fetch orders that are unclaimed OR claimed by current user (for retry)
      const { data: orders, error } = await supabase
        .from("pending_orders")
        .select("id, product_id, quantity, notes, claimed_by, claimed_at, products(id, name, price, billing_type, description, category)")
        .or(`claimed_by.is.null,claimed_by.eq.${user.id}`);

      if (error) throw error;

      // Fetch items for each order
      const orderIds = (orders || []).map(o => o.id);
      let itemsByOrder = new Map<string, PendingOrderItem[]>();
      
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("pending_order_items")
          .select("*, products(id, name, price, billing_type, description, category)")
          .in("pending_order_id", orderIds);

        if (itemsError) {
          console.error("Error fetching pending order items:", itemsError);
        }

        // Group items by order
        (items || []).forEach((item: any) => {
          if (!itemsByOrder.has(item.pending_order_id)) {
            itemsByOrder.set(item.pending_order_id, []);
          }
          itemsByOrder.get(item.pending_order_id)!.push(item);
        });
        
        console.log("Fetched pending order items:", items?.length || 0, "for", orderIds.length, "orders");
      }

      const ordersWithItems = (orders || []).map((order: any) => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
      }));
      
      console.log("Pending orders with items:", ordersWithItems.map(o => ({ 
        id: o.id, 
        itemCount: o.items?.length || 0 
      })));

      setPendingOrders(ordersWithItems as PendingOrder[]);
    } catch (error: any) {
      console.error("Error fetching pending orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, [user]);

  const getOrderItems = (order: PendingOrder): { productId: string; product: Product; quantity: number; itemId: string }[] => {
    if (order.items && order.items.length > 0) {
      return order.items.map(item => ({
        itemId: item.id,
        productId: item.product_id,
        product: item.products,
        quantity: item.quantity,
      }));
    }
    return [{
      itemId: order.id,
      productId: order.product_id,
      product: order.products,
      quantity: order.quantity,
    }];
  };

  const hasInternetServices = (order: PendingOrder): boolean => {
    const items = getOrderItems(order);
    return items.some(item => item.product?.category?.toLowerCase() === "internet");
  };

  const handlePurchaseClick = (order: PendingOrder) => {
    if (hasInternetServices(order)) {
      const items = getOrderItems(order);
      const services: ServiceItem[] = items.map(item => ({
        id: item.itemId,
        productId: item.productId,
        productName: item.product?.name || "Unknown Product",
        quantity: item.quantity,
        requiresDetails: item.product?.category?.toLowerCase() === "internet",
      }));
      setServiceItems(services);
      setSelectedOrder(order);
      setShowDetailsForm(true);
    } else {
      handlePurchase(order);
    }
  };

  const handleDetailsSubmit = async (results: ServiceDetailsResult[]) => {
    if (!selectedOrder) return;
    await handlePurchase(selectedOrder, results);
    setShowDetailsForm(false);
    setSelectedOrder(null);
  };

  const handlePurchase = async (order: PendingOrder, detailsResults?: ServiceDetailsResult[]) => {
    setPurchasingId(order.id);
    try {
      // Only claim if not already claimed by this user
      if (!order.claimed_by) {
        const { error: claimError } = await supabase
          .from("pending_orders")
          .update({
            claimed_by: user?.id,
            claimed_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (claimError) throw claimError;
      }

      // Build items for checkout
      let checkoutItems;
      
      if (detailsResults) {
        console.log("Using details results:", detailsResults.length, "items");
        checkoutItems = detailsResults.map(result => ({
          productId: result.productId,
          quantity: result.quantity,
          customerDetails: result.customerDetails,
        }));
      } else {
        const orderItems = getOrderItems(order);
        console.log("Using order items (no details):", orderItems.length, "items");
        checkoutItems = orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customerDetails: null,
        }));
      }
      
      console.log("Checkout items to send:", checkoutItems);

      // Use multi-checkout function
      const { data, error } = await supabase.functions.invoke("create-multi-checkout", {
        body: { 
          items: checkoutItems,
          pendingOrderId: order.id,
        },
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

  const getOrderTotal = (order: PendingOrder) => {
    const items = getOrderItems(order);
    return items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  };

  if (loading || pendingOrders.length === 0) {
    return null;
  }

  return (
    <>
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
            {pendingOrders.map((order) => {
              const items = getOrderItems(order);
              const hasInternet = hasInternetServices(order);
              const isRetry = !!order.claimed_by;
              
              return (
                <Card key={order.id} className={`bg-background ${isRetry ? 'border-amber-500/50' : ''}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {items.length === 1 
                            ? items[0].product?.name 
                            : `${items.length} items`}
                        </p>
                        {isRetry && (
                          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            Payment incomplete
                          </Badge>
                        )}
                        {hasInternet && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Wifi className="h-3 w-3" />
                            Address required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat("en-AU", {
                          style: "currency",
                          currency: "AUD",
                        }).format(getOrderTotal(order))}
                      </p>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => handlePurchaseClick(order)}
                      disabled={purchasingId === order.id}
                      variant={isRetry ? "default" : "default"}
                    >
                      {purchasingId === order.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4 mr-2" />
                      )}
                      {isRetry ? "Retry Payment" : "Pay Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </AlertDescription>
      </Alert>

      <MultiServiceDetailsForm
        open={showDetailsForm}
        onOpenChange={(open) => {
          setShowDetailsForm(open);
          if (!open) {
            setSelectedOrder(null);
            setPurchasingId(null);
          }
        }}
        onSubmit={handleDetailsSubmit}
        services={serviceItems}
        loading={purchasingId !== null}
        defaultValues={{
          email: user?.email || "",
        }}
      />
    </>
  );
};