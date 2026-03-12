import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Heart, Calendar, MessageCircle, User, LayoutDashboard, Car as CarIcon, LogOut } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isHostMode } = useAppStore();
  const { data: user } = useGetMe({ query: { retry: false } });

  const renterNav = [
    { icon: Home, label: "Explore", href: "/" },
    { icon: Heart, label: "Favorites", href: "/favorites" },
    { icon: Calendar, label: "Bookings", href: "/bookings" },
    { icon: MessageCircle, label: "Messages", href: "/messages" },
    { icon: User, label: "Profile", href: "/account" },
  ];

  const hostNav = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/host-dashboard" },
    { icon: CarIcon, label: "Listings", href: "/host-listings" },
    { icon: Calendar, label: "Calendar", href: "/host-calendar" },
    { icon: MessageCircle, label: "Messages", href: "/messages" },
    { icon: User, label: "Menu", href: "/account" },
  ];

  const navItems = isHostMode ? hostNav : renterNav;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card fixed inset-y-0 z-40">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <CarIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">VOOM</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3 px-4 py-2">
              <img 
                src={user.profilePicture || `${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
                alt={user.username} 
                className="w-10 h-10 rounded-full border-2 border-border object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.fullName || user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{isHostMode ? "Host Mode" : "Renter Mode"}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-30">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <CarIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold">VOOM</span>
          </Link>
          {user && (
            <Link href="/account">
              <img 
                src={user.profilePicture || `${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-border"
              />
            </Link>
          )}
        </header>

        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/90 backdrop-blur-xl border-t border-border/50 flex justify-around items-center p-2 pb-safe z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <div className={cn(
                "relative flex items-center justify-center p-1.5 rounded-lg transition-all duration-300",
                isActive ? "bg-primary/10" : ""
              )}>
                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "scale-100")} />
              </div>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
