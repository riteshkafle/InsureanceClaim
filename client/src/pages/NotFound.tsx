import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-accent/5" />
      <div className="text-center relative z-10 animate-fade-up">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-primary rounded-full mb-6 shadow-2xl animate-bounce-subtle relative">
            <span className="text-6xl font-bold text-primary-foreground">404</span>
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Page Not Found
        </h1>
        <p className="mb-8 text-xl text-muted-foreground max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist. Let's get you back on track! 🚀
        </p>
        <a href="/">
          <Button className="bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all" size="lg">
            Return to Home
          </Button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
