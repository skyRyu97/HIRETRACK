import React from 'react';

interface ScoreGaugeProps {
  score: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClasses = {
    stroke: 'stroke-emerald-400',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    label: 'Strong Match',
  };

  if (score < 50) {
    colorClasses = {
      stroke: 'stroke-rose-500',
      text: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      label: 'Needs Tailoring',
    };
  } else if (score < 75) {
    colorClasses = {
      stroke: 'stroke-amber-400',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      label: 'Moderate Alignment',
    };
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 90 90">
          {/* Background circle track */}
          <circle
            cx="45"
            cy="45"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx="45"
            cy="45"
            r={radius}
            className={`${colorClasses.stroke} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${colorClasses.text} tracking-tight font-mono`}>
            {score}
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase -mt-1">/ 100</span>
        </div>
      </div>

      <span
        className={`mt-2 px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${colorClasses.bg}`}
      >
        {colorClasses.label}
      </span>
    </div>
  );
};
