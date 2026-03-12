import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input, Button, Label, Card } from "@/components/ui-elements";
import { useLogin, useRegister, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Car, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Full name is required"),
  phoneNumber: z.string().min(8, "Valid phone number required"),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user } = useGetMe();
  if (user) {
    setLocation("/");
    return null;
  }

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" }
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", fullName: "", phoneNumber: "" }
  });

  const loginMut = useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        setLocation("/");
      }
    }
  });

  const registerMut = useRegister({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        setLocation("/");
      }
    }
  });

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMut.mutate({ data });
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMut.mutate({ data });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px]" />
      
      <Card className="w-full max-w-md p-8 relative z-10 bg-card/80 backdrop-blur-xl border border-white/20">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Car className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <h2 className="text-3xl font-display font-bold text-center mb-2">
          {isLogin ? "Welcome back" : "Create an account"}
        </h2>
        <p className="text-muted-foreground text-center mb-8">
          {isLogin ? "Enter your details to access your account." : "Join Voom and start your journey."}
        </p>

        <div className="flex bg-secondary p-1 rounded-xl mb-8">
          <button 
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={loginForm.handleSubmit(onLoginSubmit)} 
              className="space-y-4"
            >
              <div>
                <Label>Username</Label>
                <Input {...loginForm.register("username")} error={loginForm.formState.errors.username?.message as string} />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" {...loginForm.register("password")} error={loginForm.formState.errors.password?.message as string} />
              </div>
              {loginMut.error && <p className="text-sm text-destructive font-medium">{loginMut.error.message}</p>}
              <Button type="submit" className="w-full mt-2" isLoading={loginMut.isPending}>
                Sign In <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.form>
          ) : (
            <motion.form 
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)} 
              className="space-y-4"
            >
              <div>
                <Label>Full Name</Label>
                <Input {...registerForm.register("fullName")} error={registerForm.formState.errors.fullName?.message as string} />
              </div>
              <div>
                <Label>Username</Label>
                <Input {...registerForm.register("username")} error={registerForm.formState.errors.username?.message as string} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input {...registerForm.register("phoneNumber")} error={registerForm.formState.errors.phoneNumber?.message as string} />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" {...registerForm.register("password")} error={registerForm.formState.errors.password?.message as string} />
              </div>
              {registerMut.error && <p className="text-sm text-destructive font-medium">{registerMut.error.message}</p>}
              <Button type="submit" className="w-full mt-2" isLoading={registerMut.isPending}>
                Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
