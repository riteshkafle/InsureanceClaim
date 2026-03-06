import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ProgressSteps from "@/components/ProgressSteps";
import { Download, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/config/api";

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
];

interface PipelineStatus {
  current_step: string;
  progress: number;
  message: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

const Results = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState({
    claimReport: false,
    claimForm: false,
    waiverLetter: false,
    taxForm: false,
  });
  const [pdfUrls, setPdfUrls] = useState({
    claimReport: null as string | null,
    claimForm: null as string | null,
    waiverLetter: null as string | null,
    taxForm: null as string | null,
  });
  
  const handleStepClick = (stepNumber: number) => {
    const routes: { [key: number]: string } = {
      1: "/demographics",
      2: "/upload-bill",
      3: "/upload-policy",
      4: "/denial-check",
      5: "/income-waiver",
      6: "/results",
    };
    
    if (routes[stepNumber]) {
      navigate(routes[stepNumber]);
    }
  };

  // Get stored data
  const demographics = JSON.parse(localStorage.getItem("demographics") || "{}");
  const needsWaiver = localStorage.getItem("needsWaiver");

  useEffect(() => {
    // Poll for pipeline status and document availability
    const pollStatus = async () => {
      setIsProcessing(true);
      let retries = 0;
      const maxRetries = 120; // 2 minutes max wait (polling every second)
      
      const checkStatus = async () => {
        try {
          // Check pipeline status
          const statusResponse = await fetch(apiUrl('api/pipeline-status'));
          if (!statusResponse.ok) {
            return false;
          }
          
          const statusData = await statusResponse.json();
          if (!statusData.success || !statusData.status) {
            return false;
          }
          
          setPipelineStatus(statusData.status);
          
          // If pipeline completed or errored, check for documents
          if (statusData.status.current_step === 'completed' || 
              statusData.status.current_step === 'error') {
            // Check if documents are ready
            const endpoints = [
              { endpoint: 'claim-form', key: 'claimForm' as const },
              { endpoint: 'claim-report', key: 'claimReport' as const },
              { endpoint: 'tax-form', key: 'taxForm' as const },
            ];
            
            if (needsWaiver === "yes") {
              endpoints.push({ endpoint: 'waiver-letter', key: 'waiverLetter' as const });
            }
            
            let allReady = true;
            for (const { endpoint, key } of endpoints) {
              try {
                const response = await fetch(apiUrl(`api/documents/${endpoint}`));
                if (response.ok) {
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  setPdfUrls(prev => ({ ...prev, [key]: url }));
                  setLoading(prev => ({ ...prev, [key]: false }));
                } else {
                  allReady = false;
                  setLoading(prev => ({ ...prev, [key]: true }));
                }
              } catch (error) {
                allReady = false;
                setLoading(prev => ({ ...prev, [key]: true }));
              }
            }
            
            if (allReady || statusData.status.current_step === 'error') {
              setIsProcessing(false);
              return true;
            }
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
        return false;
      };
      
      // Try immediately
      const ready = await checkStatus();
      if (ready) {
        return;
      }
      
      // Poll every second
      const interval = setInterval(async () => {
        retries++;
        const ready = await checkStatus();
        
        if (ready || retries >= maxRetries) {
          clearInterval(interval);
          if (retries >= maxRetries) {
            setIsProcessing(false);
            toast({
              title: "Timeout",
              description: "Document generation is taking longer than expected. Please refresh the page.",
              variant: "destructive",
            });
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    };
    
    pollStatus();
  }, [needsWaiver, toast]);

  const loadPDF = async (endpoint: string, key: 'claimReport' | 'claimForm' | 'waiverLetter' | 'taxForm') => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(apiUrl(`api/documents/${endpoint}`));
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrls(prev => ({ ...prev, [key]: url }));
      } else {
        console.error(`Failed to load ${endpoint}`);
      }
    } catch (error) {
      console.error(`Error loading ${endpoint}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDownload = async (formName: string, endpoint: string) => {
    try {
      const response = await fetch(apiUrl(`api/documents/${endpoint}`));
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Download started",
          description: `Downloading ${formName}...`,
        });
      } else {
        throw new Error('Failed to download');
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: `Failed to download ${formName}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-primary/5" />
      <div className="max-w-6xl mx-auto relative z-10">
        <ProgressSteps currentStep={6} steps={steps} onStepClick={handleStepClick} />
        
        {isProcessing ? (
          <Card className="shadow-2xl border-primary/10 animate-fade-up">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow animate-spin-slow">
                    <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
                
                <div className="text-center space-y-3 max-w-2xl">
                  <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {pipelineStatus?.error ? "Processing Error" : "Processing Your Documents"}
                  </h2>
                  <p className="text-lg text-muted-foreground font-medium">
                    {pipelineStatus?.message || "Our AI is working hard to generate your claim forms, reports, and tax documents..."}
                  </p>
                  {pipelineStatus && (
                    <div className="w-full max-w-md mx-auto mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-semibold text-foreground">{pipelineStatus.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-primary transition-all duration-500 ease-out"
                          style={{ width: `${pipelineStatus.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Processing Steps - Dynamic based on status */}
                <div className="w-full max-w-2xl space-y-4 mt-6">
                  {[
                    { step: "ocr_extraction", label: "Extracting Policy Information", desc: "Reading and analyzing your insurance policy document", num: 1 },
                    { step: "policy_analysis", label: "Analyzing Policy Details", desc: "Using AI to extract key information from your policy", num: 2 },
                    { step: "claim_generation", label: "Generating Claim Forms", desc: "Auto-filling your claim form with extracted information", num: 3 },
                    { step: "report_creation", label: "Creating Reports & Documents", desc: "Generating claim report, tax forms, and financial assistance letters", num: 4 },
                    { step: "tax_documents", label: "Preparing Tax Documents", desc: "Creating tax deduction forms for medical expenses", num: 5 },
                    { step: "finalizing", label: "Finalizing Documents", desc: "Preparing all documents for download", num: 6 },
                  ].map(({ step, label, desc, num }) => {
                    const isActive = pipelineStatus?.current_step === step;
                    const isCompleted = pipelineStatus && 
                      (pipelineStatus.progress > (step === "ocr_extraction" ? 20 : step === "policy_analysis" ? 35 : step === "claim_generation" ? 55 : step === "report_creation" ? 75 : step === "tax_documents" ? 85 : 95));
                    const isPending = !isActive && !isCompleted;
                    
                    return (
                      <div 
                        key={step}
                        className={`bg-gradient-to-r rounded-xl p-4 border transition-all ${
                          isActive 
                            ? "from-primary/20 to-primary/10 border-primary/30 shadow-lg scale-[1.02]" 
                            : isCompleted
                            ? "from-success/10 to-success/5 border-success/20 opacity-75"
                            : "from-muted/10 to-muted/5 border-border/20 opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isActive 
                              ? "bg-primary animate-pulse" 
                              : isCompleted
                              ? "bg-success"
                              : "bg-muted"
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-success-foreground" />
                            ) : (
                              <span className={`text-sm font-bold ${
                                isActive ? "text-primary-foreground" : "text-muted-foreground"
                              }`}>
                                {num}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold ${
                              isActive ? "text-foreground" : isCompleted ? "text-foreground line-through" : "text-muted-foreground"
                            }`}>
                              {label}
                            </p>
                            <p className={`text-sm ${
                              isActive ? "text-muted-foreground" : "text-muted-foreground/70"
                            }`}>
                              {desc}
                            </p>
                          </div>
                          {isActive && (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fun Facts / Tips */}
                <div className="mt-8 w-full max-w-2xl">
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 border border-border rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <span className="text-lg">💡</span> Did You Know?
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• 41% of insurance claims are denied each year, but many can be successfully appealed</p>
                      <p>• Up to 15% of medical bills contain errors that can be corrected</p>
                      <p>• You may be eligible for financial assistance programs based on your income</p>
                      <p>• Medical expenses can often be deducted on your tax return</p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center mt-4">
                  This process typically takes 30-60 seconds. Please don't close this page.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
        <div className="mb-8 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-success to-success-glow rounded-full mb-4 shadow-2xl animate-scale-in relative">
            <CheckCircle className="w-12 h-12 text-success-foreground animate-bounce-subtle" />
            <div className="absolute inset-0 rounded-full bg-success/20 animate-ping" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Documents Ready! 🎉
          </h1>
          <p className="text-muted-foreground text-lg">
            Your claim documents have been generated and are ready to download
          </p>
        </div>

        <Card className="shadow-2xl border-primary/10 animate-fade-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
          <CardHeader>
            <CardTitle className="text-2xl">Your Generated Documents</CardTitle>
            <CardDescription className="text-base">
              Review and download your completed claim forms below ⬇️
            </CardDescription>
          </CardHeader>
          <CardContent>
                <Tabs defaultValue="claim-form" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="claim-form">Claim Form</TabsTrigger>
                    <TabsTrigger value="claim-report">Claim Report</TabsTrigger>
                <TabsTrigger value="waiver" disabled={needsWaiver !== "yes"}>
                      Financial Assistance
                </TabsTrigger>
                <TabsTrigger value="tax">Tax Form</TabsTrigger>
              </TabsList>

                  <TabsContent value="claim-form" className="space-y-4 mt-6">
                    <div className="border-2 border-primary/20 rounded-xl bg-gradient-to-br from-card to-primary/5 overflow-hidden">
                      <div className="flex items-start justify-between p-6 border-b border-primary/10">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <FileText className="w-7 h-7 text-primary-foreground" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground mb-1">
                              Filled Claim Form
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              Your insurance claim form with all information automatically filled in
                            </p>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center">
                                <span className="text-muted-foreground w-32">Patient:</span>
                                <span className="text-foreground font-medium">
                                  {demographics.firstName} {demographics.lastName}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-muted-foreground w-32">Member ID:</span>
                                <span className="text-foreground font-medium">
                                  {demographics.memberIdNumber}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-muted-foreground w-32">Group Number:</span>
                                <span className="text-foreground font-medium">
                                  {demographics.groupNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleDownload("Filled Claim Form", "claim-form")}
                          className="bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all ml-4"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <div className="h-[600px] bg-muted/30">
                        {loading.claimForm ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          </div>
                        ) : pdfUrls.claimForm ? (
                          <iframe
                            src={pdfUrls.claimForm}
                            className="w-full h-full border-0"
                            title="Filled Claim Form PDF"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>PDF not available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="claim-report" className="space-y-4 mt-6">
                <div className="border-2 border-primary/20 rounded-xl bg-gradient-to-br from-card to-primary/5 overflow-hidden">
                  <div className="flex items-start justify-between p-6 border-b border-primary/10">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <FileText className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                              Insurance Claim Report
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                              Comprehensive claim report with all incident details and coverage information
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-32">Patient:</span>
                            <span className="text-foreground font-medium">
                              {demographics.firstName} {demographics.lastName}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-32">Policy:</span>
                            <span className="text-foreground font-medium">
                              {demographics.policyNumber}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-32">Incident Date:</span>
                            <span className="text-foreground font-medium">
                              {demographics.incidentDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                          onClick={() => handleDownload("Claim Report", "claim-report")}
                      className="bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all ml-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="h-[600px] bg-muted/30">
                        {loading.claimReport ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                        ) : pdfUrls.claimReport ? (
                      <iframe
                            src={pdfUrls.claimReport}
                        className="w-full h-full border-0"
                            title="Claim Report PDF"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>PDF not available</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="waiver" className="space-y-4 mt-6">
                {needsWaiver === "yes" ? (
                  <div className="border-2 border-accent/20 rounded-xl bg-gradient-to-br from-card to-accent/5 overflow-hidden">
                    <div className="flex items-start justify-between p-6 border-b border-accent/10">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-14 h-14 bg-gradient-accent rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                          <FileText className="w-7 h-7 text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground mb-1">
                                Financial Assistance Letter
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                                Official request letter for financial assistance based on income verification
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center">
                              <span className="text-muted-foreground w-32">Income Bracket:</span>
                              <span className="text-foreground font-medium">
                                {demographics.incomeBracket}
                              </span>
                            </div>
                                <div className="flex items-center">
                                  <span className="text-muted-foreground w-32">Annual Income:</span>
                                  <span className="text-foreground font-medium">
                                    ${demographics.income ? parseInt(demographics.income).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-muted-foreground w-32">Dependents:</span>
                              <span className="text-foreground font-medium">
                                {demographics.dependentsCount || "0"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button 
                            onClick={() => handleDownload("Financial Assistance Letter", "waiver-letter")}
                        className="bg-gradient-accent hover:shadow-lg hover:scale-105 transition-all ml-4"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div className="h-[600px] bg-muted/30">
                      {loading.waiverLetter ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                      ) : pdfUrls.waiverLetter ? (
                        <iframe
                          src={pdfUrls.waiverLetter}
                          className="w-full h-full border-0"
                              title="Financial Assistance Letter PDF"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p>PDF not available</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                        <p>No financial assistance letter was requested</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tax" className="space-y-4 mt-6">
                <div className="border-2 border-info/20 rounded-xl bg-gradient-to-br from-card to-info/5 overflow-hidden">
                  <div className="flex items-start justify-between p-6 border-b border-info/10">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-14 h-14 bg-gradient-to-br from-info to-info/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <FileText className="w-7 h-7 text-info-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                              IRS Tax Form (Schedule A)
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                              Filled IRS Schedule A form for medical expense deductions on your tax return
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                                <span className="text-muted-foreground w-32">Taxpayer:</span>
                            <span className="text-foreground font-medium">
                                  {demographics.firstName} {demographics.lastName}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-muted-foreground w-32">Hospital:</span>
                            <span className="text-foreground font-medium">
                              {demographics.hospitalName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                          onClick={() => handleDownload("IRS Tax Form", "tax-form")}
                      className="bg-gradient-to-r from-info to-info/80 hover:shadow-lg hover:scale-105 transition-all text-info-foreground ml-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="h-[600px] bg-muted/30">
                    {loading.taxForm ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-info" />
                      </div>
                    ) : pdfUrls.taxForm ? (
                      <iframe
                        src={pdfUrls.taxForm}
                        className="w-full h-full border-0"
                            title="IRS Tax Form PDF"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>PDF not available</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
                </Tabs>

                {/* Matched Programs - Right after PDFs */}
                <div className="mt-8 pt-6 border-t border-primary/10">
                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/30 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-lg">
                          Matched Programs for You
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Based on your background and information provided
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {/* DollarFor - Always matched */}
                      <div className="p-4 bg-white/50 rounded-lg border border-accent/20">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">💙</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-foreground mb-1">DollarFor.org</h5>
                            <p className="text-xs text-muted-foreground mb-2">
                              Free help paying medical bills nationwide
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">Match reason:</span> Available to all users, helps with hospital charity care applications
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* UNC Health - If in NC */}
                      {demographics.state && demographics.state.toLowerCase().includes('north carolina') && (
                        <div className="p-4 bg-white/50 rounded-lg border border-accent/20">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">🏥</span>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-foreground mb-1">UNC Health Financial Assistance</h5>
                              <p className="text-xs text-muted-foreground mb-2">
                                Financial assistance for NC residents
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Match reason:</span> You're a North Carolina resident
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Atrium Health - If in Charlotte area or low income */}
                      {(demographics.city?.toLowerCase().includes('charlotte') || 
                        (demographics.income && parseInt(demographics.income) < 50000)) && (
                        <div className="p-4 bg-white/50 rounded-lg border border-accent/20">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">🏥</span>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-foreground mb-1">Atrium Health Financial Assistance</h5>
                              <p className="text-xs text-muted-foreground mb-2">
                                Charlotte area hospital financial assistance
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Match reason:</span> {demographics.city?.toLowerCase().includes('charlotte') ? 'Located in Charlotte area' : 'Income-based eligibility'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* NC State Medical Debt Relief - If in NC */}
                      {demographics.state && demographics.state.toLowerCase().includes('north carolina') && (
                        <div className="p-4 bg-white/50 rounded-lg border border-accent/20">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">🏛️</span>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-foreground mb-1">NC Medical Debt Relief Initiative</h5>
                              <p className="text-xs text-muted-foreground mb-2">
                                State-wide charity care program
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Match reason:</span> North Carolina state program for all residents
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Novant Health - If low income */}
                      {demographics.income && parseInt(demographics.income) < 60000 && (
                        <div className="p-4 bg-white/50 rounded-lg border border-accent/20">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-lg">🏥</span>
                            </div>
                      <div className="flex-1">
                              <h5 className="font-semibold text-foreground mb-1">Novant Health Financial Assistance</h5>
                              <p className="text-xs text-muted-foreground mb-2">
                                Charity care program with sliding scale
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Match reason:</span> Income-based eligibility for financial assistance
                        </p>
                      </div>
                    </div>
                  </div>
                      )}
                  </div>

                    <div className="mt-4 pt-4 border-t border-accent/20">
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        These programs were matched based on your location, income, and other information you provided.
                      </p>
                      <Button
                        onClick={() => navigate("/resources")}
                        className="w-full bg-gradient-accent hover:shadow-lg hover:scale-105 transition-all"
                      >
                        <span className="mr-2">💙</span>
                        View All Matched Resources & Apply
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Next Steps - At the end */}
                <div className="mt-6 pt-6 border-t border-primary/10">
              <div className="bg-gradient-to-br from-success/10 to-success-glow/10 border-2 border-success/30 rounded-xl p-6 shadow-lg">
                <h4 className="font-bold text-foreground mb-3 text-lg flex items-center">
                  <span className="mr-2">📝</span> Next Steps
                </h4>
                <ul className="text-sm text-muted-foreground space-y-3">
                  <li className="flex items-start">
                    <span className="mr-2 text-success">✓</span>
                    <span>Download all relevant forms</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-success">✓</span>
                    <span>Review the information for accuracy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-success">✓</span>
                    <span>Submit the forms to your insurance provider</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-success">✓</span>
                    <span>Keep copies for your records</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Results;
