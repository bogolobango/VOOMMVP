import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { CarCard } from "@/components/car-card";
import { Input, Button } from "@/components/ui-elements";
import { useGetCars } from "@workspace/api-client-react";
import { Search, SlidersHorizontal, Car as CarIcon, Star, ShieldCheck, Lock, MessageCircle, CalendarCheck, Key, ArrowRight, MapPin, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { GHANA_CITIES } from "@/lib/utils";

const CATEGORIES = ["All", "SUV", "Sedan", "Luxury", "Van", "Truck"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cityOpen, setCityOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");
  const cityRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchQuery = [selectedCity, search].filter(Boolean).join(" ");

  const { data: cars, isLoading } = useGetCars({
    query: {
      queryKey: ["/api/cars", category, searchQuery],
    }
  }, {
    request: {
      url: `/api/cars?available=true${category !== 'All' ? `&category=${category}` : ''}${searchQuery ? `&searchQuery=${searchQuery}` : ''}` as any
    }
  });

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Blurred background image */}
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(/hero-bg.jpeg)`,
            filter: "blur(8px)",
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
                Find the perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">drive</span> for your journey.
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-lg mx-auto lg:mx-0">
                Premium peer-to-peer car rental across West Africa. Verified hosts, insured trips, and unforgettable experiences.
              </p>
              
              <div className="flex items-center bg-background rounded-2xl p-2 shadow-xl shadow-black/5 border border-border/50 max-w-lg mx-auto lg:mx-0">
                {/* City dropdown */}
                <div ref={cityRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setCityOpen(!cityOpen)}
                    className="flex items-center gap-2 h-14 px-4 rounded-xl hover:bg-secondary transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span className={selectedCity ? "text-foreground" : "text-muted-foreground"}>
                      {selectedCity || "All Cities"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${cityOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {cityOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-background rounded-xl border border-border shadow-xl z-50 py-1 max-h-64 overflow-y-auto"
                      >
                        <button
                          type="button"
                          onClick={() => { setSelectedCity(""); setCityOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${!selectedCity ? "text-primary font-semibold" : "text-foreground"}`}
                        >
                          All Cities
                        </button>
                        {GHANA_CITIES.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => { setSelectedCity(city); setCityOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${selectedCity === city ? "text-primary font-semibold" : "text-foreground"}`}
                          >
                            {city}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="w-px h-8 bg-border/50 mx-1" />

                {/* Search input */}
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Make, model..."
                    className="border-0 focus-visible:ring-0 bg-transparent pl-10 h-14 text-base"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button size="lg" className="rounded-xl px-6">Search</Button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="hidden lg:block relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[3rem] transform rotate-3 scale-105" />
              <img 
                src={`${import.meta.env.BASE_URL}images/hero-car.png`} 
                alt="Luxury Car" 
                className="relative z-10 w-full rounded-[2.5rem] shadow-2xl object-cover aspect-[4/3]"
              />
              
              {/* Floating feature badges */}
              <div className="absolute -bottom-6 -left-6 bg-background rounded-2xl p-4 shadow-xl border border-border/50 flex items-center gap-3 z-20">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-bold">Fully Insured</p>
                  <p className="text-xs text-muted-foreground">Every trip covered</p>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 bg-background rounded-2xl p-4 shadow-xl border border-border/50 flex items-center gap-3 z-20">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                </div>
                <div>
                  <p className="text-sm font-bold">4.8★ from 200+ trips</p>
                  <p className="text-xs text-muted-foreground">Trusted in Accra</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trust Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-sm">Verified Hosts</p>
              <p className="text-xs text-muted-foreground">Every host is ID-verified</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-sm">Insured Trips</p>
              <p className="text-xs text-muted-foreground">All rentals include basic coverage</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">Instant Support</p>
              <p className="text-xs text-muted-foreground">We reply on WhatsApp in &lt;5 min</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* How Voom Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-display font-bold mb-6 text-center">How Voom Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-1">Find Your Car</h3>
              <p className="text-sm text-muted-foreground">Browse verified cars near you</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-1">Book Instantly</h3>
              <p className="text-sm text-muted-foreground">Reserve via WhatsApp — no payment until pickup</p>
            </div>
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Key className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-bold mb-1">Hit the Road</h3>
              <p className="text-sm text-muted-foreground">Pick up the keys and enjoy your trip</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Categories */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap font-medium text-sm transition-all duration-200 ${
                  category === cat 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" className="hidden sm:flex shrink-0 ml-4 rounded-full">
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="aspect-[4/3] w-full bg-secondary animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 bg-secondary rounded-lg w-3/4 animate-pulse" />
                      <div className="h-3 bg-secondary rounded-lg w-1/2 animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-secondary rounded-lg animate-pulse" />
                  </div>
                  <div className="h-px bg-border/50 mt-4" />
                  <div className="flex gap-4">
                    <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
                    <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : cars?.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-3xl border border-border border-dashed">
            <CarIcon className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-xl font-bold mb-2">No cars found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search area.</p>
            <Button className="mt-6" onClick={() => { setSearch(""); setCategory("All"); }}>Clear Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cars?.map((car, i) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <CarCard car={car} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Become a Host CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary to-red-700 rounded-3xl p-8 sm:p-12 text-center text-white"
        >
          <h2 className="text-3xl font-display font-bold mb-3">Own a car? Start earning today.</h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">List your vehicle on Voom and earn money while it sits in your driveway.</p>
          <Link href="/become-host">
            <button className="bg-white text-primary font-bold px-8 py-4 rounded-xl text-lg hover:bg-white/90 transition-colors inline-flex items-center gap-2">
              List Your Car <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>
      </div>
    </Layout>
  );
}
