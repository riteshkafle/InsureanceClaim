import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import ProgressSteps from "@/components/ProgressSteps";
import { ArrowRight, Upload, X, FileImage, Loader2, Mic, MicOff, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiUrl } from "@/config/api";

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

const steps = [
  { number: 1, title: "Demographics", description: "Personal info" },
  { number: 2, title: "Bill Upload", description: "Upload bill image" },
  { number: 3, title: "Documents", description: "Upload policy" },
  { number: 4, title: "History", description: "Prior claims" },
  { number: 5, title: "Income", description: "Waiver check" },
  { number: 6, title: "Results", description: "View forms" },
];

// ============================================================================
// HARD-CODED OCR RESULTS - NORWOOD HOSPITAL BILL
// ============================================================================
// To adjust bounding box positions, modify the 'box' property for each item.
// Coordinates are percentages (0.0 to 1.0) of image dimensions:
//   - x: horizontal position (0 = left edge, 1 = right edge)
//   - y: vertical position (0 = top edge, 1 = bottom edge)
//   - width: box width as percentage of image width
//   - height: box height as percentage of image height
// ============================================================================
const hardcodedOCRResults = [
  {
    id: 1,
    label: "Service Date",
    value: "05/10/2010",
    box: { x: 0.15, y: 0.08, width: 0.2, height: 0.04 }, // Adjust these values to position the box
    description: "Date when the patient received medical care"
  },
  {
    id: 2,
    label: "CAT Scan Body",
    value: "$2,752.00",
    box: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
    description: "CT (Computed Tomography) scan of the body. Imaging test used to detect internal injuries, tumors, or abnormalities. Often the largest charge due to equipment and radiologist interpretation costs."
  },
  {
    id: 3,
    label: "Drug Spec ID Detail Coding",
    value: "$474.00",
    box: { x: 0.1, y: 0.28, width: 0.35, height: 0.05 },
    description: "Laboratory testing and identification of specific drugs or chemical substances in the patient's system. Usually performed in cases involving possible poisoning, overdose, or for verifying medication levels."
  },
  {
    id: 4,
    label: "Emergency Room General",
    value: "$623.00",
    box: { x: 0.1, y: 0.36, width: 0.35, height: 0.05 },
    description: "Base charge for using the ER, including physician evaluation, nursing services, and basic supplies. Does not include specialized procedures or tests (like CT scans or lab work) — those are billed separately."
  },
  {
    id: 5,
    label: "Laboratory General",
    value: "$446.00",
    box: { x: 0.1, y: 0.44, width: 0.3, height: 0.05 },
    description: "Standard lab tests such as blood work, urinalysis, or chemistry panels. Used to check overall health and assist in diagnosis."
  },
  {
    id: 6,
    label: "M/S Supply Sterile Supply",
    value: "$89.00",
    box: { x: 0.1, y: 0.52, width: 0.35, height: 0.05 },
    description: "Medical/surgical sterile supplies used during treatment. Could include syringes, gloves, bandages, or other sterile items used during care."
  },
  {
    id: 7,
    label: "Total Charges",
    value: "$4,384.00",
    box: { x: 0.6, y: 0.6, width: 0.25, height: 0.05 },
    description: "Sum of all services provided before any discounts or insurance payments."
  },
  {
    id: 8,
    label: "Insurance Discounts",
    value: "-$476.10",
    box: { x: 0.6, y: 0.68, width: 0.25, height: 0.05 },
    description: "Negotiated discount between the hospital and the patient's insurance company — the amount the hospital agrees not to charge."
  },
  {
    id: 9,
    label: "Insurance Payments",
    value: "-$1,973.96",
    box: { x: 0.6, y: 0.76, width: 0.25, height: 0.05 },
    description: "Amount the insurance company actually paid on behalf of the patient."
  },
  {
    id: 10,
    label: "Total Payments & Adjustments",
    value: "-$2,450.06",
    box: { x: 0.6, y: 0.84, width: 0.3, height: 0.05 },
    description: "Combined total of discounts and insurance payments applied to the bill."
  },
  {
    id: 11,
    label: "Account Balance",
    value: "$1,933.94",
    box: { x: 0.6, y: 0.92, width: 0.25, height: 0.05 },
    description: "Remaining amount owed by the patient after all insurance and discounts have been applied."
  },
];

