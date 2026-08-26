"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface NetworkingIdentity {
  id: string;
  displayName: string;
}

const STORAGE_KEY = "quiznight:networking:participant";

export interface JoinDetails {
  displayName: string;
  company?: string;
  contact?: string;
}

async function joinNetworking({ displayName, company, contact }: JoinDetails): Promise<NetworkingIdentity> {
  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("networking_join", {
    p_display_name: displayName,
    p_company: company || undefined,
    p_contact: contact || undefined,
  });
  if (error || !data) throw new Error(error?.message ?? "Couldn't join");

  const identity: NetworkingIdentity = { id: data as unknown as string, displayName };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // A locked-down browser (private mode quota) shouldn't block play — the
    // identity still lives in React state for this session.
  }
  return identity;
}

/**
 * Remembers who this phone belongs to so a returning participant goes
 * straight back to adding connections instead of re-registering — the spec's
 * "should not need to enter their details repeatedly".
 *
 * Unlike the quiz's useParticipant, the stored id can't be verified with a
 * SELECT: anon has no read access to networking_participants by design. The
 * id is instead validated lazily, the first time a connection is submitted —
 * see `forget`, which the portal calls when the server reports the row is
 * gone (the only case being an admin wiping the table between rehearsal and
 * the real event).
 */
export function useNetworkingParticipant() {
  // One piece of state, not two: restoring from storage is a single atomic
  // hydration ("who is this, and are we done looking?"), and splitting it
  // would publish a frame claiming ready with no participant.
  const [state, setState] = useState<{ participant: NetworkingIdentity | null; ready: boolean }>({
    participant: null,
    ready: false,
  });

  useEffect(() => {
    // Read post-mount, not in a lazy initializer: localStorage doesn't exist
    // during SSR and reading it on first render breaks hydration.
    let restored: NetworkingIdentity | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as NetworkingIdentity;
        if (stored?.id) restored = stored;
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    // The one-time hydration of this hook from the browser's store; there is
    // no cascade for the lint rule to protect against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ participant: restored, ready: true });
  }, []);

  const join = useCallback(async (details: JoinDetails) => {
    const identity = await joinNetworking(details);
    setState({ participant: identity, ready: true });
    return identity;
  }, []);

  const forget = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState({ participant: null, ready: true });
  }, []);

  return { participant: state.participant, ready: state.ready, join, forget };
}
