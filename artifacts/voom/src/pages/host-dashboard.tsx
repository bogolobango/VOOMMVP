import { Layout } from "@/components/layout";
import { Card, Badge, Button } from "@/components/ui-elements";
import { useGetHostCars, useGetHostBookings, useApproveBooking, useRejectBooking } from "@workspace/api-client-react";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { TrendingUp, Car, Calendar, Activity, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function HostDashboard() {
  const { data: cars } = useGetHostCars();
  const { data: bookings } = useGetHostBookings();
  const queryClient = useQueryClient();

  const approve = useApproveBooking({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/bookings/host/me"] }) } });
  const reject = useRejectBooking({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/bookings/host/me"] }) } });

  const pendingBookings = bookings?.filter(b => b.status === "pending") || [];
  const completedBookings = bookings?.filter(b => b.status === "completed") || [];
  
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.hostPayout || 0), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Host Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-br from-primary to-accent text-white border-0 shadow-xl shadow-primary/20">
            <TrendingUp className="w-8 h-8 mb-4 opacity-80" />
            <p className="text-white/80 font-medium mb-1">Total Earnings</p>
            <h3 className="text-3xl font-bold">{formatCurrency(totalEarnings)}</h3>
          </Card>
          <Card className="p-6">
            <Calendar className="w-8 h-8 text-primary mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Pending Requests</p>
            <h3 className="text-3xl font-bold">{pendingBookings.length}</h3>
          </Card>
          <Card className="p-6">
            <Activity className="w-8 h-8 text-success mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Completed Trips</p>
            <h3 className="text-3xl font-bold">{completedBookings.length}</h3>
          </Card>
          <Card className="p-6">
            <Car className="w-8 h-8 text-warning mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Active Listings</p>
            <h3 className="text-3xl font-bold">{cars?.length || 0}</h3>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Requests */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold font-display">Pending Requests</h2>
            {pendingBookings.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2 bg-transparent shadow-none">
                <p className="text-muted-foreground">No pending requests right now.</p>
              </Card>
            ) : (
              pendingBookings.map(booking => (
                <Card key={booking.id} className="p-6 flex flex-col sm:flex-row gap-6 items-start">
                  <img src={booking.car?.imageUrl || ""} className="w-full sm:w-32 h-32 object-cover rounded-xl bg-secondary" alt="Car" />
                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{booking.car?.make} {booking.car?.model}</h3>
                      <p className="font-bold text-primary">{formatCurrency(booking.totalAmount)}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {format(new Date(booking.startDate), "MMM d, yyyy")} - {format(new Date(booking.endDate), "MMM d, yyyy")}
                    </p>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 text-destructive hover:bg-destructive hover:text-white" onClick={() => reject.mutate({ id: booking.id })}>
                        <X className="w-4 h-4 mr-2" /> Decline
                      </Button>
                      <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => approve.mutate({ id: booking.id })}>
                        <Check className="w-4 h-4 mr-2" /> Approve
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Quick List of Cars */}
          <div>
            <h2 className="text-2xl font-bold font-display mb-6">Your Cars</h2>
            <div className="space-y-4">
              {cars?.map(car => (
                <Card key={car.id} className="p-4 flex items-center gap-4">
                  <img src={car.imageUrl || ""} className="w-16 h-16 rounded-lg object-cover bg-secondary" alt="" />
                  <div>
                    <h4 className="font-bold">{car.make} {car.model}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <Badge variant={car.available ? "success" : "secondary"}>{car.available ? "Active" : "Inactive"}</Badge>
                      <span className="text-muted-foreground">{formatCurrency(car.dailyRate)}/d</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
