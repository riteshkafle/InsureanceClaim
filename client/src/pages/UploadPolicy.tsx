import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import { ArrowRight, Upload, FileText, X } from "lucide-react";

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
];

const UploadPolicy = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Load saved file name from localStorage on mount
  useEffect(() => {
    const savedFileName = localStorage.getItem("policyFile");
    if (savedFileName) {
      // Note: We can't restore the actual File object, but we can show the name
      // In a real app, you might want to store the file in IndexedDB
    }
  }, []);
  
  const handleStepClick = (stepNumber: number) => {
    // Save current state before navigating
    if (file) {
      localStorage.setItem("policyFile", file.name);
    }
    
    const routes: { [key: number]: string } = {
      1: "/demographics",
      2: "/upload-bill",
      3: "/upload-policy",
    };
    
    if (routes[stepNumber]) {
      navigate(routes[stepNumber]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload your insurance policy",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('policy', file);

      const response = await fetch(apiUrl('api/upload-policy'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload policy');
      }

      const result = await response.json();
      
      // Store file info in localStorage
      localStorage.setItem("policyFile", file.name);
      
      toast({
        title: "Document uploaded",
        description: "Proceeding to claim history",
      });
      
      navigate("/denial-check");
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload policy",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-secondary/5 via-transparent to-primary/5" />
      <div className="max-w-4xl mx-auto relative z-10">
        <ProgressSteps currentStep={3} steps={steps} onStepClick={handleStepClick} />
        
        <Card className="shadow-2xl border-primary/10 animate-fade-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Upload Insurance Policy
            </CardTitle>
            <CardDescription className="text-base">
              Please upload your health insurance policy document (PDF format) 📄
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-primary bg-gradient-to-br from-primary/10 to-secondary/10 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-secondary/5"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {!file ? (
                <div className="space-y-4">
                  <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg animate-bounce-subtle">
                    <Upload className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Maximum file size: 10MB
                    </p>
                  </div>
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline" className="cursor-pointer" asChild>
                      <span>Select File</span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4 animate-scale-in">
                  <div className="mx-auto w-20 h-20 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-10 h-10 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-info/10 to-info/5 border-2 border-info/30 rounded-xl p-5 shadow-md">
              <h4 className="font-bold text-foreground mb-2 flex items-center">
                <span className="mr-2">🔒</span> Important Information
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start">
                  <span className="mr-2 text-info">✓</span>
                  Your document will be processed securely
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-info">✓</span>
                  We'll extract key information to help with your claim
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-info">✓</span>
                  All data is encrypted and kept confidential
                </li>
              </ul>
            </div>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/upload-bill")}
                className="hover:scale-105 transition-all"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isUploading}
                size="lg" 
                className="min-w-[200px] bg-gradient-primary hover:shadow-lg hover:scale-[1.02] transition-all group"
              >
                {isUploading ? "Uploading..." : "Continue"}
                {!isUploading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadPolicy;
