import '@auth/sveltekit';

declare module '@auth/sveltekit' {
  interface Session {
    user: {
      id: string;
      role: 'employer' | 'candidate';
      githubId: string;
      githubUsername: string;
      companyId: string | null;
      termsAcceptedAt: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    userId?: string;
    role?: string;
    githubId?: string;
    githubUsername?: string;
    companyId?: string | null;
    email?: string | null;
    termsAcceptedAt?: string | null;
  }
}
