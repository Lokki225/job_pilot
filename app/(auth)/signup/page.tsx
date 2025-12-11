"use client"
// ---------- app/(auth)/signup/page.tsx ----------
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/social-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { signUp } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";

export default function SignupPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [passwordConf, setPasswordConf] = useState("")
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      // Validation : mots de passe identiques
      if (password !== passwordConf) {
          toast({
          title: "Passwords don't match",
          description: "Please make sure both passwords are identical",
          variant: "destructive",
          })
          return
      }

      // Validation : longueur mot de passe
      if (password.length < 6) {
          toast({
          title: "Password too short",
          description: "Password must be at least 6 characters",
          variant: "destructive",
          })
          return
      }

      setIsLoading(true)

      try {
          console.log('Starting signup for:', email)
          
          // Sign up the user
      const { user, session, error: signupError } = await signUp(email, password);

      if (signupError) {
          toast({
          title: "Signup failed",
          description: signupError,
          variant: "destructive",
          });
          return;
      }

      // If we have a session, the user is immediately logged in
      if (session) {
          // Set the session in the browser
          const { data: { session: currentSession }, error } = await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token!,
          });

          if (error) throw error;

          toast({
            title: "Account created!",
            description: "Welcome to JobPilot AI",
          });

          // Force a refresh to update the auth state
          router.refresh();
          router.push('/dashboard/onboarding/welcome');
          return;
      }

      // If no session (email confirmation required)
      toast({
          title: "Check your email",
          description: "Please confirm your email to complete registration",
      });
      router.push('/login');

      } catch (error: any) {
          console.error('Unexpected error:', error)
          toast({
          title: "An error occurred",
          description: error.message || "Please try again",
          variant: "destructive",
          })
      } finally {
          setIsLoading(false)
      }
    }
    

  return (
  <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">

    {/* Background Image */}
    <Image
      src="/image-2.jpg"
      alt="Signup background"
      fill
      priority
      className="object-cover object-center opacity-80"
    />

    {/* Dark/Light overlay */}
    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

    {/* Centered Card */}
    <div className="relative z-10 flex w-full justify-center px-4">
      <Card className="w-full max-w-md bg-white/90 dark:bg-slate-900/80 shadow-2xl backdrop-blur-xl border border-white/20">
        
        <CardHeader className="text-center space-y-2">
          <div className="text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
            <Link href="/">JobPilot</Link>
          </div>
          <CardTitle className="text-2xl font-semibold">
            Create an account
          </CardTitle>
          <CardDescription>
            Start your journey with JobPilot today
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>

            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                required
                disabled={isLoading}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                required
                disabled={isLoading}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="passwordConf">Password Confirmation</Label>
              <Input
                id="passwordConf"
                type="password"
                placeholder="Confirm password"
                required
                disabled={isLoading}
                onChange={(e) => setPasswordConf(e.target.value)}
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

            {/* Google Sign In Button */}
            <GoogleSignInButton type="signup" />

            {/* Submit Button */}
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
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

}