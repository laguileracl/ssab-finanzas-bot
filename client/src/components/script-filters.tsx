import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Filters {
  category: string;
  timeframes: string[];
  tradingPair: string;
  performance: string;
}

interface ScriptFiltersProps {
  onFiltersChange: (filters: Filters) => void;
}

export function ScriptFilters({ onFiltersChange }: ScriptFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    category: '',
    timeframes: [],
    tradingPair: '',
    performance: 'all',
  });

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ ...prev, category: value }));
  };

  const handleTimeframeChange = (timeframe: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      timeframes: checked
        ? [...prev.timeframes, timeframe]
        : prev.timeframes.filter(t => t !== timeframe)
    }));
  };

  const handleTradingPairChange = (value: string) => {
    setFilters(prev => ({ ...prev, tradingPair: value }));
  };

  const handlePerformanceChange = (value: string) => {
    setFilters(prev => ({ ...prev, performance: value }));
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        
        {/* Category Filter */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Strategy Type
          </Label>
          <Select value={filters.category} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="trend-following">Trend Following</SelectItem>
              <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
              <SelectItem value="momentum">Momentum</SelectItem>
              <SelectItem value="scalping">Scalping</SelectItem>
              <SelectItem value="swing">Swing Trading</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe Filter */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Timeframe
          </Label>
          <div className="space-y-2">
            {['1m', '5m', '1h', '1d'].map((timeframe) => (
              <div key={timeframe} className="flex items-center space-x-2">
                <Checkbox
                  id={`timeframe-${timeframe}`}
                  checked={filters.timeframes.includes(timeframe)}
                  onCheckedChange={(checked) => 
                    handleTimeframeChange(timeframe, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`timeframe-${timeframe}`}
                  className="text-sm text-gray-900"
                >
                  {timeframe === '1m' && '1 Minute'}
                  {timeframe === '5m' && '5 Minutes'}
                  {timeframe === '1h' && '1 Hour'}
                  {timeframe === '1d' && '1 Day'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Trading Pair Filter */}
        <div className="mb-6">
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Trading Pair
          </Label>
          <Select value={filters.tradingPair} onValueChange={handleTradingPairChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pairs</SelectItem>
              <SelectItem value="BTCUSD">BTC/USD</SelectItem>
              <SelectItem value="ETHUSD">ETH/USD</SelectItem>
              <SelectItem value="EURUSD">EUR/USD</SelectItem>
              <SelectItem value="GBPUSD">GBP/USD</SelectItem>
              <SelectItem value="SPY">SPY</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Performance Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Performance
          </Label>
          <RadioGroup value={filters.performance} onValueChange={handlePerformanceChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="perf-all" />
              <Label htmlFor="perf-all" className="text-sm text-gray-900">
                All Scripts
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="profitable" id="perf-profitable" />
              <Label htmlFor="perf-profitable" className="text-sm text-gray-900">
                Profitable Only
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="testing" id="perf-testing" />
              <Label htmlFor="perf-testing" className="text-sm text-gray-900">
                In Testing
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
