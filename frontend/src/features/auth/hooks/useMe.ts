import { getMe, hasToken, logout, type MeUser } from "@/api/auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface UseMeResult {
  user: MeUser | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useMe(): UseMeResult {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken(),
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      logout();
      navigate("/login", { replace: true });
    }
  }, [query.isError, navigate]);

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: hasToken() && !query.isError,
  };
}
