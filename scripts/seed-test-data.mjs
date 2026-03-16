import pg from "pg";
const { Client } = pg;

const ROOT = "0xd6a62d2fbbfec363dea3d2e7d3cf0e271311e097";

// Generate fake wallet addresses
const wallets = Array.from({ length: 10 }, (_, i) =>
  "0x" + "a".repeat(38) + (i + 10).toString()
);

const client = new Client({
  connectionString:
    "postgresql://postgres:onelong53541314@db.fitufrqpmcsxbvubjyqd.supabase.co:5432/postgres",
});

async function run() {
  await client.connect();

  // 1. Ensure root member exists with an order
  await client.query(
    `INSERT INTO members (wallet_address, referrer_address, level)
     VALUES ($1, NULL, 0)
     ON CONFLICT (wallet_address) DO NOTHING`,
    [ROOT]
  );

  // Ensure root has an active order (芯未来4号, 0.65%/day, 2000 USDT)
  const { rows: rootOrders } = await client.query(
    `SELECT id FROM orders WHERE wallet_address = $1 AND status = 'active' LIMIT 1`,
    [ROOT]
  );
  if (rootOrders.length === 0) {
    await client.query(
      `INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, status, last_earning_date, tx_hash)
       VALUES ($1, 4, '芯未来3号', 2000, 0.65, 240, NOW() + INTERVAL '240 days', 'active', CURRENT_DATE, 'test_root_tx')`,
      [ROOT]
    );
    console.log("Created root order: 2000 USDT 芯未来3号 (0.65%/day)");
  } else {
    console.log("Root already has active order");
  }

  // 2. Create 6 direct referrals with orders
  const directWallets = wallets.slice(0, 6);
  const products = [
    { id: 1, name: "芯未来", rate: 0.3, days: 30, amount: 500 },
    { id: 2, name: "芯未来1号", rate: 0.41, days: 120, amount: 800 },
    { id: 3, name: "芯未来2号", rate: 0.5, days: 180, amount: 1000 },
    { id: 1, name: "芯未来", rate: 0.3, days: 30, amount: 300 },
    { id: 4, name: "芯未来3号", rate: 0.65, days: 240, amount: 2000 },
    { id: 5, name: "芯未来4号", rate: 0.72, days: 360, amount: 3000 },
  ];

  for (let i = 0; i < directWallets.length; i++) {
    const w = directWallets[i];
    const p = products[i];

    await client.query(
      `INSERT INTO members (wallet_address, referrer_address, level)
       VALUES ($1, $2, 0)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [w, ROOT]
    );

    const { rows: existing } = await client.query(
      `SELECT id FROM orders WHERE wallet_address = $1 AND status = 'active' LIMIT 1`,
      [w]
    );
    if (existing.length === 0) {
      await client.query(
        `INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, status, last_earning_date, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(days => $6), 'active', CURRENT_DATE - INTERVAL '1 day', $7)`,
        [w, p.id, p.name, p.amount, p.rate, p.days, `test_direct_${i}_tx`]
      );
      console.log(`Direct #${i + 1}: ${w.slice(0, 10)}... → ${p.amount} USDT ${p.name} (${p.rate}%/day)`);
    }
  }

  // 3. Create 4 indirect referrals (under first 2 direct members)
  const indirectWallets = wallets.slice(6, 10);
  const indirectProducts = [
    { id: 2, name: "芯未来1号", rate: 0.41, days: 120, amount: 1000 },
    { id: 3, name: "芯未来2号", rate: 0.5, days: 180, amount: 1500 },
    { id: 1, name: "芯未来", rate: 0.3, days: 30, amount: 500 },
    { id: 4, name: "芯未来3号", rate: 0.65, days: 240, amount: 2000 },
  ];

  for (let i = 0; i < indirectWallets.length; i++) {
    const w = indirectWallets[i];
    const parent = directWallets[i < 2 ? 0 : 1]; // first 2 under direct#0, next 2 under direct#1
    const p = indirectProducts[i];

    await client.query(
      `INSERT INTO members (wallet_address, referrer_address, level)
       VALUES ($1, $2, 0)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [w, parent]
    );

    const { rows: existing } = await client.query(
      `SELECT id FROM orders WHERE wallet_address = $1 AND status = 'active' LIMIT 1`,
      [w]
    );
    if (existing.length === 0) {
      await client.query(
        `INSERT INTO orders (wallet_address, product_id, product_name, amount, daily_rate, days, end_date, status, last_earning_date, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(days => $6), 'active', CURRENT_DATE - INTERVAL '1 day', $7)`,
        [w, p.id, p.name, p.amount, p.rate, p.days, `test_indirect_${i}_tx`]
      );
      console.log(`Indirect #${i + 1}: ${w.slice(0, 10)}... (under ${parent.slice(0, 10)}...) → ${p.amount} USDT ${p.name}`);
    }
  }

  // 4. Run level check for root
  console.log("\n--- Running level check for root ---");
  await client.query(`SELECT check_and_upgrade_level($1)`, [ROOT]);

  const { rows: [rootMember] } = await client.query(
    `SELECT level FROM members WHERE wallet_address = $1`,
    [ROOT]
  );
  console.log(`Root level after check: V${rootMember.level}`);

  // 5. Run settlement for root wallet to trigger team bonus
  console.log("\n--- Running settlement for root ---");
  await client.query(`SELECT process_wallet_orders($1)`, [ROOT]);

  // 6. Show team stats
  const { rows: [stats] } = await client.query(
    `SELECT get_team_stats($1) as stats`,
    [ROOT]
  );
  console.log("\nTeam stats:", JSON.stringify(stats.stats, null, 2));

  // 7. Show earnings
  const { rows: [earnings] } = await client.query(
    `SELECT get_earnings($1) as earnings`,
    [ROOT]
  );
  console.log("\nEarnings:", JSON.stringify(earnings.earnings, null, 2));

  // 8. Show team bonus rewards
  const { rows: bonuses } = await client.query(
    `SELECT * FROM rewards WHERE wallet_address = $1 AND type = 'team_bonus' ORDER BY created_at DESC LIMIT 5`,
    [ROOT]
  );
  console.log("\nTeam bonus rewards:");
  bonuses.forEach((b) =>
    console.log(`  +${parseFloat(b.amount).toFixed(4)} U | ${b.description}`)
  );

  // 9. Show all members in tree
  const { rows: members } = await client.query(
    `WITH RECURSIVE team AS (
      SELECT wallet_address, referrer_address, level, 0 as depth FROM members WHERE wallet_address = $1
      UNION ALL
      SELECT m.wallet_address, m.referrer_address, m.level, t.depth + 1
      FROM members m INNER JOIN team t ON m.referrer_address = t.wallet_address
    )
    SELECT t.wallet_address, t.level, t.depth,
      COALESCE((SELECT SUM(amount) FROM orders WHERE wallet_address = t.wallet_address AND status = 'active'), 0) as staking
    FROM team t ORDER BY t.depth, t.wallet_address`,
    [ROOT]
  );
  console.log("\nTeam tree:");
  members.forEach((m) =>
    console.log(
      `${"  ".repeat(m.depth)}${m.wallet_address.slice(0, 10)}... V${m.level} | staking: ${parseFloat(m.staking).toFixed(0)} U`
    )
  );

  await client.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
