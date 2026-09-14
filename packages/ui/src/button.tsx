import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: 'rc-btn rc-btn-primary',
  secondary: 'rc-btn rc-btn-secondary',
  ghost: 'rc-btn rc-btn-ghost',
};

export function Button({ variant = 'primary', className, children, type, ...rest }: ButtonProps) {
  const classes = [variantClass[variant], className].filter(Boolean).join(' ');
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}
