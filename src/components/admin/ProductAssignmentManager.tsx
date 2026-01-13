import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Plus, Trash2, UserPlus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  visibility: string;
  category: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface ProductAssignment {
  id: string;
  product_id: string;
  user_id: string;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
  products: Product;
  user_email?: string;
  user_name?: string;
}

const ProductAssignmentManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchData = async () => {
    setLoading(true);

    // Fetch all products (including private ones for admin)
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, price, visibility, category")
      .order("name");

    // Fetch all users
    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("email");

    // Fetch all assignments with product details
    const { data: assignmentsData } = await supabase
      .from("product_assignments")
      .select(`
        id,
        product_id,
        user_id,
        notes,
        created_at,
        expires_at,
        products (id, name, price, visibility, category)
      `)
      .order("created_at", { ascending: false });

    if (productsData) setProducts(productsData);
    if (usersData) setUsers(usersData);
    
    if (assignmentsData && usersData) {
      // Merge user info into assignments
      const enrichedAssignments = assignmentsData.map((a: any) => {
        const userProfile = usersData.find(u => u.id === a.user_id);
        return {
          ...a,
          user_email: userProfile?.email,
          user_name: userProfile?.full_name,
        };
      });
      setAssignments(enrichedAssignments);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (!selectedProduct || !selectedUser || !user) {
      toast({
        title: "Missing Fields",
        description: "Please select a product and a user",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("product_assignments").insert({
      product_id: selectedProduct,
      user_id: selectedUser,
      assigned_by: user.id,
      notes: notes || null,
      expires_at: expiresAt || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Already Assigned",
          description: "This product is already assigned to this user",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to assign product",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Product Assigned",
        description: "The product has been assigned to the customer",
      });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }

    setSaving(false);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from("product_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Assignment Removed",
        description: "The product assignment has been removed",
      });
      fetchData();
    }
  };

  const handleUpdateVisibility = async (productId: string, visibility: string) => {
    const { error } = await supabase
      .from("products")
      .update({ visibility })
      .eq("id", productId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Visibility Updated",
        description: `Product is now ${visibility}`,
      });
      fetchData();
    }
  };

  const resetForm = () => {
    setSelectedProduct("");
    setSelectedUser("");
    setNotes("");
    setExpiresAt("");
  };

  const privateProducts = products.filter(p => p.visibility === "private");

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Product Assignments
              </CardTitle>
              <CardDescription>
                Assign private products to specific customers
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Visibility Quick Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Product Visibility</Label>
            <div className="grid gap-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="outline">${product.price}</Badge>
                  </div>
                  <Select
                    value={product.visibility}
                    onValueChange={(val) => handleUpdateVisibility(product.id, val)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Current Assignments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Assignments</Label>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No product assignments yet. Assign a private product to a customer to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.products?.name || "Unknown Product"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {assignment.user_name || "No name"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.user_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {assignment.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {assignment.expires_at
                          ? new Date(assignment.expires_at).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Product to Customer</DialogTitle>
            <DialogDescription>
              Make a private product available to a specific customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ${product.price}
                      {product.visibility === "private" && " (Private)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes about this assignment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductAssignmentManager;
