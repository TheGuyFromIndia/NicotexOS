import React, { useState } from 'react';
import {
  BarChart3,
  Clock,
  TrendingDown,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Lightbulb,
  ShieldCheck,
  Send,
  PieChart
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { ConsumptionEvent, CravingEvent, AppSettings } from '../types';
import { detectPatterns, calculateCostPerPiece, calculateSevenDayRollingAverage } from '../lib/calculations';

interface AnalyticsViewProps {
  consumption: ConsumptionEvent[];
  cravings: CravingEvent[];
  settings: AppSettings | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  consumption,
  cravings,
  settings
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isCallingAi, setIsCallingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const patternData = detectPatterns(consumption, cravings);
  const costPerPiece = calculateCostPerPiece(settings?.packPrice || 115, settings?.packQuantity || 9);
  const currency = settings?.currency || '₹';

  // Build hourly visual graph (24 bars: 0h to 23h)
  const maxHourlyVal = Math.max(1, ...patternData.hourlyDistribution);

  // Group top triggers
  const triggerMap: Record<string, number> = {};
  for (const c of consumption) {
    triggerMap[c.trigger] = (triggerMap[c.trigger] || 0) + (c.quantity || 1);
  }
  const sortedTriggers = Object.entries(triggerMap).sort((a, b) => b[1] - a[1]);
  const totalPieces = consumption.reduce((acc, c) => acc + (c.quantity || 1), 0);

  // Anonymized LLM Prompt generator (zero tracking, user can inspect & copy)
  const generateAnonymizedPrompt = () => {
    const summary = {
      product: settings?.product || 'Nicotex',
      strength: settings?.strength || '2mg',
      baselinePiecesPerDay: settings?.baselinePiecesPerDay || 8,
      rolling7DayAvg: calculateSevenDayRollingAverage(consumption),
      totalLoggedPieces: totalPieces,
      totalCravingEvents: cravings.length,
      topConsumptionTriggers: sortedTriggers.slice(0, 5),
      hourlyDistribution: patternData.hourlyDistribution
    };

    return `I am currently reducing my dependence on Nicotex nicotine gum (${summary.strength}).
Here is my anonymized consumption and craving telemetry:
- Baseline estimate: ${summary.baselinePiecesPerDay} pieces/day
- Current 7-day rolling average: ${summary.rolling7DayAvg} pieces/day
- Total pieces logged: ${summary.totalLoggedPieces}
- Total cravings recorded: ${summary.totalCravingEvents}
- Top triggers: ${summary.topConsumptionTriggers.map(([tr, count]) => `${tr} (${count})`).join(', ')}

Please provide:
1. An objective behavioral analysis of my peak consumption cues.
2. 3 actionable non-chemical substitution experiments I can try during my highest-frequency window.
3. Realistic expectations for reducing oral fixation without increasing stress.`;
  };

  const handleCopyPrompt = () => {
    const text = generateAnonymizedPrompt();
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleRunAiAnalysis = async () => {
    if (!customApiKey.trim()) {
      setAiError('Please enter an OpenAI API key or use the Copy Prompt button above.');
      return;
    }

    setIsCallingAi(true);
    setAiError(null);
    setAiResponse(null);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customApiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an objective, non-judgmental behavioral coach specializing in nicotine gum tapering. Do not prescribe medication. Provide supportive, scientifically grounded behavioral suggestions.'
            },
            {
              role: 'user',
              content: generateAnonymizedPrompt()
            }
          ],
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || 'No insights returned.';
      setAiResponse(content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiError(msg);
    } finally {
      setIsCallingAi(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-md mx-auto px-4 pt-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-slate-100">Pattern Analysis & Trends</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Local, privacy-preserving behavioral analytics based strictly on your records.
        </p>
      </div>

      {/* Hourly Heatmap / Distribution Chart */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Hourly Consumption Distribution
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">24-hour cycle</span>
        </div>

        {/* 24-Hour Bar Chart */}
        <div className="pt-2">
          <div className="flex items-end justify-between h-28 gap-1 px-1">
            {patternData.hourlyDistribution.map((count, hour) => {
              const heightPct = Math.round((count / maxHourlyVal) * 100);
              const isPeak = count === maxHourlyVal && count > 0;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover/touch */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 bg-slate-800 text-[10px] text-cyan-300 px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10 border border-slate-700">
                    {hour}:00 • {count} pcs
                  </div>
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isPeak
                        ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                        : count > 0
                        ? 'bg-cyan-500/50'
                        : 'bg-slate-800/40'
                    }`}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 px-1 pt-1.5 border-t border-slate-800 mt-1">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </div>
      </Card>

      {/* Grounded Local Insights */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Observed Telemetry Insights
        </h3>

        {patternData.insights.map((insight, i) => (
          <Card key={i} className="p-4 space-y-1.5 bg-slate-900/80 border-slate-800">
            <div className="flex items-center space-x-2">
              <Lightbulb size={16} className="text-cyan-400 shrink-0" />
              <h4 className="text-xs font-bold text-slate-200">{insight.title}</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-6">
              {insight.detail}
            </p>
          </Card>
        ))}
      </div>

      {/* Top Recorded Triggers Breakdown */}
      {sortedTriggers.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center space-x-2">
            <PieChart size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Consumption Triggers Breakdown
            </h3>
          </div>

          <div className="space-y-2 pt-1">
            {sortedTriggers.slice(0, 5).map(([triggerName, count]) => {
              const pct = totalPieces > 0 ? Math.round((count / totalPieces) * 100) : 0;
              return (
                <div key={triggerName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[200px]">
                      {triggerName}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <ProgressBar
                    value={count}
                    max={totalPieces}
                    variant="cyan"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Optional Modular AI Integration (Section 11) */}
      <Card className="p-5 space-y-4 border-slate-800 bg-slate-900/90">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200">Optional AI Reflection</h3>
            <span className="text-[10px] text-slate-400">Strictly client-side & explicit opt-in</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          You can copy an anonymized summary of your patterns to ask any AI (ChatGPT, Claude) for personalized behavioral advice, or enter your personal API key.
        </p>

        {/* Copy Prompt Button */}
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={handleCopyPrompt}
          className="text-xs"
        >
          {copiedPrompt ? (
            <>
              <Check size={14} className="mr-1.5 text-emerald-400" />
              Copied Anonymized Prompt!
            </>
          ) : (
            <>
              <Copy size={14} className="mr-1.5 text-cyan-400" />
              Copy Prompt for ChatGPT / Claude
            </>
          )}
        </Button>

        {/* Optional Direct API Input */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 block">
            Or analyze directly with your OpenAI API key (optional):
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="sk-..."
              value={customApiKey}
              onChange={e => setCustomApiKey(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono placeholder-slate-500"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={isCallingAi || !customApiKey}
              onClick={handleRunAiAnalysis}
              className="text-xs px-3"
            >
              {isCallingAi ? 'Analyzing...' : 'Run'}
            </Button>
          </div>

          {aiError && (
            <p className="text-[11px] text-rose-400 pt-1">{aiError}</p>
          )}

          {aiResponse && (
            <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-800/40 text-xs text-slate-200 leading-relaxed space-y-2 animate-in fade-in">
              <span className="font-bold text-purple-300 block">AI Behavioral Reflection:</span>
              <p className="whitespace-pre-line text-[11px] text-slate-300">{aiResponse}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
