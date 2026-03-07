import React, { useState, useEffect, useCallback } from "react";
import { RotateCcw, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function useCurrencyRate(from: string, to: string) {
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = from.toLowerCase();
      const target = to.toLowerCase();
      
      let res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.min.json`);
      
      if (!res.ok) {
        res = await fetch(`https://latest.currency-api.pages.dev/v1/currencies/${base}.min.json`);
        if (!res.ok) {
          throw new Error("Both APIs failed");
        }
      }
      
      const data = await res.json();
      const fetchedRate = data[base][target];
      const fetchedDate = data.date;
      
      if (typeof fetchedRate !== "number") {
        throw new Error("Invalid rate data");
      }
      
      setRate(fetchedRate);
      setDate(fetchedDate);
    } catch (err) {
      setError("Unable to fetch rate. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rate, date, loading, error, refresh };
}

interface CurrencyWidgetProps {
  onRateFetched?: (rate: number, date: string) => void;
  className?: string;
}

export function CurrencyWidget({ onRateFetched, className = "" }: CurrencyWidgetProps) {
  const [isCnyToPhp, setIsCnyToPhp] = useState(true);
  const from = isCnyToPhp ? "cny" : "php";
  const to = isCnyToPhp ? "php" : "cny";
  
  const { rate, date, loading, error, refresh } = useCurrencyRate(from, to);
  const [amount, setAmount] = useState<string>("1");

  useEffect(() => {
    if (rate !== null && date !== null && isCnyToPhp && onRateFetched) {
      onRateFetched(rate, date);
    }
  }, [rate, date, isCnyToPhp, onRateFetched]);

  const handleFlip = () => setIsCnyToPhp(!isCnyToPhp);

  const convertedValue = React.useMemo(() => {
    const num = parseFloat(amount);
    if (Number.isNaN(num) || rate === null || amount.trim() === "") return "—";
    return (num * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }, [amount, rate]);

  return (
    <div className={`p-4 border rounded-lg bg-card text-card-foreground shadow-sm space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {loading ? (
             <span className="flex items-center gap-1.5"><RotateCcw className="h-3 w-3 animate-spin"/> Loading rate...</span>
          ) : error ? (
             <span className="text-destructive text-xs">{error}</span>
          ) : rate && date ? (
             <span>1 {from.toUpperCase()} = {rate.toFixed(4)} {to.toUpperCase()} &middot; {date}</span>
          ) : (
             <span>—</span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh} disabled={loading} title="Refresh rate">
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input 
            type="number" 
            min="0"
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            className="pr-12 bg-background font-medium"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
            {from.toUpperCase()}
          </span>
        </div>
        
        <Button variant="ghost" size="icon" onClick={handleFlip} className="shrink-0 h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        
        <div className="flex-1 relative">
          <Input 
            type="text" 
            readOnly 
            disabled
            value={convertedValue} 
            className="bg-muted pr-12 font-medium text-foreground disabled:opacity-100"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
            {to.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
