import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface ProgressStepsProps {
  currentStep: number;
  steps: Step[];
  onStepClick?: (stepNumber: number) => void;
}

const ProgressSteps = ({ currentStep, steps, onStepClick }: ProgressStepsProps) => {
  return (
    <div className="w-full py-8 animate-fade-in">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gradient-to-r from-border via-border to-border rounded-full -z-10 overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-700 ease-out shadow-lg relative"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isClickable = isCompleted && onStepClick;

          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div
                onClick={() => isClickable && onStepClick(step.number)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-500 border-2 bg-background relative",
                  isCompleted && "bg-gradient-primary border-primary text-primary-foreground shadow-lg scale-105",
                  isCurrent && "border-primary text-primary scale-125 shadow-xl animate-glow",
                  !isCompleted && !isCurrent && "border-border text-muted-foreground hover:scale-105 hover:border-primary/50",
                  isClickable && "cursor-pointer hover:scale-110 hover:shadow-xl"
                )}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6 animate-scale-in" />
                ) : (
                  <span className={isCurrent ? "animate-bounce-subtle" : ""}>{step.number}</span>
                )}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                )}
              </div>
              <div 
                className={cn(
                  "mt-3 text-center max-w-[120px]",
                  isClickable && "cursor-pointer"
                )}
                onClick={() => isClickable && onStepClick(step.number)}
              >
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCurrent && "text-primary",
                    isCompleted && "text-primary/80",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSteps;
