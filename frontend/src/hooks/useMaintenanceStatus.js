import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../utils/api";
import session from "../utils/session";

/**
 * useMaintenanceStatus - Hook to check if user is affected by maintenance mode
 *
 * Returns:
 * - isAffected: boolean - Whether current user is blocked by maintenance
 * - isEnabled: boolean - Whether maintenance mode is enabled globally
 * - title: string - Maintenance title
 * - message: string - Maintenance message
 * - estimatedEndTime: string|null - Estimated end time
 * - loading: boolean - Whether check is in progress
 * - refresh: function - Manually refresh maintenance status
 */
const useMaintenanceStatus = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [status, setStatus] = useState({
    isAffected: false,
    isEnabled: false,
    title: "System Maintenance",
    message: "We're currently performing maintenance. Please check back soon.",
    estimatedEndTime: null,
    loading: true,
  });

  // Check if user has valid auth
  const hasAuth =
    isAuthenticated || (!!session.getToken() && !!session.getUser());

  const checkMaintenanceStatus = useCallback(async () => {
    // If not authenticated, check public endpoint
    if (!hasAuth) {
      try {
        const res = await api.get("/maintenance/status");
        setStatus({
          isAffected: res.data.isEnabled, // Non-authenticated users always affected if enabled
          isEnabled: res.data.isEnabled,
          title: res.data.title || "System Maintenance",
          message:
            res.data.message || "We're currently performing maintenance.",
          estimatedEndTime: res.data.estimatedEndTime,
          loading: false,
        });
      } catch (err) {
        // If endpoint fails, assume no maintenance
        setStatus((prev) => ({ ...prev, loading: false }));
      }
      return;
    }

    // For authenticated users, check if they're specifically affected
    try {
      const res = await api.get("/maintenance/check");
      setStatus({
        isAffected: res.data.isAffected,
        isEnabled: res.data.isEnabled,
        title: res.data.title || "System Maintenance",
        message: res.data.message || "We're currently performing maintenance.",
        estimatedEndTime: res.data.estimatedEndTime,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to check maintenance status:", err);
      // If endpoint fails, assume no maintenance to avoid blocking users
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  }, [hasAuth]);

  useEffect(() => {
    checkMaintenanceStatus();

    // Check maintenance status periodically (every 2 minutes)
    const interval = setInterval(checkMaintenanceStatus, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkMaintenanceStatus]);

  // Re-check when user changes (e.g., login/logout)
  useEffect(() => {
    if (user) {
      checkMaintenanceStatus();
    }
  }, [user, checkMaintenanceStatus]);

  return {
    ...status,
    refresh: checkMaintenanceStatus,
  };
};

export default useMaintenanceStatus;
