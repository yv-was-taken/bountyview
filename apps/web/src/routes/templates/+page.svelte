<script lang="ts">
  const { data } = $props();
</script>

<section class="grid" style="gap: 1rem;">
  <h1>Template Library</h1>
  <p style="color: var(--muted);">MVP includes schema and browsing; curation can be expanded later.</p>

  {#if data.templates.length === 0}
    <article class="card">No templates populated yet.</article>
  {:else}
    <div class="grid">
      {#each data.templates as template}
        <article class="card">
          <h2 style="margin-top: 0;">{template.title}</h2>
          <p>{template.description}</p>
          <small>{template.roleLevel} · {template.tags.join(', ')}</small>
        </article>
      {/each}
    </div>
  {/if}
</section>
