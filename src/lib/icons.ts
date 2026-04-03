import { 
  ShoppingCart, 
  FileText, 
  PiggyBank, 
  Landmark, 
  Banknote,
  CircleDollarSign
} from 'lucide-react';

export const DEFAULT_ICONS: Record<string, any> = {
  'Gastos': ShoppingCart,
  'Recibos': FileText,
  'Ahorros': PiggyBank,
  'Deuda': Landmark,
  'Ingresos': Banknote,
};

export const DEFAULT_COLORS: Record<string, string> = {
  'Gastos': 'bg-blue-100 text-blue-600',
  'Recibos': 'bg-orange-100 text-orange-600',
  'Ahorros': 'bg-green-100 text-green-600',
  'Deuda': 'bg-red-100 text-red-600',
  'Ingresos': 'bg-emerald-100 text-emerald-600',
};

export const getCategoryIcon = (name: string) => {
  return DEFAULT_ICONS[name] || CircleDollarSign;
};

export const getCategoryColor = (name: string) => {
  return DEFAULT_COLORS[name] || 'bg-gray-100 text-gray-600';
};
