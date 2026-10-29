import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-[24px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-200 flex flex-col justify-between text-slate-800 ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
          <div>
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight font-sans">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 font-sans leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex items-center shrink-0">{action}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
