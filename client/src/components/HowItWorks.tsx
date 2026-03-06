import { User, Upload, FileText, History, DollarSign, FileCheck } from "lucide-react";

const steps = [
  {
    icon: User,
    title: "Enter Demographics",
    description: "Provide your personal information, insurance details, and hospital information. Our secure form guides you through every field.",
    stepNumber: "01",
  },
  {
    icon: Upload,
    title: "Upload Medical Bill",
    description: "Upload a photo of your medical bill. Our AI uses OCR to automatically extract charges, dates, and service details.",
    stepNumber: "02",
  },
  {
    icon: FileText,
    title: "Upload Insurance Policy",
    description: "Upload your insurance policy document. We extract key information to ensure your claim matches your coverage.",
    stepNumber: "03",
  },
  {
    icon: History,
    title: "Claim History",
    description: "Tell us about any prior claim denials. Upload denial letters if you have them to strengthen your appeal.",
    stepNumber: "04",
  },
  {
    icon: DollarSign,
    title: "Income Waiver Check",
    description: "Apply for low-income fee waivers if eligible. Upload income verification documents and we'll prepare your waiver request.",
    stepNumber: "05",
  },
  {
    icon: FileCheck,
    title: "Get Your Documents",
    description: "Download your auto-filled claim form, waiver letter (if applicable), and tax deduction form. Everything ready to submit!",
    stepNumber: "06",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            How It Works
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
            Six simple steps to complete your insurance claim, get waivers, prepare tax documents, and get matched with financial assistance programs.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="text-center space-y-6 bg-card p-6 rounded-2xl border border-border hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-full shadow-glow">
                  <step.icon className="w-10 h-10 text-primary-foreground" />
                </div>
                
                <div className="space-y-3">
                  <div className="text-4xl font-bold text-primary/20">{step.stepNumber}</div>
                  <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                  <p className="text-gray-700 leading-relaxed text-sm font-medium">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
