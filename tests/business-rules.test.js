import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMoneyModel } from '../src/lib/finance.js';
import { classifyVideo, isYouTubeChannelUrl } from '../src/lib/video-rules.js';

test('classifies the exact four-minute boundary as long-form', () => {
  assert.equal(classifyVideo(239), 'SHORT_FORM');
  assert.equal(classifyVideo(240), 'LONG_FORM');
  assert.equal(classifyVideo(600), 'LONG_FORM');
});

test('accepts YouTube channel URLs and rejects unrelated URLs', () => {
  assert.equal(isYouTubeChannelUrl('https://www.youtube.com/@creator'), true);
  assert.equal(isYouTubeChannelUrl('https://example.com/@creator'), false);
  assert.equal(isYouTubeChannelUrl('not a url'), false);
});

test('derives MRR, paid revenue, costs, profit, and setup status from source records', () => {
  const model = buildMoneyModel(
    [{ id: 'a', status: 'ACTIVE', monthlyFee: 5000, startDate: '2026-01-01' }, { id: 'b', status: 'CHURNED', monthlyFee: 9000 }],
    [{ client: 'a', type: 'SETUP', status: 'PAID', amount: 30000 }, { client: 'a', type: 'MONTHLY', status: 'PENDING', amount: 5000, dueDate: '2026-09-01' }],
    [{ client: 'a', cost: 1200 }, { client: 'a', cost: 800 }],
    new Date('2026-09-28T12:00:00Z'),
  );
  assert.equal(model.mrr, 5000);
  assert.equal(model.totalRevenue, 30000);
  assert.equal(model.totalCost, 2000);
  assert.equal(model.profit, 3000);
  assert.equal(model.breakdown[0].setupPaid, true);
  assert.equal(model.trackedPayments[1].displayStatus, 'OVERDUE');
  assert.equal(model.collection, 50);
});

test('does not fabricate MRR history when no client start dates exist', () => {
  const model = buildMoneyModel([{ id: 'a', status: 'ACTIVE', monthlyFee: 5000 }], [], []);
  assert.deepEqual(model.months, []);
});
