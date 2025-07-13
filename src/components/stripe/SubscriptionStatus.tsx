import React, { useEffect, useState } from 'react';
import { Crown, AlertCircle, CheckCircle } from 'lucide-react';
import { getUserSubscription, getSubscriptionPlanName } from '../../utils/stripe';
import { useAuthStore } from '../../store/authStore';

const SubscriptionStatus: React.FC = () => {
  const { isLoggedIn } = useAuthStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      try {
        const userSubscription = await getUserSubscription();
        setSubscription(userSubscription);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [isLoggedIn]);

  if (!isLoggedIn || loading) {
    return null;
  }

  if (!subscription) {
    return (
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        <AlertCircle className="h-4 w-4 mr-1" />
        <span>No active subscription</span>
      </div>
    );
  }

  const planName = getSubscriptionPlanName(subscription.price_id);
  const isActive = subscription.subscription_status === 'active';

  return (
    <div className="flex items-center text-sm">
      {isActive ? (
        <>
          <Crown className="h-4 w-4 mr-1 text-yellow-500" />
          <span className="text-gray-700 dark:text-gray-300">
            {planName}
          </span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 mr-1 text-red-500" />
          <span className="text-red-600 dark:text-red-400">
            Subscription {subscription.subscription_status}
          </span>
        </>
      )}
    </div>
  );
};

export default SubscriptionStatus;