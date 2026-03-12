import { useState } from "react";
import { Link } from "wouter";
import { Heart, Star, MapPin, Users, Fuel, ShieldCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Car } from "@workspace/api-client-react";
import { useAddFavorite, useRemoveFavorite, useCheckFavorite } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export function CarCard({ car }: { car: Car }) {
  const queryClient = useQueryClient();
  const { data: checkData } = useCheckFavorite(car.id);
  const isFavorite = checkData?.isFavorite || false;
  const [imgError, setImgError] = useState(false);

  const addFav = useAddFavorite({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/favorites/check/${car.id}`] }) }
  });
  const removeFav = useRemoveFavorite({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/favorites/check/${car.id}`] }) }
  });

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isFavorite) {
      removeFav.mutate({ carId: car.id });
    } else {
      addFav.mutate({ data: { carId: car.id } });
    }
  };

  {/* generic unsplash cars for placeholder if no image */}
  const displayImage = car.imageUrl || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800";

  return (
    <Link href={`/cars/${car.id}`}>
      <motion.div 
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="group relative bg-card rounded-2xl border border-border/50 overflow-hidden shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer"
      >
        <div className="aspect-[4/3] w-full relative overflow-hidden bg-secondary">
          {imgError ? (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
              <svg className="w-16 h-16 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25V6.75A1.125 1.125 0 014.5 5.625h7.875a1.125 1.125 0 011.125 1.125v7.5" />
              </svg>
            </div>
          ) : (
            <img
              src={displayImage}
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          )}
          <button 
            onClick={toggleFavorite}
            className="absolute top-3 right-3 p-2.5 bg-background/80 backdrop-blur-md rounded-full shadow-md hover:bg-background transition-colors z-10"
          >
            <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
          </button>
          
          {car.rating && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-background/80 backdrop-blur-md rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
              <Star className="w-3.5 h-3.5 fill-warning text-warning" />
              {car.rating.toFixed(1)}
            </div>
          )}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-background/80 backdrop-blur-md rounded-full text-xs font-bold flex items-center gap-1 shadow-md text-green-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified
          </div>
        </div>

        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                {car.make} {car.model}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {car.city || car.location}
              </p>
              <p className="text-xs text-green-600 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                Responds quickly
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{formatCurrency(car.dailyRate, car.currency)}</p>
              <p className="text-xs text-muted-foreground">per day</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground font-medium">
            {car.seats && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-foreground/60" />
                <span>{car.seats} Seats</span>
              </div>
            )}
            {car.fuelType && (
              <div className="flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-foreground/60" />
                <span className="capitalize">{car.fuelType}</span>
              </div>
            )}
            {car.type && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="px-2 py-1 bg-secondary rounded-md text-secondary-foreground">
                  {car.type}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
