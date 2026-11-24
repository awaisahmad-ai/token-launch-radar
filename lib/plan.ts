const actions: Record<string, [string, string, string]> = {
  'Risk Curators': ['Check vault mandates', 'Compare the curator’s vaults by collateral, borrow caps, fees and available withdrawal liquidity.', 'A vault position can lose value from underlying lending exposure.'],
  'Onchain Capital Allocator': ['Trace the allocation', 'Find the destination vaults, check their weights and read the rules for redemption queues.', 'Track where the capital is deployed as well as who operates the allocator.'],
  Lending: ['Inspect a supply market', 'Check utilization, asset ceilings and withdrawal liquidity. Prefer a supply-only simulation to borrowing.', 'A supply position can face bad debt or paused withdrawals.'],
  Dexs: ['Simulate a spot swap', 'Compare output, price impact and gas against an alternate route. Use a tight rate limit if a campaign requires a real swap.', 'Supplying liquidity adds price divergence and adverse selection risk.'],
  Derivatives: ['Check the test environment', 'Use a public testnet or paper mode, where available. Check collateral, liquidation levels and funding without opening a leveraged position.', 'Verify whether test activity counts before spending on mainnet.'],
  RWA: ['Read eligibility and redemption', 'Check jurisdiction, identity checks, issuer terms and redemption windows before preparing a position.', 'Restricted investor products can require eligibility checks and higher minimums.'],
  Yield: ['Open the vault strategy', 'Compare the underlying assets and chains, exit fees and cooldown. Preview the deposit and withdrawal first.', 'Variable yield, contract risk and delayed exits can offset incentives.'],
  CDP: ['Read the collateral policy', 'Check approved collateral, liquidation haircut and oracle. Use a simulator to compare the impact of a price decline.', 'Borrowing adds liquidation and depeg risk.'],
  'Basis Trading': ['Inspect leverage and funding', 'Read the hedge, counterparties and margin rules. Check whether returns change when funding reverses.', 'A market-neutral label can still carry basis, liquidation and custody risk.'],
  Chain: ['Inspect the official network', 'Compare chain ID and explorer with the official docs. Check for a documented testnet and faucet before testing.', 'Mainnet bridges carry settlement and contract risk.'],
  Payments: ['Check a test route', 'Inspect fees, routing and refund behavior through an official payment simulator or test environment where offered.', 'A payment can be irreversible and balances can remain locked in channels.'],
  Insurance: ['Read the cover wording', 'Check exclusions, a claim example, solvency and the renewal window before paying a premium.', 'A premium is a cost and eligibility depends on the policy wording.'],
  Restaking: ['Review slashing and exits', 'Identify the delegated operator, slashing conditions and the unstaking delay before selecting a vault.', 'A restaked position can lose principal and have a delayed exit.'],
  'Staking Pool': ['Inspect pool terms', 'Compare operator uptime, validator fees and withdrawal delays. Verify the actual staking asset.', 'Slashing and withdrawal constraints vary by pool.'],
};

export function farmPlan(name: string, category: string | null, chain: string | undefined) {
  const [action, detail, risk] = actions[category ?? ''] ?? [
    'Preview the product flow',
    'Find the protocol’s main product, then inspect required assets, allowances, fees and the exit path.',
    'Product features and rewards require independent verification.',
  ];
  const network = chain ? `its ${chain} deployment` : 'the deployment listed in its official docs';
  return [
    {
      action: 'Verify eligibility',
      detail: `Open ${name} through its official documentation, confirm ${network}, and look for published campaign rules and an eligibility checker.`,
      cost: '$0', time: '5–10 min',
    },
    { action, detail, cost: '$0 for research or simulation', time: '10–20 min' },
    {
      action: 'Budget a single action',
      detail: `If there is a documented campaign and its terms fit, quote one qualifying action and its exit before committing. ${risk}`,
      cost: 'live fee quote plus any required capital; $0 if skipped',
      time: '5–15 min to quote',
    },
    {
      action: 'Set a review date',
      detail: 'Record the campaign link, qualifying event or simulation and any release window. Check official announcements again in a week.',
      cost: '$0', time: '5 min weekly',
    },
  ];
}
