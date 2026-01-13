import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PricingCardProps {
  name: string;
  speed: string;
  price: number;
  features: string[];
  popular?: boolean;
  delay?: number;
}

const PricingCard = ({ name, speed, price, features, popular, delay = 0 }: PricingCardProps) => {
  return (
    <div 
      className={`relative rounded-2xl p-6 md:p-8 transition-all duration-300 hover:scale-[1.02] animate-fade-in ${
        popular 
          ? 'bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary shadow-lg shadow-primary/20' 
          : 'bg-card border border-border shadow-md'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full shadow-md">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="font-display text-xl font-bold text-foreground mb-2">{name}</h3>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Zap className="w-4 h-4 text-accent" />
          <span className="font-semibold text-lg text-foreground">{speed}</span>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-medium text-muted-foreground">$</span>
          <span className="font-display text-5xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button 
        variant={popular ? "hero" : "outline"} 
        size="lg" 
        className="w-full"
        asChild
      >
        <Link to="/signup">
          {popular ? "Get Started" : "Choose Plan"}
        </Link>
      </Button>
    </div>
  );
};

export default PricingCard;
