import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  Loader2, 
  Download, 
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  description: string | null;
  created_at: string;
  pdf_url: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  paid: { label: "Paid", variant: "default", icon: <CheckCircle2 className="w-4 h-4" /> },
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="w-4 h-4" /> },
  overdue: { label: "Overdue", variant: "destructive", icon: <AlertCircle className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <XCircle className="w-4 h-4" /> },
};

const Invoices = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [syncing, setSyncing] = useState(false);

  const fetchInvoices = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invoices:", error);
    } else {
      // Check for overdue invoices
      const now = new Date();
      const updatedInvoices = (data || []).map(inv => {
        if (inv.status === "pending" && new Date(inv.due_date) < now) {
          return { ...inv, status: "overdue" };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
    }
    setLoading(false);
  };

  const handleSyncInvoices = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to sync invoices");
        return;
      }

      const { data, error } = await supabase.functions.invoke("sync-user-invoices", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Sync error:", error);
        toast.error("Failed to sync invoices");
        return;
      }

      if (data.synced > 0) {
        toast.success(`Synced ${data.synced} invoice(s) from Stripe`);
        await fetchInvoices();
      } else {
        toast.info(data.message || "No new invoices to sync");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync invoices");
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
    const initializeInvoices = async () => {
      if (!user) return;
      
      // First fetch existing invoices
      await fetchInvoices();
      
      // Then auto-sync from Stripe in the background
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data, error } = await supabase.functions.invoke("sync-user-invoices", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (!error && data?.synced > 0) {
            toast.success(`Found ${data.synced} invoice(s) from Stripe`);
            await fetchInvoices(); // Refresh after sync
          }
        }
      } catch (error) {
        console.error("Auto-sync error:", error);
        // Silent fail - user can still use manual sync
      }
    };

    if (user) {
      initializeInvoices();
    }
  }, [user]);

  const filteredInvoices = activeTab === "all" 
    ? invoices 
    : invoices.filter(inv => inv.status === activeTab);

  const stats = {
    total: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    pending: invoices.filter(inv => inv.status === "pending").reduce((sum, inv) => sum + inv.amount, 0),
    paid: invoices.filter(inv => inv.status === "paid").reduce((sum, inv) => sum + inv.amount, 0),
    overdue: invoices.filter(inv => inv.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0),
  };

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
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-foreground">Invoices</h1>
              <p className="text-xs text-muted-foreground">View and manage your invoices</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  <p className="text-2xl font-bold text-foreground">${stats.total.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">${stats.pending.toFixed(2)}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-foreground">${stats.paid.toFixed(2)}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-foreground">${stats.overdue.toFixed(2)}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              View all your invoices and their payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({invoices.filter(i => i.status === "pending").length})
                </TabsTrigger>
                <TabsTrigger value="paid">
                  Paid ({invoices.filter(i => i.status === "paid").length})
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Overdue ({invoices.filter(i => i.status === "overdue").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No invoices found</p>
                <p className="text-sm">
                  {activeTab === "all" 
                    ? "Purchase a service to see your invoices here" 
                    : `No ${activeTab} invoices`}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const status = statusConfig[invoice.status] || statusConfig.pending;
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          {invoice.description || "Service charge"}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${invoice.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invoice.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.pdf_url ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(invoice.pdf_url!, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              <Download className="w-4 h-4 mr-2" />
                              N/A
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
      </main>
    </div>
  );
};

export default Invoices;
