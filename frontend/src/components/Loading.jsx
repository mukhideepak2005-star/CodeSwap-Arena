import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ message = 'Loading CodeSwap Arena...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-600 font-medium text-sm">{message}</p>
    </div>
  );
}
