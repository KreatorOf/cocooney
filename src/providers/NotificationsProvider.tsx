import { useEffect } from 'react';

import { syncCreditReminders } from '@/lib/notifications';
import { useBudgetStore } from '@/store/useBudgetStore';

/**
 * Replanifie les rappels locaux de crédits à l'ouverture et à chaque
 * changement de la liste des crédits (ajout / paiement / suppression / sync).
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const credits = useBudgetStore((s) => s.credits);

  useEffect(() => {
    void syncCreditReminders(credits);
  }, [credits]);

  return <>{children}</>;
}
