import { FileCheck, DollarSign, Receipt, Zap, Shield, Headphones } from "lucide-react";

const features = [
  {
    icon: FileCheck,
    title: "Auto-Fill Claim Forms",
    description: "Our AI automatically extracts information from your bills and documents, then fills out all claim forms for you. No manual data entry required.",
  },
  {
    icon: DollarSign,
    title: "Income Waiver Assistance",
    description: "Get help applying for low-income fee waivers. We guide you through the process and prepare all necessary documentation.",
  },
  {
    icon: Receipt,
    title: "Tax Filing Support",
    description: "Automatically generate tax deduction forms for your medical expenses. Make tax season easier with pre-filled documentation.",
  },
  {
    icon: Zap,
    title: "Lightning Fast Processing",
    description: "Complete your entire claim process in minutes. Upload documents, get forms generated, and download everything instantly.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is encrypted and protected. We follow HIPAA compliance standards and keep all information confidential.",
  },
  {
    icon: Headphones,
    title: "Program Matching",
    description: "Get matched with financial assistance programs, charities, and NGOs based on your background and needs. We help you find the right resources.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Why Choose TrueClaim.AI?
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
            Everything you need to file insurance claims quickly and successfully, from forms to waivers to taxes.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-700 leading-relaxed font-medium">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
