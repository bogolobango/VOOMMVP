import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, Badge } from "@/components/ui-elements";
import { useGetBookings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Car, Calendar as CalendarIcon, MapPin, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Bookings() {
  const { data: bookings, isLoading } = useGetBookings();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  if (isLoading) return <Layout><div className="p-8 text-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div></Layout>;

  const filtered = bookings?.filter(b => {
    const isPast = b.status === "completed" || b.status === "cancelled";
    return tab === "past" ? isPast : !isPast;
  }) || [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Your Trips</h1>

        <div className="flex gap-4 border-b border-border/50 mb-8">
          <button 
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${tab === 'upcoming' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab("upcoming")}
          >
            Upcoming & Active
          </button>
          <button 
            className={`pb-4 px-2 font-medium transition-colors border-b-2 ${tab === 'past' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab("past")}
          >
            Past Trips
          </button>
        </div>

        <div className="space-y-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-3xl border border-border border-dashed">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No {tab} trips</h3>
              <p className="text-muted-foreground mb-6">When you book a car, your itinerary will appear here.</p>
              <Link href="/">
                <button className="text-primary font-semibold hover:underline">Explore cars</button>
              </Link>
            </div>
          ) : (
            filtered.map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden flex flex-col sm:flex-row group hover:shadow-2xl transition-all duration-300">
                  <div className="w-full sm:w-48 h-48 sm:h-auto bg-secondary relative shrink-0">
                    <img 
                      src={booking.car?.imageUrl || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800"} 
                      className="w-full h-full object-cover"
                      alt="Car"
                    />
                    <div className="absolute top-3 left-3">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize backdrop-blur-md shadow-sm border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold font-display">
                          {booking.car?.make} {booking.car?.model}
                        </h3>
                        <p className="font-bold text-lg text-primary">{formatCurrency(booking.totalAmount, booking.currency)}</p>
                      </div>
                      
                      <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{format(new Date(booking.startDate), "MMM d, yyyy")} - {format(new Date(booking.endDate), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{booking.pickupLocation}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <Link href={`/cars/${booking.carId}`} className="text-primary font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                        View details <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
