import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHomePage ? 'bg-transparent' : 'glass border-b'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Peritus ONE Logo" className="w-10 h-10" />
            <div className="flex flex-col">
              <span className={`font-display font-bold text-lg leading-tight ${isHomePage ? 'text-white' : 'text-foreground'}`}>
                Peritus ONE
              </span>
              <span className={`text-[10px] uppercase tracking-widest ${isHomePage ? 'text-white/60' : 'text-muted-foreground'}`}>
                by Peritus Digital
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/features" 
              className={`text-sm font-medium transition-colors hover:text-primary ${isHomePage ? 'text-white/80 hover:text-white' : 'text-muted-foreground'}`}
            >
              Features
            </Link>
            <Link 
              to="/support" 
              className={`text-sm font-medium transition-colors hover:text-primary ${isHomePage ? 'text-white/80 hover:text-white' : 'text-muted-foreground'}`}
            >
              Support
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant={isHomePage ? "hero-outline" : "ghost"} asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="hero" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={`md:hidden p-2 ${isHomePage ? 'text-white' : 'text-foreground'}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden glass rounded-2xl mt-2 p-4 border animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link 
                to="/features" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Features
              </Link>
              <Link 
                to="/support" 
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Support
              </Link>
              <hr className="border-border" />
              <Button variant="outline" asChild className="w-full">
                <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
              </Button>
              <Button variant="hero" asChild className="w-full">
                <Link to="/signup" onClick={() => setIsOpen(false)}>Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
