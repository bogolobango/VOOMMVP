import { Layout } from "@/components/layout";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-app-store";
import { Card, Button, Badge } from "@/components/ui-elements";
import { User, Settings, Shield, CreditCard, LogOut, Car as CarIcon, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Account() {
  const { data: user } = useGetMe();
  const { isHostMode, toggleHostMode } = useAppStore();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const logout = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/auth");
      }
    }
  });

  const menuItems = [
    { icon: User, label: "Personal Information" },
    { icon: Shield, label: "Verification Settings" },
    { icon: CreditCard, label: "Payment Methods" },
    { icon: Settings, label: "Preferences" },
  ];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-display font-bold mb-8">Account</h1>

        {/* Profile Card */}
        <Card className="p-6 mb-8 bg-gradient-to-br from-card to-secondary/30">
          <div className="flex items-center gap-6">
            <img 
              src={user?.profilePicture || `${import.meta.env.BASE_URL}images/avatar-placeholder.png`} 
              className="w-20 h-20 rounded-full border-4 border-background shadow-lg object-cover"
              alt="Profile"
            />
            <div>
              <h2 className="text-2xl font-bold">{user?.fullName || user?.username}</h2>
              <p className="text-muted-foreground mb-2">{user?.phoneNumber || "Add phone number"}</p>
              {user?.isVerified ? (
                <Badge variant="success">Verified Profile</Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Host Toggle */}
        <Card className="p-1 mb-8 bg-secondary/50">
          <div className="bg-card rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isHostMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                <CarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Host Mode</h3>
                <p className="text-sm text-muted-foreground">Switch to manage your listings</p>
              </div>
            </div>
            <button 
              onClick={toggleHostMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isHostMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isHostMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Card>

        {/* Menu List */}
        <div className="space-y-3 mb-12">
          {menuItems.map((item, i) => (
            <button key={i} className="w-full flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="font-semibold">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
          
          {/* Become a Host Link if not host */}
          {!user?.isHost && (
            <button 
              onClick={() => setLocation("/become-host")}
              className="w-full flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:bg-primary/10 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                  <CarIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-primary block">Become a Host</span>
                  <span className="text-xs text-primary/70">Start earning money with your car</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        <Button variant="destructive" className="w-full rounded-2xl h-14" onClick={() => logout.mutate()}>
          <LogOut className="w-5 h-5 mr-2" /> Log out
        </Button>
      </div>
    </Layout>
  );
}
