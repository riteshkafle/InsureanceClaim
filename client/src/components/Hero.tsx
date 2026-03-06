import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="pt-32 pb-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-block">
              <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                AI-Powered Claims Platform
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
              File Claims in <span className="text-primary">Minutes</span>, Not Days
            </h1>
            
            <p className="text-xl text-gray-700 leading-relaxed max-w-xl font-medium">
              AI-powered platform that auto-fills claim forms, helps you get income waivers, 
              prepares tax deduction documents, and <span className="text-primary font-semibold">matches you with financial assistance programs</span> based on your background. Complete your entire claim process in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow text-lg px-8"
                onClick={() => navigate("/demographics")}
              >
                Start Your Claim <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-2">
                <Play className="mr-2 w-5 h-5" /> Watch Demo
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 flex-wrap">
              <div>
                <div className="text-3xl font-bold text-gray-900">41%</div>
                <div className="text-sm text-gray-600 font-medium">Insurance Denial Rate</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div>
                <div className="text-3xl font-bold text-gray-900">1.5%</div>
                <div className="text-sm text-gray-600 font-medium">Increase (2023-2024)</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">$220B</div>
                <div className="text-sm text-gray-600 font-medium">Medical Debt in U.S.</div>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>

            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-10 to-blue-10 rounded-3xl"></div>
            <img 
              src="/people3.jpg" 
              alt="Insurance claim documents" 
              className="relative rounded-3xl shadow-glow w-full object-cover h-[500px] bg-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

