<script lang="ts">
  const { data } = $props();

  async function withdrawToBank(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const payload = {
      amountUsdc: Number(formData.get('amountUsdc') ?? 0),
      bankAccountId: String(formData.get('bankAccountId') ?? ''),
      destinationCurrency: String(formData.get('destinationCurrency') ?? 'USD')
    };

    const res = await fetch('/api/wallet/circle/withdraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    alert(res.ok ? 'Withdrawal requested.' : body.error ?? 'Withdrawal failed');
  }
</script>

<section class="grid" style="gap: 1rem;">
  <article class="card">
    <h1>Wallet</h1>
    <p style="color: var(--muted);">Withdraw winnings to bank (Circle) or self-transfer USDC.</p>

    <form class="grid grid-3" onsubmit={withdrawToBank}>
      <label>Amount (USDC)
        <input name="amountUsdc" type="number" min="1" step="0.01" required />
      </label>
      <label>Bank Account ID
        <input name="bankAccountId" required />
      </label>
      <label>Currency
        <input name="destinationCurrency" value="USD" maxlength="3" required />
      </label>
      <button type="submit">Withdraw to Bank</button>
    </form>
  </article>

  <article class="card">
    <h2>Payout History</h2>
    {#if data.records.length === 0}
      <p>No payouts yet.</p>
    {:else}
      <ul>
        {#each data.records as record}
          <li>
            {record.amountUsdc} USDC · {record.status} · {record.provider}
            {#if record.externalRef}
              · Ref: {record.externalRef}
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </article>
</section>
