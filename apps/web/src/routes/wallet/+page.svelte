<script lang="ts">
  import { Button, Card, Badge, Input, Select, EmptyState, toast } from '$lib/components';

  const { data } = $props();

  let loading = $state(false);

  async function withdrawToBank(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      amountUsdc: Number(formData.get('amountUsdc') ?? 0),
      bankAccountId: String(formData.get('bankAccountId') ?? ''),
      destinationCurrency: String(formData.get('destinationCurrency') ?? 'USD')
    };

    loading = true;
    try {
      const res = await fetch('/api/wallet/circle/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (res.ok) {
        toast.success('Withdrawal requested.');
        form.reset();
      } else {
        toast.error(body.error ?? 'Withdrawal failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      loading = false;
    }
  }

  function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  }
</script>

<h1 class="font-mono text-2xl font-bold mb-6">Wallet</h1>

<div class="space-y-6">
  <Card>
    {#snippet header()}Withdraw{/snippet}

    <form class="grid grid-cols-1 md:grid-cols-3 gap-4" onsubmit={withdrawToBank}>
      <Input name="amountUsdc" type="number" min="1" step="0.01" required label="Amount USDC" />
      <Input name="bankAccountId" required label="Bank Account ID" />
      <Select name="destinationCurrency" label="Currency">
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="GBP">GBP</option>
      </Select>
      <div class="md:col-span-3">
        <Button type="submit" {loading}>Withdraw to Bank</Button>
      </div>
    </form>
  </Card>

  <Card>
    {#snippet header()}History{/snippet}

    {#if data.records.length === 0}
      <EmptyState message="No payouts yet." />
    {:else}
      <div class="divide-y divide-ink/20">
        {#each data.records as record}
          <div class="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div class="flex items-center gap-3">
              <span class="font-mono text-sm">{record.amountUsdc} USDC</span>
              <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
              <span class="text-sm text-muted">{record.provider}</span>
            </div>
            {#if record.externalRef}
              <span class="text-xs text-muted">Ref: {record.externalRef}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </Card>
</div>
