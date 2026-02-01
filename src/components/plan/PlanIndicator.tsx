import { Zap, Shield, Lock } from 'lucide-react';

type Plan = 'free' | 'pro' | 'enterprise';

export function PlanBadge({ plan, size = 'sm' }: { plan: Plan; size?: 'sm' | 'md' | 'lg' }) {
  const config = {
    free: {
      label: 'Free',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: null,
    },
    pro: {
      label: 'Pro',
      bg: 'bg-gray-700',
      text: 'text-white',
      border: 'border-gray-700',
      icon: <Zap className="w-3 h-3" />,
    },
    enterprise: {
      label: 'Enterprise',
      bg: 'bg-purple-600',
      text: 'text-white',
      border: 'border-purple-600',
      icon: <Shield className="w-3 h-3" />,
    },
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  };

  const c = config[plan];
  const sizeClass = sizeClasses[size];

  return (
    <span className={`
      inline-flex items-center gap-1.5
      font-bold uppercase tracking-wider rounded-full border
      ${c.bg} ${c.text} ${c.border} ${sizeClass}
    `}>
      {c.icon}
      {c.label}
    </span>
  );
}