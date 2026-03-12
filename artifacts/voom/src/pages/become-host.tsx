import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button, Input, Label, Card } from "@/components/ui-elements";
import { useCreateCar } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { ArrowRight, ChevronLeft, Car } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";

export default function BecomeHost() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { setHostMode } = useAppStore();
  
  // Form State
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState("Sedan");
  const [locationStr, setLocationStr] = useState("");
  const [dailyRate, setDailyRate] = useState(250);
  const [imageUrl, setImageUrl] = useState("");

  const createCar = useCreateCar({
    mutation: {
      onSuccess: () => {
        setHostMode(true);
        setLocation("/host-dashboard");
      }
    }
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = () => {
    createCar.mutate({
      data: {
        make, model, year, type, location: locationStr, dailyRate, currency: "GHS", imageUrl,
        color: "Black", licensePlate: "XX-000-XX", features: [], transmission: "Automatic", fuelType: "Petrol"
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8 w-full min-h-[calc(100vh-100px)] flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          {step > 1 && (
            <button onClick={handleBack} className="p-2 bg-secondary rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(step/3)*100}%` }} />
          </div>
        </div>

        <div className="flex-1">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h1 className="text-3xl font-display font-bold mb-2">Tell us about your car</h1>
              <p className="text-muted-foreground mb-8">Basic details help renters find exactly what they need.</p>
              
              <div className="space-y-6">
                <div>
                  <Label>Make (Brand)</Label>
                  <Input placeholder="e.g. Toyota" value={make} onChange={e => setMake(e.target.value)} />
                </div>
                <div>
                  <Label>Model</Label>
                  <Input placeholder="e.g. Camry" value={model} onChange={e => setModel(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Year</Label>
                    <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select 
                      className="flex h-12 w-full rounded-xl border-2 border-border bg-background px-4 py-2 text-base focus-visible:border-primary focus-visible:outline-none"
                      value={type} onChange={e => setType(e.target.value)}
                    >
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Van">Van</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h1 className="text-3xl font-display font-bold mb-2">Location & Pricing</h1>
              <p className="text-muted-foreground mb-8">Set your daily rate and where renters can pick it up.</p>
              
              <div className="space-y-6">
                <div>
                  <Label>Pickup Location (City or Area)</Label>
                  <Input placeholder="e.g. Accra, East Legon" value={locationStr} onChange={e => setLocationStr(e.target.value)} />
                </div>
                <div>
                  <Label>Daily Rate (GHS ₵)</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₵</span>
                    <Input type="number" className="pl-16 font-bold text-lg" value={dailyRate} onChange={e => setDailyRate(parseInt(e.target.value))} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">We recommend between 150 and 500 GHS for standard cars.</p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h1 className="text-3xl font-display font-bold mb-2">Add a Photo</h1>
              <p className="text-muted-foreground mb-8">A good photo increases bookings by 300%.</p>
              
              <div className="space-y-6">
                <div>
                  <Label>Image URL (for MVP)</Label>
                  <Input placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                </div>
                
                {imageUrl ? (
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-primary">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-2xl bg-secondary border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                    <Car className="w-12 h-12 mb-2 opacity-50" />
                    <p>Enter an image URL to preview</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-border/50 mt-auto flex gap-4">
          {step < 3 ? (
            <Button className="w-full h-14 text-lg" onClick={handleNext} disabled={(step===1 && (!make || !model)) || (step===2 && (!locationStr || !dailyRate))}>
              Continue <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button className="w-full h-14 text-lg" onClick={handleSubmit} isLoading={createCar.isPending} disabled={!imageUrl}>
              Publish Listing
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
