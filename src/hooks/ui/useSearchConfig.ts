
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function useSearchConfig() {
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(false);
  const { toast } = useToast();

  const toggleOnlineSearch = (enabled: boolean) => {
    setEnableOnlineSearch(enabled);
    toast({ 
      title: enabled ? "Online Search Enabled" : "Online Search Disabled" 
    });
  };

  return {
    enableOnlineSearch,
    toggleOnlineSearch
  };
}
