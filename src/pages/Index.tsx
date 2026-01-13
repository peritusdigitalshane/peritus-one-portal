import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";
import { 
  ArrowRight, 
  Shield, 
  Headphones, 
  BarChart3,
  CreditCard,
  FileText,
  Layers,
  Package,
  Sparkles
} from "lucide-react";

const platformFeatures = [
  {
    icon: Layers,
    title: "All-in-One Platform",
    description: "Access all your Peritus services from a single, unified dashboard.",
  },
  {
    icon: Sparkles,
    title: "Seamless Experience",
    description: "Purchase, manage, and track everything with an intuitive interface.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and security for all your transactions and data.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Get help when you need it with our dedicated customer success team.",
  },
];

const portalFeatures = [
  {
    icon: BarChart3,
    title: "Unified Dashboard",
    description: "Monitor all your services and subscriptions in one powerful view.",
  },
  {
    icon: CreditCard,
    title: "Simple Billing",
    description: "One bill, one payment—manage everything from a single account.",
  },
  {
    icon: FileText,
    title: "Instant Receipts",
    description: "Access and download all your invoices and receipts instantly.",
  },
  {
    icon: Package,
    title: "Service Marketplace",
    description: "Discover and add new services as your needs grow.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-hero overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-glow" />
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="container mx-auto px-4 pt-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-white/80">Your Complete Digital Hub</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
              One Portal.
              <span className="block text-gradient">Infinite Possibilities.</span>
            </h1>

            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
              Peritus ONE is your gateway to everything you need—from blazing-fast internet 
              to essential business services. Purchase, manage, and grow with a single powerful platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/plans">Explore Services</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-white">50K+</div>
                <div className="text-sm text-white/60">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-white">10+</div>
                <div className="text-sm text-white/60">Services</div>
              </div>
              <div className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-white">99.9%</div>
                <div className="text-sm text-white/60">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Peritus ONE?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              More than a portal—it's your complete digital command center. 
              Purchase, manage, and scale all your services from one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformFeatures.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} delay={index * 100} />
            ))}
          </div>
        </div>
      </section>


      {/* Portal Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Your Services.
                <span className="text-gradient"> Your Way.</span>
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Peritus ONE puts the power in your hands. Browse our marketplace, 
                purchase what you need, and manage everything from a single, 
                beautifully designed dashboard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portalFeatures.map((feature, index) => (
                  <div 
                    key={feature.title} 
                    className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="hero" size="lg" className="mt-8" asChild>
                <Link to="/signup">
                  Start Exploring
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-50" />
              <div className="relative bg-card rounded-2xl border shadow-2xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="ml-2 text-xs text-muted-foreground">portal.peritusdigital.com</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Welcome back</div>
                      <div className="font-display font-bold text-xl">John Doe</div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                      JD
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">Current Plan</div>
                      <div className="font-semibold text-foreground">Professional</div>
                      <div className="text-primary text-sm font-medium">500 Mbps</div>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="font-semibold text-success">Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Data Usage</span>
                      <span className="text-sm font-medium text-foreground">245 GB</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-glow opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to Experience the Difference?
            </h2>
            <p className="text-lg text-white/70 mb-10">
              Join thousands of Peritus customers who've simplified their digital lives. 
              Create your free account today and unlock everything you need.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="xl" asChild>
                <Link to="/signup">
                  Create Free Account
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/support">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