const UploadBill = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentReport, setIncidentReport] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Voice input states
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const lastInterimTextRef = useRef<string>("");
  const processedFinalTextsRef = useRef<Set<string>>(new Set());
  
  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedDescription = localStorage.getItem("billDescription");
    if (savedDescription) {
      setDescription(savedDescription);
    }
    const savedIncidentDate = localStorage.getItem("incidentDate");
    if (savedIncidentDate) {
      setIncidentDate(savedIncidentDate);
    }
    const savedIncidentReport = localStorage.getItem("incidentReport");
    if (savedIncidentReport) {
      setIncidentReport(savedIncidentReport);
    }
  }, []);
  
  // Save description to localStorage whenever it changes
  useEffect(() => {
    if (description) {
      localStorage.setItem("billDescription", description);
    }
  }, [description]);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = selectedLanguage;
      
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        setDescription(prev => {
          let updatedText = prev;
          let hasNewFinal = false;
          
          // Process all results from the event
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            const isFinal = result.isFinal;
            
            if (isFinal) {
              // For final results, create a unique key for this result
              const resultKey = `${i}-${transcript.trim()}`;
              
              // Check if we've already processed this exact result
              if (!processedFinalTextsRef.current.has(resultKey)) {
                hasNewFinal = true;
                // Remove any interim text that might have been added
                if (lastInterimTextRef.current) {
                  updatedText = updatedText.replace(lastInterimTextRef.current, "").trim();
                  lastInterimTextRef.current = "";
                }
                // Add the final transcript
                const trimmedTranscript = transcript.trim();
                if (trimmedTranscript) {
                  updatedText = updatedText ? `${updatedText} ${trimmedTranscript}` : trimmedTranscript;
                  processedFinalTextsRef.current.add(resultKey);
                }
              }
            } else {
              // For interim results, replace the previous interim text
              if (lastInterimTextRef.current) {
                updatedText = updatedText.replace(lastInterimTextRef.current, "").trim();
              }
              // Add new interim text (only if we don't have a new final result)
              if (transcript && !hasNewFinal) {
                updatedText = updatedText ? `${updatedText} ${transcript}` : transcript;
                lastInterimTextRef.current = transcript;
              }
            }
          }
          
          return updatedText;
        });
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast({
            title: "Microphone permission denied",
            description: "Please allow microphone access to use voice input",
            variant: "destructive",
          });
        }
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, [selectedLanguage, toast]);
  
  const startListening = () => {
    if (recognition) {
      try {
        // Reset tracking when starting new session
        processedFinalTextsRef.current.clear();
        lastInterimTextRef.current = "";
        recognition.start();
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak to describe what happened",
        });
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    } else {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support speech recognition",
        variant: "destructive",
      });
    }
  };
  
  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
      toast({
        title: "Stopped listening",
        description: "Voice input stopped",
      });
    }
  };
  
  const handleStepClick = (stepNumber: number) => {
    // Save current state before navigating
    if (description) {
      localStorage.setItem("billDescription", description);
    }
    if (file) {
      localStorage.setItem("billFile", file.name);
    }
    
    const routes: { [key: number]: string } = {
      1: "/demographics",
      2: "/upload-bill",
    };
    
    if (routes[stepNumber]) {
      navigate(routes[stepNumber]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type.startsWith("image/"))) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);
      setShowOCR(false);
      setIsProcessing(true);
      
      // Simulate OCR processing - show results after 2 seconds
      setTimeout(() => {
        setShowOCR(true);
        setIsProcessing(false);
        toast({
          title: "Bill processed",
          description: "Information extracted from your bill",
        });
      }, 2000);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
      const url = URL.createObjectURL(droppedFile);
      setImageUrl(url);
      setShowOCR(false);
      setIsProcessing(true);
      
      setTimeout(() => {
        setShowOCR(true);
        setIsProcessing(false);
        toast({
          title: "Bill processed",
          description: "Information extracted from your bill",
        });
      }, 2000);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
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

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  };

  const handleSubmit = async () => {
    // Incident date and description are required
    if (!incidentDate) {
      toast({
        title: "Incident date required",
        description: "Please provide the date of the incident",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what happened",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload bill file if available
      if (file) {
        const formData = new FormData();
        formData.append('bill', file);

        const uploadResponse = await fetch(apiUrl('api/upload-bill'), {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload bill');
        }
      }

      // Send incident information to backend
      const incidentData = {
        incident_date: incidentDate,
        description_of_what_happened: description,
        incident_report: incidentReport || '',
      };

      const incidentResponse = await fetch(apiUrl('api/incident-info'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });

      if (!incidentResponse.ok) {
        throw new Error('Failed to save incident information');
      }

      // Store bill info
      if (file) {
        localStorage.setItem("billFile", file.name);
      }
      localStorage.setItem("billDescription", description);
      localStorage.setItem("incidentDate", incidentDate);
      localStorage.setItem("incidentReport", incidentReport);
      
      toast({
        title: "Information saved",
        description: "Proceeding to policy upload",
      });
      
      navigate("/upload-policy");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save bill information",
        variant: "destructive",
      });
    }
  };

  const getBoxStyle = (box: { x: number; y: number; width: number; height: number }) => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) return {};
    
    return {
      position: "absolute" as const,
      left: `${box.x * 100}%`,
      top: `${box.y * 100}%`,
      width: `${box.width * 100}%`,
      height: `${box.height * 100}%`,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-8 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-secondary/5 via-transparent to-primary/5" />
      <div className="max-w-6xl mx-auto relative z-10">
        <ProgressSteps currentStep={2} steps={steps} onStepClick={handleStepClick} />
        
        <Card className="shadow-2xl border-primary/10 animate-fade-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary" />
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Upload Medical Bill
            </CardTitle>
            <CardDescription className="text-base">
              Upload an image of your medical bill and describe what happened 📄
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!imageUrl ? (
              <div className="space-y-4">
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
                  <div className="space-y-4">
                    <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg animate-bounce-subtle">
                      <Upload className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-foreground">
                        Drop your bill image here or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Supported formats: JPG, PNG, PDF (as image)
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Optional - You can skip this step and continue
                      </p>
                    </div>
                    <label htmlFor="bill-upload">
                      <Button type="button" variant="outline" className="cursor-pointer" asChild>
                        <span>Select Image</span>
                      </Button>
                    </label>
                    <input
                      id="bill-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
                
                {/* Incident Information */}
                <div className="space-y-4 border-t border-primary/10 pt-6">
                  <h3 className="font-semibold text-lg text-foreground">Incident Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incidentDate">Incident Date *</Label>
                      <Input
                        id="incidentDate"
                        type="date"
                        required
                        value={incidentDate}
                        onChange={(e) => setIncidentDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Description section when no image */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description-no-image">Description of What Happened *</Label>
                    <div className="flex items-center gap-2">
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <Globe className="w-3 h-3 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English</SelectItem>
                          <SelectItem value="es-ES">Español</SelectItem>
                          <SelectItem value="fr-FR">Français</SelectItem>
                          <SelectItem value="de-DE">Deutsch</SelectItem>
                          <SelectItem value="zh-CN">中文</SelectItem>
                          <SelectItem value="ar-SA">العربية</SelectItem>
                          <SelectItem value="hi-IN">हिन्दी</SelectItem>
                          <SelectItem value="pt-BR">Português</SelectItem>
                          <SelectItem value="ru-RU">Русский</SelectItem>
                          <SelectItem value="ja-JP">日本語</SelectItem>
                        </SelectContent>
                      </Select>
                      {!isListening ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startListening}
                          className="h-8"
                        >
                          <Mic className="w-4 h-4 mr-1" />
                          Voice
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={stopListening}
                          className="h-8"
                        >
                          <MicOff className="w-4 h-4 mr-1" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    id="description-no-image"
                    rows={6}
                    placeholder="Please describe the incident, medical services received, and any relevant details... Or use the voice button to speak in your preferred language."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none"
                  />
                  {isListening && (
                    <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                      <Mic className="w-4 h-4" />
                      <span>Listening... Speak now</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This information will be used to complete your claim form. You can type or use voice input in multiple languages.
                  </p>
                </div>

                {/* Incident Report */}
                <div className="space-y-2">
                  <Label htmlFor="incidentReport">Incident Report / Billing Details</Label>
                  <Textarea
                    id="incidentReport"
                    rows={4}
                    value={incidentReport}
                    onChange={(e) => setIncidentReport(e.target.value)}
                    placeholder="Additional billing information, itemized charges, procedure codes, or any other relevant billing details..."
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Add any additional billing details, procedure codes, or itemized charges.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image with OCR highlights */}
                <div className="space-y-4">
                  <div className="relative border-2 border-primary/20 rounded-xl overflow-hidden bg-muted/30">
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <div className="text-center text-white">
                          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Processing bill...</p>
                        </div>
                      </div>
                    )}
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="Medical bill"
                      className="w-full h-auto"
                      onLoad={handleImageLoad}
                    />
                    {showOCR && imageDimensions.width > 0 && (
                      <div className="absolute inset-0">
                        {hardcodedOCRResults.map((result) => (
                          <div
                            key={result.id}
                            className={`absolute border-2 rounded transition-all cursor-pointer ${
                              selectedBox === result.id
                                ? "border-primary bg-primary/20 shadow-lg scale-105"
                                : "border-yellow-400 bg-yellow-400/10 hover:border-yellow-300 hover:bg-yellow-400/15"
                            }`}
                            style={getBoxStyle(result.box)}
                            onClick={() => setSelectedBox(selectedBox === result.id ? null : result.id)}
                          >
                            <div className="absolute -top-6 left-0 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded">
                              {result.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {file && (
                      <div className="absolute top-2 right-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            setImageUrl(null);
                            setShowOCR(false);
                            setSelectedBox(null);
                            setDescription("");
                            if (imageUrl) URL.revokeObjectURL(imageUrl);
                          }}
                          className="bg-background/80 backdrop-blur-sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* OCR Results and Description */}
                <div className="space-y-4">
                  {showOCR && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg text-foreground flex items-center">
                        <FileImage className="w-5 h-5 mr-2 text-primary" />
                        Extracted Information
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {hardcodedOCRResults.map((result) => (
                          <div
                            key={result.id}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              selectedBox === result.id
                                ? "border-primary bg-primary/10 shadow-md"
                                : "border-border hover:border-primary/50 bg-card"
                            }`}
                            onClick={() => setSelectedBox(selectedBox === result.id ? null : result.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-foreground">{result.label}</p>
                                <p className="text-sm font-medium text-primary mt-1">{result.value}</p>
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                  {result.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Incident Information */}
                  <div className="space-y-4 border-t border-primary/10 pt-4">
                    <h3 className="font-semibold text-lg text-foreground">Incident Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="incidentDate-image">Incident Date *</Label>
                        <Input
                          id="incidentDate-image"
                          type="date"
                          required
                          value={incidentDate}
                          onChange={(e) => setIncidentDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description of What Happened *</Label>
                      <div className="flex items-center gap-2">
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en-US">English</SelectItem>
                            <SelectItem value="es-ES">Español</SelectItem>
                            <SelectItem value="fr-FR">Français</SelectItem>
                            <SelectItem value="de-DE">Deutsch</SelectItem>
                            <SelectItem value="zh-CN">中文</SelectItem>
                            <SelectItem value="ar-SA">العربية</SelectItem>
                            <SelectItem value="hi-IN">हिन्दी</SelectItem>
                            <SelectItem value="pt-BR">Português</SelectItem>
                            <SelectItem value="ru-RU">Русский</SelectItem>
                            <SelectItem value="ja-JP">日本語</SelectItem>
                          </SelectContent>
                        </Select>
                        {!isListening ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={startListening}
                            className="h-8"
                          >
                            <Mic className="w-4 h-4 mr-1" />
                            Voice
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={stopListening}
                            className="h-8"
                          >
                            <MicOff className="w-4 h-4 mr-1" />
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea
                      id="description"
                      rows={6}
                      placeholder="Please describe the incident, medical services received, and any relevant details... Or use the voice button to speak in your preferred language."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none"
                    />
                    {isListening && (
                      <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                        <Mic className="w-4 h-4" />
                        <span>Listening... Speak now</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This information will be used to complete your claim form. You can type or use voice input in multiple languages.
                    </p>
                  </div>

                  {/* Incident Report */}
                  <div className="space-y-2">
                    <Label htmlFor="incidentReport-image">Incident Report / Billing Details</Label>
                    <Textarea
                      id="incidentReport-image"
                      rows={4}
                      value={incidentReport}
                      onChange={(e) => setIncidentReport(e.target.value)}
                      placeholder="Additional billing information, itemized charges, procedure codes, or any other relevant billing details..."
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Add any additional billing details, procedure codes, or itemized charges.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-info/10 to-info/5 border-2 border-info/30 rounded-xl p-5 shadow-md">
              <h4 className="font-bold text-foreground mb-2 flex items-center">
                <span className="mr-2">💡</span> How it works
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start">
                  <span className="mr-2 text-info">✓</span>
                  Upload an image of your medical bill
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-info">✓</span>
                  Our AI will automatically extract key information
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-info">✓</span>
                  Review the highlighted information and add your description
                </li>
              </ul>
            </div>

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/demographics")}
                className="hover:scale-105 transition-all"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isProcessing || !description.trim() || !incidentDate}
                size="lg" 
                className="min-w-[200px] bg-gradient-primary hover:shadow-lg hover:scale-[1.02] transition-all group"
              >
                Continue
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UploadBill;

