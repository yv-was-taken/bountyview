<script lang="ts">
  import { Button, Card } from '$lib/components';
</script>

<div class="max-w-md mx-auto py-16">
  <Card>
    {#snippet header()}Sign in{/snippet}
    <p class="text-sm text-muted mb-6">
      Use your GitHub account to access employer or candidate workflows.
      By continuing, you agree to the <a href="/terms" class="text-brand underline">Terms of Use</a>.
    </p>
    <form method="POST">
      <input type="hidden" name="providerId" value="github" />
      <Button type="submit">Continue with GitHub</Button>
    </form>
  </Card>
</div>
