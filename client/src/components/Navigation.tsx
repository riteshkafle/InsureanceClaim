import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.svg" 
              alt="TrueClaim.AI Logo" 
              className="w-10 h-10"
            />
            <span className="text-2xl font-bold text-foreground">TrueClaim.AI</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">How It Works</a>
            <a href="#testimonials" className="text-foreground hover:text-primary transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft"
              onClick={() => navigate("/demographics")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

