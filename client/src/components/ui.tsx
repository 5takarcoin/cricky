import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-pitch tracking-tight">{title}</h1>
        {subtitle && <p className="text-pitch/60 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-cream-dark shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const variants = {
    primary:   'bg-pitch text-white hover:bg-pitch-light',
    secondary: 'bg-gold text-pitch-dark hover:bg-gold-light',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    ghost:     'bg-transparent text-pitch hover:bg-cream-dark',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-pitch mb-1">{label}</span>}
      <input
        className={`w-full px-3 py-2 rounded-lg border border-cream-dark bg-white text-pitch placeholder:text-pitch/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold ${className}`}
        {...props}
      />
      {error && <span className="text-red-600 text-xs mt-1 block">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-pitch mb-1">{label}</span>}
      <select
        className={`w-full px-3 py-2 rounded-lg border border-cream-dark bg-white text-pitch focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-pitch mb-1">{label}</span>}
      <textarea
        className={`w-full px-3 py-2 rounded-lg border border-cream-dark bg-white text-pitch placeholder:text-pitch/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-y min-h-[80px] ${className}`}
        {...props}
      />
    </label>
  );
}

export function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    live:      'bg-red-100 text-red-700 animate-pulse',
    ended:     'bg-pitch/10 text-pitch',
    confirmed: 'bg-green-100 text-green-800',
    pending:   'bg-yellow-100 text-yellow-800',
    requested: 'bg-orange-100 text-orange-800',
    rejected:  'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-pitch/20 border-t-pitch rounded-full animate-spin" />
    </div>
  );
}

export function Alert({ type = 'error', children, className = '' }: { type?: 'error' | 'success'; children: ReactNode; className?: string }) {
  const styles = type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200';
  return <div className={`px-4 py-3 rounded-lg border text-sm ${styles} ${className}`}>{children}</div>;
}

export function Empty({ message }: { message: string }) {
  return <p className="text-center text-pitch/50 py-12">{message}</p>;
}
