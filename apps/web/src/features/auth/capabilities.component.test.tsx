/** @vitest-environment jsdom */

import { renderHook, waitFor } from "@testing-library/react";
import type { ApiClient } from "@voidmix/client";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createPublicAuthCapabilitiesAdapter,
  type PublicAuthCapabilitiesClient,
  useAuthCapabilities,
} from "./capabilities";

describe("public auth capabilities", () => {
  it("uses the unauthenticated typed procedure", async () => {
    const get = vi.fn(async () => ({
      registrationAvailable: false,
      verificationEmailRequestAvailable: false,
      passwordResetRequestAvailable: true,
    }));
    const api = {
      public: { auth: { capabilities: { get } } },
    } as unknown as ApiClient;
    const adapter = createPublicAuthCapabilitiesAdapter(api);

    await expect(adapter.get()).resolves.toMatchObject({ registrationAvailable: false });
    expect(get).toHaveBeenCalledWith({});
  });

  it("updates the fail-open defaults when the request succeeds", async () => {
    const client: PublicAuthCapabilitiesClient = {
      get: async () => ({
        registrationAvailable: false,
        verificationEmailRequestAvailable: false,
        passwordResetRequestAvailable: false,
      }),
    };
    const { result } = renderHook(() => useAuthCapabilities(client));

    expect(result.current.registrationAvailable).toBe(true);
    await waitFor(() => expect(result.current.registrationAvailable).toBe(false));
  });

  it("keeps forms available when the capability request fails", async () => {
    const client: PublicAuthCapabilitiesClient = {
      get: async () => {
        throw new Error("network unavailable");
      },
    };
    const { result } = renderHook(() => useAuthCapabilities(client));

    await waitFor(() => expect(result.current.registrationAvailable).toBe(true));
    expect(result.current.passwordResetRequestAvailable).toBe(true);
  });
});
