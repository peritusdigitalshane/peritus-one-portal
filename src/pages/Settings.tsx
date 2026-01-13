import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutGrid,
  CreditCard,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ShoppingBag,
  Package,
  Sparkles,
  Loader2,
  Shield,
  User,
  Bell,
  Lock,
  Save,
} from "lucide-react";

const Settings = () => {
  const { user, loading, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r hidden lg:flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight text-foreground">
                Peritus ONE
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Customer Portal
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <LayoutGrid className="w-5 h-5" />
            Dashboard
          </Link>
          <Link
            to="/dashboard/services"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <Package className="w-5 h-5" />
            My Services
          </Link>
          <Link
            to="/dashboard/shop"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Shop
          </Link>
          <Link
            to="/dashboard/billing"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <CreditCard className="w-5 h-5" />
            Billing
          </Link>
          <Link
            to="/dashboard/invoices"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <FileText className="w-5 h-5" />
            Invoices
          </Link>
          <Link
            to="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium"
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </Link>
          {isSuperAdmin && (
            <Link
              to="/super-admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
            >
              <Shield className="w-5 h-5" />
              Admin Portal
            </Link>
          )}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <header className="bg-card border-b px-6 py-4 sticky top-0 z-40">
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </header>

        <div className="p-6 space-y-6 max-w-3xl">
          {/* Profile Section */}
          <div className="bg-card rounded-2xl border p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Profile</h2>
                <p className="text-sm text-muted-foreground">Update your personal information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <Button onClick={handleUpdateProfile} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Notifications</h2>
                <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Email Notifications</div>
                  <div className="text-sm text-muted-foreground">
                    Receive notifications about your account and services
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Marketing Emails</div>
                  <div className="text-sm text-muted-foreground">
                    Receive updates about new products and promotions
                  </div>
                </div>
                <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-card rounded-2xl border p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">Security</h2>
                <p className="text-sm text-muted-foreground">Change your password</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={saving || !newPassword} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Change Password
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
