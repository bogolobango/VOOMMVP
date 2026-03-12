import { useState } from "react";
import { Layout } from "@/components/layout";
import { CarCard } from "@/components/car-card";
import { Input, Button } from "@/components/ui-elements";
import { useGetCars } from "@workspace/api-client-react";
import { Search, SlidersHorizontal, Car as CarIcon, Star, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["All", "SUV", "Sedan", "Luxury", "Van", "Truck"];

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: cars, isLoading } = useGetCars({
    query: {
      queryKey: ["/api/cars", category, search],
    }
  }, {
    request: {
      url: `/api/cars?available=true${category !== 'All' ? `&category=${category}` : ''}${search ? `&searchQuery=${search}` : ''}` as any
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
            filter: "blur(18px)",
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40" />
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
              
              <div className="flex items-center bg-background rounded-2xl p-2 shadow-xl shadow-black/5 border border-border/50 max-w-md mx-auto lg:mx-0">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="City, airport, or address..." 
                    className="border-0 focus-visible:ring-0 bg-transparent pl-12 h-14 text-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button size="lg" className="rounded-xl px-8">Search</Button>
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
                  <p className="text-sm font-bold">4.9/5 Average</p>
                  <p className="text-xs text-muted-foreground">From 10k+ reviews</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
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
              <div key={i} className="animate-pulse bg-secondary rounded-2xl h-[320px]" />
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
    </Layout>
  );
}
