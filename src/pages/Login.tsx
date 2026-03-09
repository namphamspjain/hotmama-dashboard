import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);

    if (success) {
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      navigate("/");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Panel - Presentation */}
      <div className="relative w-full flex-1 items-center justify-center bg-[#121212] hidden lg:flex overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] bg-white rounded-full mix-blend-overlay filter blur-[100px]"></div>
          <div className="absolute top-[40%] right-[10%] w-[500px] h-[500px] bg-gray-500 rounded-full mix-blend-overlay filter blur-[100px]"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[600px] h-[600px] bg-gray-600 rounded-full mix-blend-overlay filter blur-[100px]"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-white text-center p-8 max-w-2xl">
          <div className="mb-8">
            <Flame className="h-32 w-32 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-6 text-white drop-shadow-sm">Hotmama OMS</h1>
          <p className="text-xl text-white/90 font-medium max-w-lg leading-relaxed drop-shadow-sm">
            Because hotmama Jed deserves the best Operations Management System to take care of her family.
          </p>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex w-full flex-1 shrink-0 flex-col items-center justify-center p-8 bg-background relative z-10 shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center">
              <span className="text-[#121212] font-bold text-4xl flex items-center gap-2">
                <Flame className="h-9 w-9 text-[#121212]" fill="currentColor" />
                Hotmama
              </span>
            </div>
            <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">Welcome Back hotmamas!</h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground/90">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-muted/30 border-input focus:border-[#121212] focus:ring-[#121212]/20 focus:bg-background transition-colors text-[15px] rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/90">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-muted/30 border-input focus:border-[#121212] focus:ring-[#121212]/20 focus:bg-background pr-10 transition-colors text-[15px] tracking-wider rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2.5">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="rounded flex-shrink-0"
                />
                <Label htmlFor="remember" className="text-[14px] font-medium text-muted-foreground cursor-pointer select-none m-0 pt-[2px]">
                  Remember me
                </Label>
              </div>
              <a href="#" className="text-[14px] font-semibold text-[#121212] hover:underline hover:text-[#1f1f1f] transition-colors">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-[15px] font-semibold bg-[#121212] hover:bg-[#1f1f1f] text-white rounded-lg transition-all shadow-md hover:shadow-lg mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Log in"}
            </Button>
          </form>

          <p className="mt-10 text-center text-[14px] text-muted-foreground px-4">
            Don't have an account? Please contact your Hotmama OMS administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
