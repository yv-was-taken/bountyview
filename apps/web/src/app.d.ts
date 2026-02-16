import type { AuthUser } from '@bountyview/shared';

declare global {
  namespace App {
    interface Locals {
      auth: () => Promise<import('@auth/sveltekit').Session | null>;
      currentUser: AuthUser | null;
    }
    interface PageData {
      session: import('@auth/sveltekit').Session | null;
      currentUser: AuthUser | null;
    }
  }
}

export {};
