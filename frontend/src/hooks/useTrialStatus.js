import { useMemo } from "react";
import { useSelector } from "react-redux";

const TRIAL_DAYS = 15;

// Define which pages each plan can access
const PLAN_PERMISSIONS = {
  // Silver plan has limited access
  silver: [
    "/dashboard",
    "/services",
    "/chat",
    "/team",
    "/events",
    "/projects",
    "/settings",
    "/payment", // Always allow payment page for upgrades
  ],
  // Gold plan has full access
  gold: [
    "/dashboard",
    "/services",
    "/chat",
    "/team",
    "/events",
    "/projects",
    "/settings",
    "/quotations",
    "/billing",
    "/policy",
    "/payment",
  ],
  // Free/trial users have same access as silver during trial
  free: [
    "/dashboard",
    "/services",
    "/chat",
    "/team",
    "/events",
    "/projects",
    "/settings",
    "/payment",
  ],
  none: [
    "/dashboard",
    "/services",
    "/chat",
    "/team",
    "/events",
    "/projects",
    "/settings",
    "/payment",
  ],
};

// Pages that require Gold plan
const GOLD_ONLY_PAGES = ["/quotations", "/billing", "/policy"];

/**
 * Hook to check user's trial status and plan permissions
 * Returns information about whether trial is active, expired, days remaining, etc.
 */
const useTrialStatus = () => {
  const { user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.settings || {});

  const trialStatus = useMemo(() => {
    // Check if user has a paid plan
    const rawPlan =
      (profile && (profile.plan || profile.subscription?.tier)) ||
      user?.plan ||
      "free";
    const planTier = String(rawPlan).toLowerCase();
    const hasPaidPlan = planTier === "silver" || planTier === "gold";
    const isGoldPlan = planTier === "gold";
    const isSilverPlan = planTier === "silver";

    // Get allowed pages for this plan
    const allowedPages = PLAN_PERMISSIONS[planTier] || PLAN_PERMISSIONS.free;

    // Helper function to check if a path is allowed
    const canAccessPage = (path) => {
      // Always allow payment page
      if (path === "/payment") return true;

      // Check if path starts with any allowed page
      return allowedPages.some(
        (allowed) => path === allowed || path.startsWith(allowed + "/"),
      );
    };

    // Check if a specific feature requires Gold plan
    const requiresGoldPlan = (path) => {
      return GOLD_ONLY_PAGES.some(
        (goldPage) => path === goldPage || path.startsWith(goldPage + "/"),
      );
    };

    // If user has a paid plan, calculate based on subscription
    if (hasPaidPlan) {
      let daysRemaining = 365;

      // Calculate from plan activation date (planActivatedAt + 365 days)
      const planActivatedAt = profile?.planActivatedAt || user?.planActivatedAt;

      if (planActivatedAt) {
        const activationDate = new Date(planActivatedAt);
        const expiryDate = new Date(activationDate);
        expiryDate.setDate(expiryDate.getDate() + 365); // Add 365 days

        const now = new Date();
        const diff = expiryDate - now;
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      } else if (profile?.subscription?.daysRemaining !== undefined) {
        // Fallback to subscription data if available
        daysRemaining = profile.subscription.daysRemaining;
      } else if (profile?.subscription?.endDate) {
        const end = new Date(profile.subscription.endDate);
        const diff = end - new Date();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      return {
        isOnTrial: false,
        isExpired: false,
        hasPaidPlan: true,
        isGoldPlan,
        isSilverPlan,
        daysRemaining,
        daysUsed: 0,
        planTier,
        canUseFeatures: true,
        allowedPages,
        canAccessPage,
        requiresGoldPlan,
        goldOnlyPages: GOLD_ONLY_PAGES,
      };
    }

    // Calculate trial days based on registration date
    const createdAt = user?.createdAt || profile?.createdAt;

    if (!createdAt) {
      // No registration date - assume trial is active with full days
      return {
        isOnTrial: true,
        isExpired: false,
        hasPaidPlan: false,
        isGoldPlan: false,
        isSilverPlan: false,
        daysRemaining: TRIAL_DAYS,
        daysUsed: 0,
        planTier,
        canUseFeatures: true,
        allowedPages,
        canAccessPage,
        requiresGoldPlan,
        goldOnlyPages: GOLD_ONLY_PAGES,
      };
    }

    const registrationDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now - registrationDate;
    const daysUsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, TRIAL_DAYS - daysUsed);
    const isExpired = daysRemaining <= 0;

    return {
      isOnTrial: true,
      isExpired,
      hasPaidPlan: false,
      isGoldPlan: false,
      isSilverPlan: false,
      daysRemaining,
      daysUsed,
      planTier,
      canUseFeatures: !isExpired, // Can only use features if trial not expired
      allowedPages,
      canAccessPage,
      requiresGoldPlan,
      goldOnlyPages: GOLD_ONLY_PAGES,
    };
  }, [user, profile]);

  return trialStatus;
};

export default useTrialStatus;
export { PLAN_PERMISSIONS, GOLD_ONLY_PAGES };
