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
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import {
  MultiServiceDetailsForm,
  ServiceItem,
  ServiceDetailsResult,
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
  const [selectedItem, setSelectedItem] = useState<{
    itemId: string;
    productId: string;
    quantity: number;
    product: Product;
  } | null>(null);
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
    const items = getOrderItems(order);
    // For multi-item pending orders we show per-item pay buttons.
    if (items.length > 1) return;
    handlePurchaseItemClick(order, items[0]);
  };

  const handlePurchaseItemClick = (
    order: PendingOrder,
    item: { productId: string; product: Product; quantity: number; itemId: string },
  ) => {
    const requiresDetails = item.product?.category?.toLowerCase() === "internet";

    if (requiresDetails) {
      const services: ServiceItem[] = [
        {
          id: item.itemId,
          productId: item.productId,
          productName: item.product?.name || "Unknown Product",
          quantity: item.quantity,
          requiresDetails: true,
        },
      ];
      setServiceItems(services);
      setSelectedOrder(order);
      setSelectedItem(item);
      setShowDetailsForm(true);
      return;
    }

    handlePurchaseSingle(order, item);
  };

  const handleDetailsSubmit = async (results: ServiceDetailsResult[]) => {
    if (!selectedOrder) return;

    if (selectedItem) {
      await handlePurchaseSingle(selectedOrder, selectedItem, results[0]);
    } else {
      await handlePurchase(selectedOrder, results);
    }

    setShowDetailsForm(false);
    setSelectedOrder(null);
    setSelectedItem(null);
  };

  const getInvokeErrorMessage = async (err: any) => {
    // Supabase JS v2 exposes richer error types for edge function invocations.
    if (err instanceof FunctionsHttpError) {
      try {
        const body = await err.context.json();
        return body?.error || JSON.stringify(body);
      } catch {
        try {
          const text = await err.context.text();
          return text || err.message;
        } catch {
          return err.message;
        }
      }
    }

    if (err instanceof FunctionsRelayError || err instanceof FunctionsFetchError) {
      return err.message;
    }

    return err?.message || "Failed to start checkout";
  };

  const ensureOrderClaimed = async (order: PendingOrder) => {
    if (order.claimed_by) return;

    const { error: claimError } = await supabase
      .from("pending_orders")
      .update({
        claimed_by: user?.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (claimError) throw claimError;
  };

  const handlePurchaseSingle = async (
    order: PendingOrder,
    item: { productId: string; product: Product; quantity: number; itemId: string },
    detailsResult?: ServiceDetailsResult,
  ) => {
    setPurchasingId(order.id);
    try {
      await ensureOrderClaimed(order);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("You are not logged in. Please log in again and retry.");
      }

      const body = {
        productId: item.productId,
        quantity: item.quantity,
        pendingOrderId: order.id,
        pendingOrderItemId: item.itemId,
        customerDetails: detailsResult?.customerDetails ?? null,
      };

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body,
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
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
        .update({ claimed_by: null, claimed_at: null })
        .eq("id", order.id);

      const message = await getInvokeErrorMessage(error);

      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPurchasingId(null);
    }
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
        checkoutItems = detailsResults.map((result) => ({
          productId: result.productId,
          quantity: result.quantity,
          customerDetails: result.customerDetails,
        }));
      } else {
        const orderItems = getOrderItems(order);
        console.log("Using order items (no details):", orderItems.length, "items");
        checkoutItems = orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          customerDetails: null,
        }));
      }

      console.log("Checkout items to send:", checkoutItems);

      // Ensure we always send the JWT explicitly (avoids missing auth header edge-cases)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("You are not logged in. Please log in again and retry.");
      }

      const { data, error } = await supabase.functions.invoke("create-multi-checkout", {
        body: {
          items: checkoutItems,
          pendingOrderId: order.id,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
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

      const message = await getInvokeErrorMessage(error);

      toast({
        title: "Checkout failed",
        description: message,
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
                <Card key={order.id} className={`bg-background ${isRetry ? "border-amber-500/50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            {items.length === 1 ? items[0].product?.name : `${items.length} items`}
                          </p>
                          {isRetry && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                            >
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
                          <p className="text-xs text-muted-foreground mt-1">Note: {order.notes}</p>
                        )}
                      </div>

                      {items.length === 1 ? (
                        <Button
                          onClick={() => handlePurchaseItemClick(order, items[0])}
                          disabled={purchasingId === order.id}
                          variant="default"
                        >
                          {purchasingId === order.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-4 w-4 mr-2" />
                          )}
                          {isRetry ? "Retry Payment" : "Pay Now"}
                        </Button>
                      ) : null}
                    </div>

                    {items.length > 1 ? (
                      <div className="mt-4 space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.itemId}
                            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.product?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty {item.quantity} •{" "}
                                {new Intl.NumberFormat("en-AU", {
                                  style: "currency",
                                  currency: "AUD",
                                }).format((item.product?.price || 0) * item.quantity)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handlePurchaseItemClick(order, item)}
                              disabled={purchasingId === order.id}
                            >
                              Pay
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
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
            setSelectedItem(null);
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