import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileHeart } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Hardcoded credentials
    if (email === "demo@claimshelper.com" && password === "demo123") {
      toast({
        title: "Login successful",
        description: "Welcome to TrueClaim.AI",
      });
      navigate("/home");
    } else {
      toast({
        title: "Login failed",
        description: "Invalid credentials. Use demo@claimshelper.com / demo123",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-4 animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-primary/20 animate-scale-in">
        <div className="absolute inset-0 bg-gradient-card opacity-50 rounded-lg" />
        <CardHeader className="space-y-4 text-center relative">
          <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-lg animate-bounce-subtle">
            <FileHeart className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TrueClaim.AI
            </CardTitle>
            <CardDescription className="text-base mt-2 text-muted-foreground">
              AI-powered insurance claims platform ✨
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@claimshelper.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="demo123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-primary/20 focus:border-primary transition-all"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:shadow-lg hover:scale-[1.02] transition-all" 
              size="lg"
            >
              Sign In
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">Demo Access</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center px-4 py-2 bg-muted/50 rounded-lg">
              🔑 demo@claimshelper.com / demo123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
