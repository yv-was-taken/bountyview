interface EmailContent {
  subject: string;
  textBody: string;
  htmlBody: string;
}

function wrap(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:40px 20px;background:#f5f2eb;font-family:'JetBrains Mono',monospace">
<div style="max-width:560px;margin:0 auto;background:#fff;border:2px solid #1a1a1a;padding:32px">
<h1 style="margin:0 0 24px;font-size:20px;letter-spacing:0.05em;color:#1a1a1a">${title}</h1>
${bodyHtml}
<hr style="border:none;border-top:1px solid #1a1a1a;margin:24px 0">
<p style="font-size:12px;color:#6b6b6b;margin:0">BOUNTYVIEW — bounty-based technical interviews</p>
</div></body></html>`;
}

export const templates: Record<string, (data: Record<string, string>) => EmailContent> = {
  bounty_claimed: (d) => ({
    subject: `${d.candidate} claimed your bounty: ${d.title}`,
    textBody: `${d.candidate} claimed your bounty "${d.title}". They now have access to the repo and can start working.`,
    htmlBody: wrap(
      'Bounty Claimed',
      `<p style="color:#1a1a1a;line-height:1.6"><strong>${d.candidate}</strong> claimed your bounty <strong>"${d.title}"</strong>.</p><p style="color:#6b6b6b">They now have repo access and can start working on a solution.</p>`
    )
  }),

  submission_received: (d) => ({
    subject: `New submission for: ${d.title}`,
    textBody: `${d.candidate} submitted a solution for "${d.title}". Review it in your dashboard.`,
    htmlBody: wrap(
      'Submission Received',
      `<p style="color:#1a1a1a;line-height:1.6"><strong>${d.candidate}</strong> submitted a solution for <strong>"${d.title}"</strong>.</p><p><a href="${d.dashboardUrl}" style="display:inline-block;padding:10px 20px;background:#2d5a27;color:#fff;text-decoration:none;border:2px solid #1a1a1a;font-family:'JetBrains Mono',monospace;font-size:14px">Review Submission</a></p>`
    )
  }),

  winner_selected: (d) => ({
    subject: `You won the bounty: ${d.title}!`,
    textBody: `Congratulations! You won the bounty "${d.title}". Payout of ${d.amount} USDC has been initiated.`,
    htmlBody: wrap(
      'You Won!',
      `<p style="color:#1a1a1a;line-height:1.6">Congratulations! You won the bounty <strong>"${d.title}"</strong>.</p><p style="font-size:24px;color:#2d5a27;font-weight:bold;margin:16px 0">${d.amount} USDC</p><p style="color:#6b6b6b">Your payout has been initiated. Check your wallet for details.</p>`
    )
  }),

  bounty_cancelled: (d) => ({
    subject: `Bounty cancelled: ${d.title}`,
    textBody: `The bounty "${d.title}" has been cancelled by the employer. Your repo access has been revoked.`,
    htmlBody: wrap(
      'Bounty Cancelled',
      `<p style="color:#1a1a1a;line-height:1.6">The bounty <strong>"${d.title}"</strong> has been cancelled by the employer.</p><p style="color:#6b6b6b">Your repository access has been revoked.</p>`
    )
  }),

  payout_completed: (d) => ({
    subject: `Payout processed: ${d.amount} USDC`,
    textBody: `Your withdrawal of ${d.amount} USDC has been processed successfully.`,
    htmlBody: wrap(
      'Payout Processed',
      `<p style="color:#1a1a1a;line-height:1.6">Your withdrawal has been processed.</p><p style="font-size:24px;color:#2d5a27;font-weight:bold;margin:16px 0">${d.amount} USDC</p>`
    )
  }),

  payout_failed: (d) => ({
    subject: `Payout failed: ${d.amount} USDC`,
    textBody: `Your withdrawal of ${d.amount} USDC failed. Please retry from your wallet.`,
    htmlBody: wrap(
      'Payout Failed',
      `<p style="color:#1a1a1a;line-height:1.6">Your withdrawal of <strong>${d.amount} USDC</strong> failed.</p><p><a href="${d.walletUrl}" style="display:inline-block;padding:10px 20px;background:#c45d3e;color:#fff;text-decoration:none;border:2px solid #1a1a1a;font-family:'JetBrains Mono',monospace;font-size:14px">Retry in Wallet</a></p>`
    )
  })
};
