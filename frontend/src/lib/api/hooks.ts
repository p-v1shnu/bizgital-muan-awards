'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, apiFetchPage } from './client';

/** Read one resource. The key is the path, so invalidating by path just works. */
export function useApi<T>(path: string | null, options?: { enabled?: boolean }) {
  return useQuery<T>({
    queryKey: [path],
    queryFn: () => apiFetch<T>(path as string),
    enabled: options?.enabled !== false && path !== null,
  });
}

/** Read a paginated list, keeping the `meta` envelope. */
export function useApiPage<T>(path: string | null) {
  return useQuery({
    queryKey: [path],
    queryFn: () => apiFetchPage<T>(path as string),
    enabled: path !== null,
  });
}

type Method = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Write, then refresh whatever the write touched. `invalidate` takes path
 * prefixes, so passing '/admin/editions' also refreshes '/admin/editions/x'.
 *
 * When the path is built from the variables, those variables are usually not
 * all meant for the body — an `id` used in the URL would be rejected by the
 * API, whose validation pipe forbids unknown properties. Pass `buildBody` to
 * say exactly what gets sent.
 */
export function useApiMutation<TVars = unknown, TResult = unknown>(
  buildPath: string | ((vars: TVars) => string),
  method: Method,
  invalidate: string[] = [],
  buildBody?: (vars: TVars) => unknown,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TVars>({
    mutationFn: (vars) => {
      const path = typeof buildPath === 'function' ? buildPath(vars) : buildPath;
      return apiFetch<TResult>(path, {
        method,
        body: method === 'DELETE' ? undefined : (buildBody ? buildBody(vars) : vars),
      });
    },
    onSuccess: () => {
      for (const prefix of invalidate) {
        queryClient.invalidateQueries({
          predicate: (query) => String(query.queryKey[0] ?? '').startsWith(prefix),
        });
      }
    },
  });
}
