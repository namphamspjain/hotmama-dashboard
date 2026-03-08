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
    // Check local storage for remembered credentials
    const savedEmail = localStorage.getItem("hotmama_remembered_email");
    const savedPassword = localStorage.getItem("hotmama_remembered_password");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
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
        localStorage.setItem("hotmama_remembered_email", email);
        localStorage.setItem("hotmama_remembered_password", password);
      } else {
        localStorage.removeItem("hotmama_remembered_email");
        localStorage.removeItem("hotmama_remembered_password");
      }
      // wtf is these... remember me feature?
      navigate("/");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="fixed inset-0 flex bg-background overflow-hidden">
      {/* Left Brand Panel - Hidden on smaller screens */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-primary text-primary-foreground p-12">
        <Flame className="h-32 w-32 mb-8 opacity-90 drop-shadow-md" />
        <h1 className="text-5xl font-bold tracking-tight mb-4 text-center drop-shadow-sm">Hotmama OMS</h1>
        <p className="text-xl opacity-90 max-w-md text-center">
          Because Hotmamas deserves an efficient Order Management System.
        </p>
      </div>

      {/* Right Login Panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-8 sm:px-14 border-l shadow-2xl bg-card overflow-y-auto">
        <div className="w-full max-w-[400px] shrink-0 space-y-8 py-8">

          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="lg:hidden mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Flame className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back hotmamas</h2>
            <p className="text-muted-foreground mt-2">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 transition-all focus-visible:ring-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 transition-all focus-visible:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center rounded-r-md outline-offset-2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer select-none">
                Remember me
              </Label>
            </div>

            {error && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-medium shadow-sm" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;
