<script lang="ts">
  import { Card, Badge, EmptyState } from '$lib/components';

  const { data } = $props();
</script>

<h1 class="font-mono text-2xl font-bold mb-6">Templates</h1>

{#if data.templates.length === 0}
  <EmptyState message="No templates available yet." />
{:else}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each data.templates as template}
      <Card>
        <h2 class="font-mono font-semibold mb-2">{template.title}</h2>
        <p class="text-sm text-muted mb-3">{template.description}</p>
        <div class="flex flex-wrap items-center gap-2">
          <Badge>{template.roleLevel}</Badge>
          {#each template.tags as tag}
            <Badge variant="muted">{tag}</Badge>
          {/each}
        </div>
      </Card>
    {/each}
  </div>
{/if}
