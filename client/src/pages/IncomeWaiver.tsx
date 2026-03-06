import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/config/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import { ArrowRight } from "lucide-react";

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
];

const IncomeWaiver = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [needsWaiver, setNeedsWaiver] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedWaiver = localStorage.getItem("needsWaiver");
    if (savedWaiver) {
      setNeedsWaiver(savedWaiver);
    }
  }, []);
  
  const handleStepClick = (stepNumber: number) => {
    // Save current state before navigating
    localStorage.setItem("needsWaiver", needsWaiver);
    
    const routes: { [key: number]: string } = {
      1: "/demographics",
      2: "/upload-bill",
      3: "/upload-policy",
      4: "/denial-check",
      5: "/income-waiver",
    };
    
    if (routes[stepNumber]) {
      navigate(routes[stepNumber]);
    }
  };

  const handleSubmit = async () => {
    if (!needsWaiver) {
      toast({
        title: "Please select an option",
        description: "Let us know if you need a low-income waiver",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('needsWaiver', needsWaiver);

      const response = await fetch(apiUrl('api/low-income-waiver'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process income waiver');
      }

      // Store waiver info
      localStorage.setItem("needsWaiver", needsWaiver);
      
      toast({
        title: "Processing started",
        description: "Generating your claim documents. This may take a few moments...",
      });
      
      // Navigate to results - the Results page will show loading while documents are generated
      navigate("/results");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process income waiver",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-secondary/5 via-transparent to-accent/5" />
      <div className="max-w-4xl mx-auto relative z-10">
        <ProgressSteps currentStep={5} steps={steps} onStepClick={handleStepClick} />
        
        <Card className="shadow-2xl border-primary/10 animate-fade-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Low-Income Waiver
            </CardTitle>
            <CardDescription className="text-base">
              Would you like to apply for a low-income fee waiver? 💰
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-info/10 to-info/5 border-2 border-info/30 rounded-xl p-5 shadow-md">
              <h4 className="font-bold text-foreground mb-2 flex items-center">
                <span className="mr-2">💡</span> What is a low-income waiver?
              </h4>
              <p className="text-sm text-muted-foreground">
                If you qualify based on your income, you may be eligible for reduced or waived fees 
                related to your insurance claim or medical expenses.
              </p>
            </div>

            <RadioGroup value={needsWaiver} onValueChange={setNeedsWaiver}>
              <div className="flex items-center space-x-3 p-5 border-2 rounded-xl hover:bg-gradient-to-r hover:from-accent/5 hover:to-accent/10 hover:border-accent/50 transition-all cursor-pointer hover:scale-[1.01] hover:shadow-md">
                <RadioGroupItem value="yes" id="yes-waiver" />
                <Label htmlFor="yes-waiver" className="flex-1 cursor-pointer">
                  <span className="font-semibold text-foreground">Yes, I'd like to apply for a waiver</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    We'll generate a financial assistance letter based on your income information
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-5 border-2 rounded-xl hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 hover:border-primary/50 transition-all cursor-pointer hover:scale-[1.01] hover:shadow-md">
                <RadioGroupItem value="no" id="no-waiver" />
                <Label htmlFor="no-waiver" className="flex-1 cursor-pointer">
                  <span className="font-semibold text-foreground">No, I don't need a waiver</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Skip this step
                  </p>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/denial-check")}
                className="hover:scale-105 transition-all"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                size="lg" 
                className="min-w-[200px] bg-gradient-accent hover:shadow-lg hover:scale-[1.02] transition-all group"
              >
                {isSubmitting ? "Generating..." : "Generate Documents"}
                {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IncomeWaiver;
