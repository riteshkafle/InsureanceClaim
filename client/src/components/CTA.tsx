import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground">
            Ready to File Your Claim?
          </h2>
          <p className="text-xl text-primary-foreground/90 leading-relaxed">
            Join thousands of users who have successfully filed their insurance claims with TrueClaim.AI. 
            Get your forms auto-filled, apply for waivers, and prepare tax documents - all in minutes.
          </p>
          <Button 
            size="lg" 
            className="bg-background text-foreground hover:bg-background/90 text-lg px-8 shadow-lg"
            onClick={() => navigate("/demographics")}
          >
            Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
