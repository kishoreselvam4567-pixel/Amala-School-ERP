// tests/load_test.mjs
// Comprehensive Multi-Scenario Concurrency & Stress Testing for Amala School ERP

const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:8000/api';

async function timedFetch(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const duration = performance.now() - start;
    const isOk = res.ok;
    await res.text().catch(() => '');
    return { ok: isOk, status: res.status, duration };
  } catch (err) {
    const duration = performance.now() - start;
    return { ok: false, status: 0, error: err.message, duration };
  }
}

async function runScenario({ name, concurrency, totalRequests, taskFn }) {
  console.log(`\n============================================================`);
  console.log(`Running Scenario: ${name}`);
  console.log(`Concurrency: ${concurrency} virtual users | Total Requests: ${totalRequests}`);
  console.log(`============================================================`);

  const results = [];
  let started = 0;
  const overallStart = performance.now();

  async function worker() {
    while (true) {
      const idx = started++;
      if (idx >= totalRequests) break;
      const res = await taskFn(idx);
      results.push(res);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const overallDuration = (performance.now() - overallStart) / 1000;
  const latencies = results.map(r => r.duration).sort((a, b) => a - b);
  const successCount = results.filter(r => r.ok).length;
  const errorCount = results.length - successCount;
  const errorRate = ((errorCount / results.length) * 100).toFixed(2);
  const rps = (results.length / overallDuration).toFixed(2);

  const p50 = latencies[Math.floor(latencies.length * 0.50)]?.toFixed(1) || '0';
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(1) || '0';
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(1) || '0';
  const min = latencies[0]?.toFixed(1) || '0';
  const max = latencies[latencies.length - 1]?.toFixed(1) || '0';

  console.log(`Completed in ${overallDuration.toFixed(2)}s`);
  console.log(`Throughput: ${rps} req/sec`);
  console.log(`Success: ${successCount} | Failed: ${errorCount} (${errorRate}% error rate)`);
  console.log(`Latency: min=${min}ms, p50=${p50}ms, p95=${p95}ms, p99=${p99}ms, max=${max}ms`);

  return {
    scenario: name,
    concurrency,
    totalRequests,
    durationSec: Number(overallDuration.toFixed(2)),
    rps: Number(rps),
    successCount,
    errorCount,
    errorRate: Number(errorRate),
    p50: Number(p50),
    p95: Number(p95),
    p99: Number(p99),
    min: Number(min),
    max: Number(max)
  };
}

async function main() {
  const summary = [];

  // 1. Read-heavy Scenarios: 10, 25, 50, 100, 250 Virtual Users
  const readConcurrencies = [10, 25, 50, 100, 250];
  for (const c of readConcurrencies) {
    const total = Math.min(c * 10, 1500);
    const res = await runScenario({
      name: `Mixed Read Load (${c} VUs)`,
      concurrency: c,
      totalRequests: total,
      taskFn: async (i) => {
        const endpoints = [
          `${BASE_URL}/classes/`,
          `${BASE_URL}/students/?classId=cls_1a`,
          `${BASE_URL}/lookup/teacher1/`,
          `${BASE_URL}/lookup/ADM2026101/`,
          `${BASE_URL}/assignments/incharge/`,
          `${BASE_URL}/staff/?deleted=false`
        ];
        return timedFetch(endpoints[i % endpoints.length]);
      }
    });
    summary.push(res);
  }

  // 2. Auth & Login Lookup Load (50 concurrent users)
  const authRes = await runScenario({
    name: `Auth Identity Lookups (50 VUs)`,
    concurrency: 50,
    totalRequests: 250,
    taskFn: async (i) => {
      const keys = ['teacher1', 'teacher2', 'ADM2026101', '9840100101', 'admin'];
      const key = keys[i % keys.length];
      return timedFetch(`${BASE_URL}/lookup/${key}/`);
    }
  });
  summary.push(authRes);

  // 3. Concurrent Write Operations: Attendance & Marks (25 VUs)
  const writeRes = await runScenario({
    name: `Concurrent Record Upserts (25 VUs)`,
    concurrency: 25,
    totalRequests: 100,
    taskFn: async (i) => {
      const recordId = `bench_att_${i % 10}`;
      return timedFetch(`${BASE_URL}/attendance/${recordId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Teacher-Uid': 'stf_1',
          'X-User-Role': 'staff'
        },
        body: JSON.stringify({
          classId: 'cls_1a',
          date: '2026-10-30',
          markedBy: 'stf_1',
          status: 'present',
          remarks: `Concurrent load test write #${i}`
        })
      });
    }
  });
  summary.push(writeRes);

  // 4. Short Burst Traffic (150 VUs burst)
  const burstRes = await runScenario({
    name: `High-Density Burst Traffic (150 VUs)`,
    concurrency: 150,
    totalRequests: 600,
    taskFn: async (i) => {
      return timedFetch(`${BASE_URL}/classes/`);
    }
  });
  summary.push(burstRes);

  console.log('\n============================================================');
  console.log('FINAL LOAD-TESTING BENCHMARK REPORT:');
  console.table(summary);
  console.log('============================================================');
}

main().catch(console.error);
