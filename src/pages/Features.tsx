import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wifi, 
  Server, 
  Shield, 
  Mail, 
  Cloud, 
  Sparkles,
  Clock,
  Headphones,
  Lock,
  Zap,
  BarChart,
  Globe
} from "lucide-react";

const features = [
  {
    icon: Wifi,
    title: "High-Speed Internet",
    description: "Blazing fast fiber connections with speeds up to 10 Gbps for your business needs."
  },
  {
    icon: Server,
    title: "Managed Hosting",
    description: "Enterprise-grade hosting with 99.99% uptime guarantee and automatic scaling."
  },
  {
    icon: Shield,
    title: "Advanced Security",
    description: "Multi-layered security including firewalls, DDoS protection, and threat monitoring."
  },
  {
    icon: Mail,
    title: "Business Email",
    description: "Professional email hosting with spam filtering, encryption, and unlimited storage."
  },
  {
    icon: Cloud,
    title: "Cloud Services",
    description: "Flexible cloud solutions for storage, backup, and disaster recovery."
  },
  {
    icon: Sparkles,
    title: "AI Solutions",
    description: "Cutting-edge AI tools to automate workflows and enhance productivity."
  },
  {
    icon: Clock,
    title: "24/7 Monitoring",
    description: "Round-the-clock monitoring and proactive issue resolution."
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "Personal account managers and priority support for all customers."
  },
  {
    icon: Lock,
    title: "Data Protection",
    description: "GDPR-compliant data handling with encrypted storage and secure transfers."
  },
  {
    icon: Zap,
    title: "Fast Deployment",
    description: "Get up and running quickly with streamlined onboarding and setup."
  },
  {
    icon: BarChart,
    title: "Analytics Dashboard",
    description: "Real-time insights into your service usage and performance metrics."
  },
  {
    icon: Globe,
    title: "Global Network",
    description: "Worldwide infrastructure ensuring low latency and high availability."
  },
];

const Features = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powerful Features
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to power your business, all in one platform.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of businesses that trust Peritus ONE for their digital infrastructure.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
