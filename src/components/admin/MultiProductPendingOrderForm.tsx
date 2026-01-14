import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Package, Wifi } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  price: number;
  billing_type: string;
  category: string | null;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
}

interface MultiProductPendingOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  products: Product[];
}

export const MultiProductPendingOrderForm = ({
  open,
  onOpenChange,
  onSuccess,
  products,
}: MultiProductPendingOrderFormProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([
    { id: crypto.randomUUID(), productId: "", quantity: 1 }
  ]);

  const resetForm = () => {
    setEmail("");
    setNotes("");
    setItems([{ id: crypto.randomUUID(), productId: "", quantity: 1 }]);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const formatPrice = (price: number, billingType: string) => {
    const formatted = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(price);
    return billingType === "monthly" ? `${formatted}/mo` : formatted;
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), productId: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const isInternetProduct = (productId: string) => {
    const product = getProduct(productId);
    return product?.category?.toLowerCase() === "internet";
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const product = getProduct(item.productId);
      if (product) {
        return total + (product.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!email) {
      toast({
        title: "Validation Error",
        description: "Customer email is required",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter(item => item.productId);
    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one product is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Create the pending order
      const { data: order, error: orderError } = await supabase
        .from("pending_orders")
        .insert({
          email: email.toLowerCase().trim(),
          product_id: validItems[0].productId, // Keep for backwards compatibility
          quantity: validItems.reduce((sum, item) => sum + item.quantity, 0),
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create pending order items
      const itemsToInsert = validItems.map(item => ({
        pending_order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("pending_order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: "Pending order created",
        description: `Order with ${validItems.length} item(s) added for ${email}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const internetCount = items.filter(item => isInternetProduct(item.productId)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Pending Order
          </DialogTitle>
          <DialogDescription>
            Add multiple products to a single order. Internet services will require customer details at checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Customer Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Products</Label>
              {internetCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  {internetCount} internet service{internetCount > 1 ? "s" : ""} - details required at checkout
                </Badge>
              )}
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Select 
                    value={item.productId} 
                    onValueChange={(value) => updateItem(item.id, "productId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            {product.category?.toLowerCase() === "internet" && (
                              <Wifi className="h-3 w-3 text-blue-500" />
                            )}
                            {product.name} - {formatPrice(product.price, product.billing_type)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={addItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Product
            </Button>
          </div>

          {/* Order Total */}
          {items.some(item => item.productId) && (
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="font-medium">Order Total:</span>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                }).format(calculateTotal())}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};