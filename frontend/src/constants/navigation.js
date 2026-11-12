import { Layers,Smartphone,Package  } from 'lucide-react';

// Add new sections here; the sidebar renders whatever is in this list.
export const NAV_ITEMS = [
  { id: 'phones-cases', label: 'Phones Cases', path: '/dashboard/phones-cases', icon: Smartphone },
  { id: 'my-orders', label: 'My orders', path: '/dashboard/my-orders', icon: Package },
  { id: 'sticker-sheets', label: 'Sticker sheets', path: '/dashboard/sticker-sheets', icon: Layers },
];
