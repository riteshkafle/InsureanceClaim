import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProgressSteps from "@/components/ProgressSteps";
import { ExternalLink, Phone, Mail, MapPin, ArrowLeft, Heart, Building2, Map } from "lucide-react";

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
  { number: 7, title: "Resources", description: "Get help" },
];

const Resources = () => {
  const navigate = useNavigate();

  const handleStepClick = (stepNumber: number) => {
    const routes: { [key: number]: string } = {
      1: "/demographics",
      2: "/upload-bill",
      3: "/upload-policy",
      4: "/denial-check",
      5: "/income-waiver",
      6: "/results",
      7: "/resources",
    };
    
    if (routes[stepNumber]) {
      navigate(routes[stepNumber]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-accent/5 via-transparent to-primary/5" />
      <div className="max-w-6xl mx-auto relative z-10">
        <ProgressSteps currentStep={7} steps={steps} onStepClick={handleStepClick} />
        
        <div className="mb-8 text-center animate-fade-up">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-accent to-accent/80 rounded-full mb-4 shadow-2xl animate-scale-in relative">
            <Heart className="w-12 h-12 text-accent-foreground animate-bounce-subtle" />
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
            Matched Resources for You 💙
          </h1>
          <p className="text-muted-foreground text-lg">
            Programs and financial assistance matched to your specific needs and background
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* DollarFor.org - Universal Resource */}
          <Card className="shadow-2xl border-primary/10 animate-fade-up hover:shadow-3xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">DollarFor.org</CardTitle>
                  <CardDescription>Free Help Paying Medical Bills</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                DollarFor helps patients across the United States get their medical bills forgiven through hospital charity care programs. Available in many states, not just North Carolina.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  How It Works
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• Free service to help you apply for charity care</li>
                  <li>• Works with hospitals nationwide</li>
                  <li>• No income verification required upfront</li>
                  <li>• Helps you navigate the application process</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-primary/10">
                <Button
                  onClick={() => window.open("https://dollarfor.org/help/?aid=seo&sid1=help-paying-medical-bills", "_blank")}
                  className="w-full bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get Help with DollarFor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* UNC Health Financial Assistance Card */}
          <Card className="shadow-2xl border-primary/10 animate-fade-up hover:shadow-3xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">UNC Health Financial Assistance</CardTitle>
                  <CardDescription>Financial Assistance Program</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                UNC Health's Financial Assistance Program helps relieve the financial burden of medically necessary healthcare services at participating UNC Health entities.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary" />
                  Eligibility
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• North Carolina residents</li>
                  <li>• Household income at or below 300% of Federal Poverty Guidelines</li>
                  <li>• Discounts: 100% (200% FPG), 75% (250% FPG), 50% (300% FPG)</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Contact Information
                </h4>
                <div className="text-sm text-muted-foreground space-y-1 ml-6">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <a href="tel:8667045286" className="text-primary hover:underline">
                      866-704-5286 (toll-free)
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <a href="tel:9849743425" className="text-primary hover:underline">
                      984-974-3425 (local)
                    </a>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>101 Manning Drive, Chapel Hill, NC 27514</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-primary/10">
                <Button
                  onClick={() => window.open("https://www.unchealth.org/records-insurance/financial-assistance-programs", "_blank")}
                  className="w-full bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit UNC Health Website
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Atrium Health Financial Assistance Card */}
          <Card className="shadow-2xl border-accent/10 animate-fade-up hover:shadow-3xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Atrium Health Financial Assistance</CardTitle>
                  <CardDescription>Charlotte Area Hospital System</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Atrium Health offers a Financial Assistance Program for North Carolina residents in the Charlotte area, providing free or discounted care based on income thresholds.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-accent" />
                  Eligibility Example (Family of 4)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• $32,150 = Federal Poverty Level (FPL)</li>
                  <li>• $96,450 = Income threshold for 100% discount</li>
                  <li>• Sliding scale discounts based on income relative to FPL</li>
                  <li>• North Carolina residents only</li>
                </ul>
              </div>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Income thresholds vary by family size. Contact Atrium Health for specific eligibility requirements.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Novant Health Financial Assistance Card */}
          <Card className="shadow-2xl border-info/10 animate-fade-up hover:shadow-3xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-info to-info/80 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-info-foreground" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Novant Health Financial Assistance</CardTitle>
                  <CardDescription>Charity Care Program</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Novant Health provides financial assistance for medically necessary services, with discounts based on a sliding scale relative to Federal Poverty Level (FPL).
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4 text-info" />
                  Application Requirements
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• Income documentation</li>
                  <li>• Proof of residency</li>
                  <li>• Uninsured or underinsured status</li>
                  <li>• Covers "medically necessary" services</li>
                </ul>
              </div>

              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Contact Novant Health directly to learn about their specific income thresholds and application process.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NC State Medical Debt Relief Initiative */}
        <Card className="shadow-2xl border-success/10 animate-fade-up mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-success to-success/80 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">North Carolina Medical Debt Relief Initiative</CardTitle>
                <CardDescription>State-Wide Charity Care Program</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hospitals across North Carolina are participating in a state medical debt relief initiative that requires them to adopt charity care policies and relieve debt for low- and middle-income patients.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-success" />
                  What This Means
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All NC hospitals must have charity care policies</li>
                  <li>• Debt relief for eligible low/middle-income patients</li>
                  <li>• State-wide program, not hospital-specific</li>
                </ul>
              </div>

              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-success" />
                  Who Qualifies
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Low- and middle-income patients</li>
                  <li>• Must meet hospital-specific criteria</li>
                  <li>• Applies to medical debt at participating hospitals</li>
                </ul>
              </div>
            </div>

            <div className="bg-info/10 border border-info/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Important:</strong> Contact your hospital's financial assistance office to learn about their specific charity care policy and eligibility requirements under this state initiative.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Google Map Section */}
        <Card className="shadow-2xl border-primary/10 animate-fade-up mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-info to-info/80 rounded-xl flex items-center justify-center">
                <Map className="w-6 h-6 text-info-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Local Resources Map</CardTitle>
                <CardDescription>Find low-income resources and services in your area</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-primary/20 rounded-xl overflow-hidden">
              <div className="h-[600px] bg-muted/30">
                <iframe
                  src="https://www.google.com/maps/d/embed?mid=1uoGaPQrF2rT1R8kL_25uujzqu-l5z5I&femb=1"
                  className="w-full h-full border-0"
                  title="Local Resources Map"
                  allowFullScreen
                />
              </div>
            </div>
            <div className="mt-4 p-4 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                This interactive map shows various low-income resources and services available in your area. 
                Use the map controls to explore different locations and services.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Health Insurance Marketplace Info */}
        <Card className="shadow-2xl border-info/10 animate-fade-up mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Phone className="w-5 h-5 text-info" />
              Health Insurance Marketplace
            </CardTitle>
            <CardDescription>Open Enrollment Information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-3">
                The Health Insurance Marketplace open enrollment ends on <strong className="text-foreground">January 15, 2025</strong>.
              </p>
              <Button
                onClick={() => window.open("tel:18003182596", "_blank")}
                variant="outline"
                className="w-full sm:w-auto bg-info/20 hover:bg-info/30 border-info/30"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact Marketplace: 1-800-318-2596
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6">
          <Button
            variant="outline"
            onClick={() => navigate("/results")}
            className="hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
          <Button
            onClick={() => navigate("/home")}
            className="bg-gradient-primary hover:shadow-lg hover:scale-105 transition-all"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Resources;

