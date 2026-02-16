export async function retryFailedIntegrations(payload: Record<string, unknown>) {
  // Centralized retry channel for webhook fan-out or integration retries.
  // Extend this with provider-specific backoff and dead-letter behavior.
  console.warn('[retry_failed_integrations]', payload);
}
