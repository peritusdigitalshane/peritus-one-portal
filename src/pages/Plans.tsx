import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Essential",
    speed: "100 Mbps",
    price: 49,
    features: [
      "Unlimited data",
      "Free router included",
      "24/7 customer support",
      "99.9% uptime guarantee",
    ],
  },
  {
    name: "Professional",
    speed: "500 Mbps",
    price: 79,
    features: [
      "Unlimited data",
      "Premium router included",
      "Priority 24/7 support",
      "99.99% uptime guarantee",
      "Static IP address",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    speed: "1 Gbps",
    price: 129,
    features: [
      "Unlimited data",
      "Business-grade router",
      "Dedicated support line",
      "99.99% uptime SLA",
      "Multiple static IPs",
      "Network monitoring",
    ],
  },
];

const allFeatures = [
  "No data caps or throttling",
  "Free professional installation",
  "30-day money-back guarantee",
  "No long-term contracts",
  "Free equipment upgrades",
  "24/7 network monitoring",
];

const Plans = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your Perfect Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, transparent pricing with no hidden fees. All plans include unlimited data 
              and our satisfaction guarantee.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <PricingCard key={plan.name} {...plan} delay={index * 100} />
              ))}
            </div>
          </div>
        </section>

        {/* All Plans Include */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl font-bold text-foreground mb-8">
                All Plans Include
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allFeatures.map((feature, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-4 bg-card rounded-xl border animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Have Questions?
            </h2>
            <p className="text-muted-foreground mb-8">
              Our team is here to help you find the perfect plan for your needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="mailto:support@peritusdigital.com.au"
                className="text-primary font-medium hover:underline"
              >
                Contact Support →
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Plans;
