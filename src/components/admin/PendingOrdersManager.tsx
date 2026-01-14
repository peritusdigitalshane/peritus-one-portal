import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Mail, Package, Loader2, Wifi, ChevronDown, ChevronRight, Edit, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MultiProductPendingOrderForm } from "./MultiProductPendingOrderForm";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Product {
  id: string;
  name: string;
  price: number;
  billing_type: string;
  category: string | null;
}

interface PendingOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  customer_details: Record<string, string> | null;
  products: Product;
}

interface PendingOrder {
  id: string;
  email: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  products: Product;
  items?: PendingOrderItem[];
}

interface EditingOrder {
  id: string;
  email: string;
  notes: string | null;
  claimed_by: string | null;
  items: { id: string; product_id: string; quantity: number; customer_details: Record<string, string> | null }[];
}

export const PendingOrdersManager = () => {
  const { user } = useAuth();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [editingOrder, setEditingOrder] = useState<EditingOrder | null>(null);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, itemsRes] = await Promise.all([
        supabase
          .from("pending_orders")
          .select("*, products(id, name, price, billing_type, category)")
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, name, price, billing_type, category")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("pending_order_items")
          .select("*, products(id, name, price, billing_type, category)"),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (productsRes.error) throw productsRes.error;

      // Group items by pending_order_id
      const itemsByOrder = new Map<string, PendingOrderItem[]>();
      if (itemsRes.data) {
        itemsRes.data.forEach((item: any) => {
          const orderId = item.pending_order_id;
          if (!itemsByOrder.has(orderId)) {
            itemsByOrder.set(orderId, []);
          }
          itemsByOrder.get(orderId)!.push(item);
        });
      }

      // Attach items to orders
      const ordersWithItems = (ordersRes.data || []).map((order: any) => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
      }));

      setPendingOrders(ordersWithItems as PendingOrder[]);
      setProducts(productsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      // First delete the items
      await supabase
        .from("pending_order_items")
        .delete()
        .eq("pending_order_id", id);

      // Then delete the order
      const { error } = await supabase
        .from("pending_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Order deleted",
        description: "Pending order has been removed",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (order: PendingOrder) => {
    const editOrder: EditingOrder = {
      id: order.id,
      email: order.email,
      notes: order.notes,
      claimed_by: order.claimed_by,
      items: order.items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        customer_details: item.customer_details,
      })) || [],
    };
    setEditingOrder(editOrder);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingOrder(null);
    }
  };

  const formatPrice = (price: number, billingType: string) => {
    const formatted = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(price);
    return billingType === "monthly" ? `${formatted}/mo` : formatted;
  };

  const toggleExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getOrderTotal = (order: PendingOrder) => {
    if (order.items && order.items.length > 0) {
      return order.items.reduce((total, item) => {
        return total + (item.products?.price || 0) * item.quantity;
      }, 0);
    }
    return (order.products?.price || 0) * order.quantity;
  };

  const getInternetServiceCount = (order: PendingOrder) => {
    if (order.items && order.items.length > 0) {
      return order.items.filter(item => 
        item.products?.category?.toLowerCase() === "internet"
      ).length;
    }
    return order.products?.category?.toLowerCase() === "internet" ? 1 : 0;
  };

  // Split orders into unclaimed and claimed (but unpaid)
  const unclaimedOrders = pendingOrders.filter(order => !order.claimed_by);
  const claimedUnpaidOrders = pendingOrders.filter(order => order.claimed_by);

  const renderOrdersTable = (orders: PendingOrder[], showClaimedInfo: boolean = false) => {
    if (orders.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No orders in this category</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            {showClaimedInfo && <TableHead>Claimed At</TableHead>}
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const hasItems = order.items && order.items.length > 0;
            const isExpanded = expandedOrders.has(order.id);
            const internetCount = getInternetServiceCount(order);

            return (
              <Collapsible key={order.id} open={isExpanded} asChild>
                <>
                  <TableRow className="cursor-pointer" onClick={() => hasItems && toggleExpand(order.id)}>
                    <TableCell>
                      {hasItems && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{order.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasItems ? (
                          <span>{order.items!.length} item{order.items!.length > 1 ? "s" : ""}</span>
                        ) : (
                          <span>{order.products?.name || "Unknown"}</span>
                        )}
                        {internetCount > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <Wifi className="h-3 w-3" />
                            {internetCount}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-AU", {
                        style: "currency",
                        currency: "AUD",
                      }).format(getOrderTotal(order))}
                    </TableCell>
                    <TableCell>
                      {order.claimed_by ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" />
                          Payment Incomplete
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    {showClaimedInfo && (
                      <TableCell>
                        {order.claimed_at ? new Date(order.claimed_at).toLocaleString() : "-"}
                      </TableCell>
                    )}
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(order);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(order.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {hasItems && (
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={showClaimedInfo ? 8 : 7} className="p-0">
                          <div className="px-8 py-3">
                            <div className="space-y-2">
                              {order.items!.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between py-2 px-3 bg-background rounded border"
                                >
                                  <div className="flex items-center gap-3">
                                    {item.products?.category?.toLowerCase() === "internet" && (
                                      <Wifi className="h-4 w-4 text-blue-500" />
                                    )}
                                    <span className="font-medium">{item.products?.name}</span>
                                    {item.quantity > 1 && (
                                      <Badge variant="secondary">x{item.quantity}</Badge>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground">
                                    {item.products
                                      ? formatPrice(item.products.price, item.products.billing_type)
                                      : "-"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {order.notes && (
                              <p className="text-sm text-muted-foreground mt-3">
                                Note: {order.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  )}
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pending Orders
            </CardTitle>
            <CardDescription>
              Create orders for customers before they register. Internet services will require address details at checkout.
            </CardDescription>
          </div>
          <Button onClick={() => {
            setEditingOrder(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pending Order
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              Pending
              {unclaimedOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1">{unclaimedOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="claimed-unpaid" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Claimed - Awaiting Payment
              {claimedUnpaidOrders.length > 0 && (
                <Badge variant="destructive" className="ml-1">{claimedUnpaidOrders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {renderOrdersTable(unclaimedOrders)}
          </TabsContent>

          <TabsContent value="claimed-unpaid">
            {claimedUnpaidOrders.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  These orders have been claimed by users but payment was not completed. You can edit or delete them.
                </p>
              </div>
            )}
            {renderOrdersTable(claimedUnpaidOrders, true)}
          </TabsContent>
        </Tabs>
      </CardContent>

      <MultiProductPendingOrderForm
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchData}
        products={products}
        editingOrder={editingOrder}
      />
    </Card>
  );
};
