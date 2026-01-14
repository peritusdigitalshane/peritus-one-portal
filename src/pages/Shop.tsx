import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CustomerDetailsForm, CustomerDetails } from "@/components/shop/CustomerDetailsForm";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  ShoppingCart, 
  Loader2, 
  Check, 
  Wifi, 
  Server, 
  Shield, 
  Mail, 
  Cloud, 
  Globe,
  Package,
  Sparkles
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  price: number;
  billing_type: string;
  category: string | null;
  is_active: boolean;
  features: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  internet: <Wifi className="w-6 h-6" />,
  hosting: <Server className="w-6 h-6" />,
  security: <Shield className="w-6 h-6" />,
  email: <Mail className="w-6 h-6" />,
  cloud: <Cloud className="w-6 h-6" />,
  ai: <Sparkles className="w-6 h-6" />,
  other: <Globe className="w-6 h-6" />,
};

const categoryColors: Record<string, string> = {
  internet: "from-blue-500 to-cyan-500",
  hosting: "from-purple-500 to-pink-500",
  security: "from-red-500 to-orange-500",
  email: "from-green-500 to-emerald-500",
  cloud: "from-indigo-500 to-violet-500",
  ai: "from-pink-500 to-rose-500",
  other: "from-gray-500 to-slate-500",
};

// Categories that require customer details
const REQUIRES_CUSTOMER_DETAILS = ["internet"];

const Shop = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Customer details form state
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const categories = ["all", ...new Set(products.map(p => p.category || "other"))];

  const filteredProducts = activeCategory === "all" 
    ? products 
    : products.filter(p => (p.category || "other") === activeCategory);

  const requiresCustomerDetails = (product: Product) => {
    return REQUIRES_CUSTOMER_DETAILS.includes(product.category?.toLowerCase() || "");
  };

  const handlePurchaseClick = (product: Product) => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (requiresCustomerDetails(product)) {
      setSelectedProduct(product);
      setShowDetailsForm(true);
    } else {
      handlePurchase(product);
    }
  };

  const handleCustomerDetailsSubmit = (details: CustomerDetails) => {
    setCustomerDetails(details);
    if (selectedProduct) {
      handlePurchase(selectedProduct, details);
    }
  };

  const handlePurchase = async (product: Product, details?: CustomerDetails) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setPurchasing(product.id);

    try {
      // Call the Stripe Checkout edge function
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          productId: product.id,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/dashboard/shop?checkout=cancelled`,
          customerDetails: details || null,
        },
      });

      if (error) {
        console.error("Checkout error:", error);
        throw new Error(error.message || "Failed to create checkout session");
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error purchasing product:", error);
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      });
      setPurchasing(null);
      setShowDetailsForm(false);
      setSelectedProduct(null);
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
      title="Shop"
      subtitle="Browse and purchase services"
      headerActions={
        cart.length > 0 ? (
          <Button className="relative">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Cart ({cart.length})
          </Button>
        ) : undefined
      }
    >
      <div className="p-6">
        {/* Hero Section */}
        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            Our Services
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Choose from our range of professional services designed to power your business. 
            All services include 24/7 support and guaranteed uptime.
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="h-auto flex-wrap">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="capitalize"
              >
                {category === "all" ? "All Services" : category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No products available</h3>
            <p className="text-muted-foreground">Check back soon for new services!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                {/* Gradient header */}
                <div className={`h-2 bg-gradient-to-r ${categoryColors[product.category || "other"]}`} />
                
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${categoryColors[product.category || "other"]} flex items-center justify-center text-white`}>
                      {categoryIcons[product.category || "other"]}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {product.billing_type}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription>{product.description}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-foreground">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.billing_type !== "one-time" && (
                      <span className="text-muted-foreground">/{product.billing_type === "monthly" ? "mo" : "yr"}</span>
                    )}
                  </div>

                  {/* Features */}
                  {product.features && product.features.length > 0 && (
                    <ul className="space-y-2">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>

                <CardFooter className="pt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={() => handlePurchaseClick(product)}
                    disabled={purchasing === product.id}
                  >
                    {purchasing === product.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    {purchasing === product.id ? "Processing..." : "Purchase Now"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Customer Details Form */}
        <CustomerDetailsForm
          open={showDetailsForm}
          onOpenChange={(open) => {
            setShowDetailsForm(open);
            if (!open) {
              setSelectedProduct(null);
              setPurchasing(null);
            }
          }}
          onSubmit={handleCustomerDetailsSubmit}
          productName={selectedProduct?.name || ""}
          loading={purchasing === selectedProduct?.id}
          defaultValues={{
            email: user?.email || "",
            firstName: user?.user_metadata?.full_name?.split(" ")[0] || "",
            lastName: user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Shop;
