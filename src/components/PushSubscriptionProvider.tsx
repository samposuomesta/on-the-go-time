import { usePushSubscription } from '@/hooks/usePushSubscription';

export function PushSubscriptionProvider() {
  usePushSubscription();
  return null;
}
