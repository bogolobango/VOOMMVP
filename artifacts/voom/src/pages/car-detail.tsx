import { useState } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Button, Card, Badge, Input, Label } from "@/components/ui-elements";
import { useGetCar } from "@workspace/api-client-react";
import { ChevronLeft, Star, MapPin, Users, Fuel, Settings2, ShieldCheck, Check } from "lucide-react";
import { formatCurrency, getDaysDifference } from "@/lib/utils";
import { reserveCarOnWhatsApp } from "@/lib/whatsapp";
import useEmblaCarousel from "embla-carousel-react";

export default function CarDetail() {
  const [, params] = useRoute("/cars/:id");
  const carId = parseInt(params?.id || "0");
  
  const { data: car, isLoading } = useGetCar(carId);
  const [emblaRef] = useEmblaCarousel();
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  
  if (isLoading) return <Layout><div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></Layout>;
  if (!car) return <Layout><div className="p-8 text-center text-xl font-bold">Car not found</div></Layout>;

  // Fallback images
  const images = car.images?.length ? car.images : [
    car.imageUrl || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200",
    "https://images.unsplash.com/photo-1503376713917-f584e27f6946?auto=format&fit=crop&q=80&w=1200"
  ];

  const days = startDate && endDate ? getDaysDifference(new Date(startDate), new Date(endDate)) : 0;
  const total = days > 0 ? days * car.dailyRate : car.dailyRate;

  return (
    <Layout>
      <div className="pb-32 lg:pb-12">
        {/* Mobile Header / Desktop Breadcrumb */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md p-4 flex items-center gap-4 lg:hidden">
          <button onClick={() => window.history.back()} className="p-2 bg-secondary rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg flex-1 truncate">{car.make} {car.model}</h1>
        </div>

        <div className="max-w-7xl mx-auto lg:px-8 lg:py-8 lg:grid lg:grid-cols-3 lg:gap-12">
          
          {/* Main Content (Images + Details) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Carousel */}
            <div className="overflow-hidden lg:rounded-3xl" ref={emblaRef}>
              <div className="flex">
                {images.map((img, i) => (
                  <div key={i} className="flex-[0_0_100%] min-w-0">
                    <div className="aspect-[4/3] lg:aspect-[16/9] w-full bg-secondary relative">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 lg:px-0 space-y-8">
              {/* Title & Basics */}
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl lg:text-5xl font-display font-extrabold text-foreground mb-2">
                      {car.make} {car.model} <span className="text-muted-foreground font-normal">{car.year}</span>
                    </h1>
                    <p className="flex items-center gap-1.5 text-muted-foreground text-lg">
                      <MapPin className="w-5 h-5 text-primary" /> {car.city || car.location}
                    </p>
                  </div>
                  {car.rating && (
                    <div className="bg-secondary rounded-2xl p-3 flex flex-col items-center justify-center min-w-[4rem]">
                      <Star className="w-6 h-6 text-warning fill-warning mb-1" />
                      <span className="font-bold">{car.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-background">
                  <Users className="w-6 h-6 mb-2 text-primary" />
                  <span className="text-sm font-semibold">{car.seats || 4} Seats</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-background">
                  <Settings2 className="w-6 h-6 mb-2 text-primary" />
                  <span className="text-sm font-semibold capitalize">{car.transmission || 'Auto'}</span>
                </Card>
                <Card className="p-4 flex flex-col items-center justify-center text-center bg-background">
                  <Fuel className="w-6 h-6 mb-2 text-primary" />
                  <span className="text-sm font-semibold capitalize">{car.fuelType || 'Petrol'}</span>
                </Card>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xl font-bold mb-4">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {car.description || "Experience the thrill of driving this beautifully maintained vehicle. Perfect for business trips, weekend getaways, or navigating the city in style. Fully cleaned and inspected before every trip."}
                </p>
              </div>

              {/* Features */}
              {car.features && car.features.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4">Features</h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                    {car.features.map(f => (
                      <div key={f} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="w-5 h-5 text-success" />
                        <span className="capitalize">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Widget (Sticky on Desktop, Fixed bottom on Mobile) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="p-6 hidden lg:block shadow-2xl">
                <div className="mb-6">
                  <span className="text-3xl font-bold text-primary">{formatCurrency(car.dailyRate, car.currency)}</span>
                  <span className="text-muted-foreground"> / day</span>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Pickup / Dropoff Location</Label>
                    <Input placeholder="Enter address or airport" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} />
                  </div>
                </div>

                {days > 0 && (
                  <div className="bg-secondary rounded-xl p-4 mb-6 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{formatCurrency(car.dailyRate, car.currency)} x {days} days</span>
                      <span className="font-semibold">{formatCurrency(total, car.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/50 pt-2 font-bold text-base mt-2">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(total, car.currency)}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => reserveCarOnWhatsApp(
                    car.make, car.model, car.dailyRate, car.currency || "GHS",
                    car.city || car.location,
                    startDate ? new Date(startDate) : null,
                    endDate ? new Date(endDate) : null
                  )}
                >
                  Book Now
                </Button>
                <p className="text-center text-xs text-muted-foreground mt-4">You won't be charged yet</p>
              </Card>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-background border-t border-border/50 p-4 pb-safe flex items-center justify-between z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div>
          <p className="text-xl font-bold text-primary">{formatCurrency(car.dailyRate, car.currency)}</p>
          <p className="text-xs text-muted-foreground font-medium">per day</p>
        </div>
        <Button
          size="lg"
          className="rounded-xl px-10"
          onClick={() => reserveCarOnWhatsApp(
            car.make, car.model, car.dailyRate, car.currency || "GHS",
            car.city || car.location,
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null
          )}
        >
          Book Now
        </Button>
      </div>
    </Layout>
  );
}
