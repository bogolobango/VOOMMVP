import { Layout } from "@/components/layout";
import { CarCard } from "@/components/car-card";
import { useGetFavorites } from "@workspace/api-client-react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Favorites() {
  const { data: favorites, isLoading } = useGetFavorites();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8 flex items-center gap-3">
          Saved Cars <Heart className="w-6 h-6 fill-destructive text-destructive" />
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 overflow-hidden">
                <div className="aspect-[4/3] w-full bg-secondary animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-secondary rounded-lg w-3/4 animate-pulse" />
                  <div className="h-3 bg-secondary rounded-lg w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites?.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-3xl border border-border border-dashed">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-xl font-bold mb-2">Save your dream ride ❤️</h3>
            <p className="text-muted-foreground mb-6">Tap the heart icon on any car to save it for later.</p>
            <Link href="/">
              <button className="text-primary font-semibold hover:underline">Explore cars</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites?.map((car, i) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
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
