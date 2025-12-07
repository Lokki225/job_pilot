"use client"
// ---------- app/(auth)/login/page.tsx ----------
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // On success, go to dashboard; Proxy will protect routes based on auth
      router.push("/dashboard");
      
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      // Always stop loading, even if navigation fails
      setIsLoading(false);
    }
  };

  return (
  <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">

    {/* Background Image */}
    <Image
      src="/image-1.jpg"
      alt="Login background"
      fill
      priority
      className="object-cover object-center opacity-80"
    />

    {/* Overlay */}
    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

    {/* Centered Card */}
    <div className="relative z-10 flex w-full justify-center px-4">
      <Card className="w-full max-w-md bg-white/90 dark:bg-slate-900/80 shadow-2xl backdrop-blur-xl border border-white/20">

        <CardHeader className="text-center space-y-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
            <Link href="/">JobPilot</Link>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in to your JobPilot account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                disabled={isLoading}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white/90 dark:bg-slate-900/80 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google login */}
            <Button type="button" variant="outline" className="w-full">
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504..."
                />
              </svg>
              Sign in with Google
            </Button>

            {/* Login button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 ..."
                    />
                  </svg>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </div>
        </CardContent>

      </Card>
    </div>
  </div>
);

}