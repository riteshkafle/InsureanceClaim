import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/config/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import { ArrowRight, Upload, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
];

const DenialCheck = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hasDenial, setHasDenial] = useState<string>("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [denialFile, setDenialFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedDenial = localStorage.getItem("hasDenial");
    if (savedDenial) {
      setHasDenial(savedDenial);
    }
  }, []);
  
  const handleStepClick = (stepNumber: number) => {
    // Save current state before navigating
    localStorage.setItem("hasDenial", hasDenial);
    if (denialFile) {
      localStorage.setItem("denialFile", denialFile.name);
    }
    
    const routes: { [key: number]: string } = {
      1: "/demographics",
      2: "/upload-bill",
      3: "/upload-policy",
      4: "/denial-check",
    };
    
    if (routes[stepNumber]) {
      navigate(routes[stepNumber]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setDenialFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!hasDenial) {
      toast({
        title: "Please select an option",
        description: "Let us know if you've been denied before",
        variant: "destructive",
      });
      return;
    }

    if (hasDenial === "yes" && !denialFile) {
      setShowUploadDialog(true);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('hasDenial', hasDenial);
      if (denialFile) {
        formData.append('denial', denialFile);
      }

      const response = await fetch(apiUrl('api/upload-denial'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save denial information');
      }

      // Store denial info
      localStorage.setItem("hasDenial", hasDenial);
      if (denialFile) {
        localStorage.setItem("denialFile", denialFile.name);
      }
      
      toast({
        title: "Information saved",
        description: "Proceeding to income verification",
      });
      
      navigate("/income-waiver");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save denial information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-secondary/5" />
      <div className="max-w-4xl mx-auto relative z-10">
        <ProgressSteps currentStep={4} steps={steps} onStepClick={handleStepClick} />
        
        <Card className="shadow-2xl border-primary/10 animate-fade-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Prior Claim Denials
            </CardTitle>
            <CardDescription className="text-base">
              Have you been denied coverage for this claim before? 🤔
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={hasDenial} onValueChange={setHasDenial}>
              <div className="flex items-center space-x-3 p-5 border-2 rounded-xl hover:bg-gradient-to-r hover:from-warning/5 hover:to-warning/10 hover:border-warning/50 transition-all cursor-pointer hover:scale-[1.01] hover:shadow-md">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="flex-1 cursor-pointer">
                  <span className="font-semibold text-foreground">Yes, I have been denied before</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    I'll upload my denial letter
                  </p>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-5 border-2 rounded-xl hover:bg-gradient-to-r hover:from-success/5 hover:to-success/10 hover:border-success/50 transition-all cursor-pointer hover:scale-[1.01] hover:shadow-md">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="flex-1 cursor-pointer">
                  <span className="font-semibold text-foreground">No, this is my first claim</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    I haven't filed this claim before
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {hasDenial === "yes" && !denialFile && (
              <div className="border-2 border-dashed border-warning rounded-lg p-6 bg-warning/5">
                <div className="text-center">
                  <p className="font-medium text-foreground mb-2">
                    Please upload your denial letter
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will help us prepare a stronger appeal
                  </p>
                  <label htmlFor="denial-upload">
                    <Button type="button" variant="outline" className="cursor-pointer" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Select Denial Letter
                      </span>
                    </Button>
                  </label>
                  <input
                    id="denial-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {denialFile && (
              <div className="border rounded-lg p-4 bg-accent/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{denialFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(denialFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDenialFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/upload-policy")}
                className="hover:scale-105 transition-all"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                size="lg" 
                className="min-w-[200px] bg-gradient-primary hover:shadow-lg hover:scale-[1.02] transition-all group"
              >
                {isSubmitting ? "Saving..." : "Continue"}
                {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Required</DialogTitle>
            <DialogDescription>
              Please upload your denial letter to continue. This document is important for preparing your appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label htmlFor="dialog-upload" className="block">
              <Button type="button" className="w-full cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Denial Letter
                </span>
              </Button>
            </label>
            <input
              id="dialog-upload"
              type="file"
              accept=".pdf"
              onChange={(e) => {
                handleFileChange(e);
                setShowUploadDialog(false);
              }}
              className="hidden"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DenialCheck;
