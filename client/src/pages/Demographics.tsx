import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import { ArrowRight } from "lucide-react";
import { US_STATES } from "@/utils/states";
import { apiUrl } from "@/config/api";

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
];

const Demographics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    incomeBracket: "",
    income: "",
    insuranceProvider: "",
    policyNumber: "",
    memberIdNumber: "",
    groupNumber: "",
    dependentsCount: "",
    preferredLanguage: "English",
    hospitalName: "",
    hospitalAddress: "",
    hospitalCity: "",
    hospitalState: "",
    hospitalZipCode: "",
    providerTaxId: "",
    npi: "",
    providerPhoneNumber: "",
  });
  
  // Load saved form data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem("demographics");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed);
      } catch (error) {
        console.error("Error loading saved demographics:", error);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Transform data to match backend format
      const apiData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone_number: formData.phone,
        date_of_birth: formData.dob,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        income_bracket: formData.incomeBracket,
        income: parseFloat(formData.income) || 0,
        insurance_provider: formData.insuranceProvider,
        policy_number: formData.policyNumber,
        member_id_number: formData.memberIdNumber,
        group_number: formData.groupNumber,
        dependents_count: parseInt(formData.dependentsCount) || 0,
        preferred_language: formData.preferredLanguage,
        consent_to_AI_processing: true,
        hospital_name: formData.hospitalName,
        hospital_address: formData.hospitalAddress,
        hospital_city: formData.hospitalCity,
        hospital_state: formData.hospitalState,
        hospital_zip_code: formData.hospitalZipCode,
        provider_tax_id: formData.providerTaxId,
        npi: formData.npi,
        provider_phone_number: formData.providerPhoneNumber,
      };

      const response = await fetch(apiUrl('api/demographics'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error('Failed to save demographics');
      }

      // Also store in localStorage for backward compatibility
      localStorage.setItem("demographics", JSON.stringify(formData));
      
      toast({
        title: "Information saved",
        description: "Proceeding to bill upload",
      });
      
      navigate("/upload-bill");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save demographics",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-accent/5" />
      <div className="max-w-4xl mx-auto relative z-10">
        <ProgressSteps 
          currentStep={1} 
          steps={steps}
          onStepClick={(stepNumber) => {
            // Save current form data before navigating
            localStorage.setItem("demographics", JSON.stringify(formData));
            // Step 1 is current page, no navigation needed
          }}
        />
        
        <Card className="shadow-2xl border-primary/10 animate-fade-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Personal Information
            </CardTitle>
            <CardDescription className="text-base">
              Please provide your demographic and incident details 📋
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      required
                      value={formData.dob}
                      onChange={(e) => updateField("dob", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => updateField("gender", value)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      required
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Select value={formData.state} onValueChange={(value) => updateField("state", value)}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code *</Label>
                    <Input
                      id="zipCode"
                      required
                      value={formData.zipCode}
                      onChange={(e) => updateField("zipCode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incomeBracket">Income Bracket *</Label>
                    <Select value={formData.incomeBracket} onValueChange={(value) => updateField("incomeBracket", value)}>
                      <SelectTrigger id="incomeBracket">
                        <SelectValue placeholder="Select income bracket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<$25k">Less than $25,000</SelectItem>
                        <SelectItem value="$25k-$50k">$25,000 - $50,000</SelectItem>
                        <SelectItem value="$50k-$75k">$50,000 - $75,000</SelectItem>
                        <SelectItem value="$75k+">More than $75,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="income">Annual Income ($) *</Label>
                    <Input
                      id="income"
                      type="number"
                      min="0"
                      step="1000"
                      required
                      value={formData.income}
                      onChange={(e) => updateField("income", e.target.value)}
                      placeholder="e.g., 32000"
                    />
                  </div>
                </div>
              </div>

              {/* Insurance Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground">Insurance Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceProvider">Insurance Provider *</Label>
                    <Input
                      id="insuranceProvider"
                      required
                      value={formData.insuranceProvider}
                      onChange={(e) => updateField("insuranceProvider", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policyNumber">Policy Number *</Label>
                    <Input
                      id="policyNumber"
                      required
                      value={formData.policyNumber}
                      onChange={(e) => updateField("policyNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberIdNumber">Member ID Number *</Label>
                    <Input
                      id="memberIdNumber"
                      required
                      value={formData.memberIdNumber}
                      onChange={(e) => updateField("memberIdNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupNumber">Group Number *</Label>
                    <Input
                      id="groupNumber"
                      required
                      value={formData.groupNumber}
                      onChange={(e) => updateField("groupNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dependentsCount">Number of Dependents</Label>
                    <Input
                      id="dependentsCount"
                      type="number"
                      min="0"
                      value={formData.dependentsCount}
                      onChange={(e) => updateField("dependentsCount", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Hospital Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-foreground">Hospital/Provider Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hospitalName">Hospital/Provider Name *</Label>
                    <Input
                      id="hospitalName"
                      required
                      value={formData.hospitalName}
                      onChange={(e) => updateField("hospitalName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hospitalAddress">Hospital/Provider Street Address *</Label>
                    <Input
                      id="hospitalAddress"
                      required
                      value={formData.hospitalAddress}
                      onChange={(e) => updateField("hospitalAddress", e.target.value)}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalCity">Hospital City *</Label>
                    <Input
                      id="hospitalCity"
                      required
                      value={formData.hospitalCity}
                      onChange={(e) => updateField("hospitalCity", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalState">Hospital State *</Label>
                    <Select value={formData.hospitalState} onValueChange={(value) => updateField("hospitalState", value)}>
                      <SelectTrigger id="hospitalState">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalZipCode">Hospital ZIP Code *</Label>
                    <Input
                      id="hospitalZipCode"
                      required
                      value={formData.hospitalZipCode}
                      onChange={(e) => updateField("hospitalZipCode", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="providerTaxId">Provider Tax ID *</Label>
                    <Input
                      id="providerTaxId"
                      required
                      value={formData.providerTaxId}
                      onChange={(e) => updateField("providerTaxId", e.target.value)}
                      placeholder="e.g., 1213131"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="npi">NPI (National Provider Identifier) *</Label>
                    <Input
                      id="npi"
                      required
                      value={formData.npi}
                      onChange={(e) => updateField("npi", e.target.value)}
                      placeholder="e.g., 21213331312"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="providerPhoneNumber">Provider Phone Number *</Label>
                    <Input
                      id="providerPhoneNumber"
                      type="tel"
                      required
                      value={formData.providerPhoneNumber}
                      onChange={(e) => updateField("providerPhoneNumber", e.target.value)}
                      placeholder="e.g., 6739870822"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isSubmitting}
                  className="min-w-[200px] bg-gradient-primary hover:shadow-lg hover:scale-[1.02] transition-all group"
                >
                  {isSubmitting ? "Saving..." : "Continue"}
                  {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Demographics;
