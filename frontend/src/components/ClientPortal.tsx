'use client';
import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ClientPortal({ children, selector = 'body' }:{
  children: ReactNode; selector?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [el, setEl] = useState<Element | null>(null);

  useEffect(() => {
    setEl(document.querySelector(selector));
    setMounted(true);
  }, [selector]);

  if (!mounted || !el) return null;
  return createPortal(children, el);
}
