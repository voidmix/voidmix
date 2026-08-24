import { createApiClient, type ApiClient } from "@voidmix/client";
import { useEffect, useState } from "react";

export type PublicAuthCapabilities = Awaited<
  ReturnType<ApiClient["public"]["auth"]["capabilities"]["get"]>
>;

export interface PublicAuthCapabilitiesClient {
  get(): Promise<PublicAuthCapabilities>;
}

const failOpenCapabilities: PublicAuthCapabilities = {
  registrationAvailable: true,
  verificationEmailRequestAvailable: true,
  passwordResetRequestAvailable: true,
};

function createConfiguredApiClient() {
  return createApiClient({
    fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
}

export function createPublicAuthCapabilitiesAdapter(
  api: ApiClient = createConfiguredApiClient(),
): PublicAuthCapabilitiesClient {
  return {
    get: () => api.public.auth.capabilities.get({}),
  };
}

export const publicAuthCapabilitiesClient = createPublicAuthCapabilitiesAdapter();

export function useAuthCapabilities(
  client: PublicAuthCapabilitiesClient = publicAuthCapabilitiesClient,
): PublicAuthCapabilities {
  const [capabilities, setCapabilities] = useState(failOpenCapabilities);

  useEffect(() => {
    let active = true;
    void client
      .get()
      .then((next) => {
        if (active) setCapabilities(next);
      })
      .catch(() => {
        // Public auth navigation deliberately fails open. The server remains authoritative.
      });
    return () => {
      active = false;
    };
  }, [client]);

  return capabilities;
}
