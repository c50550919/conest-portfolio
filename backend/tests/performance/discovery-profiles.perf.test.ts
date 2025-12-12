/**
 * Discovery Profiles Performance Test
 *
 * Purpose: Validate GET /api/discovery/profiles meets <100ms P95 target
 * Constitution: Principle IV (Performance - User Experience)
 *
 * Target: <100ms P95 response time (with Redis cache)
 *
 * Created: 2025-10-06
 */

import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase, createTestUser, getAuthToken } from '../helpers/test-utils';

/**
 * Performance Test Configuration
 */
const PERF_CONFIG = {
  warmupRequests: 10,       // Warm up cache before measurement
  measurementRequests: 100, // Number of requests to measure
  targetP95: 100,           // Target P95 latency in milliseconds
  targetP99: 200,           // Target P99 latency in milliseconds
  targetMedian: 50,         // Target median latency in milliseconds
};

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[index];
}

/**
 * Calculate statistics from response times
 */
function calculateStats(responseTimes: number[]) {
  const sorted = [...responseTimes].sort((a, b) => a - b);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    mean: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
    count: responseTimes.length,
  };
}

describe('PERFORMANCE TEST: GET /api/discovery/profiles', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();

    // Create test user with complete profile
    const user = await createTestUser({
      email: 'perf-test@example.com',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Performance',
        age: 30,
        city: 'San Francisco',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 2000,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    userId = user.id;
    authToken = getAuthToken(user.id);

    // Create additional test users for profile queue (at least 50 profiles)
    const createUserPromises = [];
    for (let i = 0; i < 50; i++) {
      createUserPromises.push(
        createTestUser({
          email: `perf-user-${i}@example.com`,
          verified: true,
          idVerified: true,
          backgroundCheckComplete: true,
          phoneVerified: true,
          profile: {
            firstName: `User${i}`,
            age: 25 + (i % 15),
            city: i % 2 === 0 ? 'San Francisco' : 'Oakland',
            childrenCount: 1 + (i % 3),
            childrenAgeGroups: i % 3 === 0 ? ['toddler'] : i % 3 === 1 ? ['elementary'] : ['teen'],
            budget: 1500 + (i % 10) * 100,
            moveInDate: new Date(Date.now() + (30 + i) * 24 * 60 * 60 * 1000),
          },
        }),
      );
    }

    await Promise.all(createUserPromises);
  }, 60000); // 60s timeout for setup

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('P95 Latency Target: <100ms', () => {
    it('should meet P95 <100ms target (cold cache)', async () => {
      const responseTimes: number[] = [];

      // Measure response times
      for (let i = 0; i < PERF_CONFIG.measurementRequests; i++) {
        const startTime = Date.now();

        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      const stats = calculateStats(responseTimes);

      // Log performance metrics
      console.log('\n📊 Performance Metrics (Cold Cache):');
      console.log(`   Min:     ${stats.min}ms`);
      console.log(`   Median:  ${stats.median}ms`);
      console.log(`   Mean:    ${Math.round(stats.mean)}ms`);
      console.log(`   P95:     ${stats.p95}ms ${stats.p95 <= PERF_CONFIG.targetP95 ? '✅' : '❌'}`);
      console.log(`   P99:     ${stats.p99}ms ${stats.p99 <= PERF_CONFIG.targetP99 ? '✅' : '❌'}`);
      console.log(`   Max:     ${stats.max}ms`);
      console.log(`   Requests: ${stats.count}`);

      // Assertions
      expect(stats.p95).toBeLessThanOrEqual(PERF_CONFIG.targetP95);
    }, 120000); // 120s timeout

    it('should meet P95 <100ms target (warm cache - Redis)', async () => {
      // Warmup: Prime Redis cache
      for (let i = 0; i < PERF_CONFIG.warmupRequests; i++) {
        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      // Measure response times with warm cache
      const responseTimes: number[] = [];

      for (let i = 0; i < PERF_CONFIG.measurementRequests; i++) {
        const startTime = Date.now();

        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      const stats = calculateStats(responseTimes);

      // Log performance metrics
      console.log('\n📊 Performance Metrics (Warm Cache - Redis):');
      console.log(`   Min:     ${stats.min}ms`);
      console.log(`   Median:  ${stats.median}ms ${stats.median <= PERF_CONFIG.targetMedian ? '✅' : '❌'}`);
      console.log(`   Mean:    ${Math.round(stats.mean)}ms`);
      console.log(`   P95:     ${stats.p95}ms ${stats.p95 <= PERF_CONFIG.targetP95 ? '✅' : '❌'}`);
      console.log(`   P99:     ${stats.p99}ms ${stats.p99 <= PERF_CONFIG.targetP99 ? '✅' : '❌'}`);
      console.log(`   Max:     ${stats.max}ms`);
      console.log(`   Requests: ${stats.count}`);

      // Assertions - warm cache should be significantly faster
      expect(stats.p95).toBeLessThanOrEqual(PERF_CONFIG.targetP95);
      expect(stats.median).toBeLessThanOrEqual(PERF_CONFIG.targetMedian);
    }, 120000); // 120s timeout
  });

  describe('Response Time Consistency', () => {
    it('should have consistent response times (low variance)', async () => {
      // Warmup cache
      for (let i = 0; i < PERF_CONFIG.warmupRequests; i++) {
        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      // Measure response times
      const responseTimes: number[] = [];

      for (let i = 0; i < 50; i++) {
        const startTime = Date.now();

        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      const stats = calculateStats(responseTimes);

      // Calculate variance
      const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - stats.mean, 2), 0) / responseTimes.length;

      const standardDeviation = Math.sqrt(variance);

      console.log('\n📊 Response Time Consistency:');
      console.log(`   Mean:    ${Math.round(stats.mean)}ms`);
      console.log(`   Std Dev: ${Math.round(standardDeviation)}ms`);
      console.log(`   Variance: ${Math.round(variance)}`);

      // Low variance indicates consistent performance
      // Standard deviation should be less than 50% of mean
      expect(standardDeviation).toBeLessThan(stats.mean * 0.5);
    }, 60000);
  });

  describe('Pagination Performance', () => {
    it('should maintain performance across paginated requests', async () => {
      // Warmup
      await request(app)
        .get('/api/discovery/profiles?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const pageTimings: { page: number; time: number }[] = [];

      // Fetch first page and subsequent pages
      let cursor: string | null = null;
      for (let page = 1; page <= 5; page++) {
        const startTime = Date.now();

        const url: string = cursor
          ? `/api/discovery/profiles?limit=10&cursor=${cursor}`
          : '/api/discovery/profiles?limit=10';

        const response: request.Response = await request(app)
          .get(url)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const endTime = Date.now();
        pageTimings.push({ page, time: endTime - startTime });

        cursor = response.body.nextCursor;
        if (!cursor) break;
      }

      console.log('\n📊 Pagination Performance:');
      pageTimings.forEach(({ page, time }) => {
        console.log(`   Page ${page}: ${time}ms ${time <= PERF_CONFIG.targetP95 ? '✅' : '❌'}`);
      });

      // All pages should meet performance target
      pageTimings.forEach(({ time }) => {
        expect(time).toBeLessThanOrEqual(PERF_CONFIG.targetP95);
      });

      // Pages should have similar performance (no degradation)
      const pageTimes = pageTimings.map(p => p.time);
      const stats = calculateStats(pageTimes);
      const maxDeviation = Math.max(...pageTimes) - Math.min(...pageTimes);

      console.log(`   Max Deviation: ${maxDeviation}ms`);

      // Deviation should be less than 50ms between pages
      expect(maxDeviation).toBeLessThan(50);
    }, 60000);
  });

  describe('Concurrent Request Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Warmup
      await request(app)
        .get('/api/discovery/profiles?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const concurrentRequests = 20;
      const startTime = Date.now();

      // Make 20 concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200),
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrentRequests;

      console.log('\n📊 Concurrent Request Performance:');
      console.log(`   Concurrent Requests: ${concurrentRequests}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Avg Per Request: ${Math.round(avgTimePerRequest)}ms`);

      // All requests should succeed
      expect(results.length).toBe(concurrentRequests);
      results.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average time should still meet target (some overhead expected for concurrency)
      expect(avgTimePerRequest).toBeLessThan(PERF_CONFIG.targetP95 * 1.5);
    }, 60000);
  });

  describe('Cache Effectiveness', () => {
    it('should show significant performance improvement with cache', async () => {
      // Measure cold cache performance (first request)
      const coldStart = Date.now();
      await request(app)
        .get('/api/discovery/profiles?limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const coldTime = Date.now() - coldStart;

      // Measure warm cache performance (subsequent requests)
      const warmTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const warmStart = Date.now();
        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        warmTimes.push(Date.now() - warmStart);
      }

      const avgWarmTime = warmTimes.reduce((sum, time) => sum + time, 0) / warmTimes.length;

      console.log('\n📊 Cache Effectiveness:');
      console.log(`   Cold Cache: ${coldTime}ms`);
      console.log(`   Warm Cache (avg): ${Math.round(avgWarmTime)}ms`);
      console.log(`   Improvement: ${Math.round(((coldTime - avgWarmTime) / coldTime) * 100)}%`);

      // Warm cache should be at least 30% faster
      const improvementPercent = ((coldTime - avgWarmTime) / coldTime) * 100;
      expect(improvementPercent).toBeGreaterThan(30);
    }, 30000);
  });

  describe('Data Size Impact', () => {
    it('should maintain performance with different limit values', async () => {
      const limits = [5, 10, 20, 50];
      const limitTimings: { limit: number; time: number }[] = [];

      for (const limit of limits) {
        // Warmup for this limit
        await request(app)
          .get(`/api/discovery/profiles?limit=${limit}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Measure
        const startTime = Date.now();
        await request(app)
          .get(`/api/discovery/profiles?limit=${limit}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        const endTime = Date.now();

        limitTimings.push({ limit, time: endTime - startTime });
      }

      console.log('\n📊 Data Size Impact:');
      limitTimings.forEach(({ limit, time }) => {
        console.log(`   Limit ${limit}: ${time}ms ${time <= PERF_CONFIG.targetP95 ? '✅' : '❌'}`);
      });

      // All limits should meet performance target
      limitTimings.forEach(({ time }) => {
        expect(time).toBeLessThanOrEqual(PERF_CONFIG.targetP95);
      });

      // Time should scale roughly linearly (not exponentially)
      const time5 = limitTimings.find(t => t.limit === 5)!.time;
      const time50 = limitTimings.find(t => t.limit === 50)!.time;

      // 50 items shouldn't take more than 3x as long as 5 items
      expect(time50).toBeLessThan(time5 * 3);
    }, 30000);
  });

  describe('Performance Regression Detection', () => {
    it('should document baseline performance metrics', async () => {
      // Warmup
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }

      // Measure baseline
      const responseTimes: number[] = [];
      for (let i = 0; i < 100; i++) {
        const startTime = Date.now();
        await request(app)
          .get('/api/discovery/profiles?limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        responseTimes.push(Date.now() - startTime);
      }

      const stats = calculateStats(responseTimes);

      console.log('\n📊 Baseline Performance Metrics (for regression tracking):');
      console.log(`   Min:     ${stats.min}ms`);
      console.log(`   Median:  ${stats.median}ms`);
      console.log(`   Mean:    ${Math.round(stats.mean)}ms`);
      console.log(`   P95:     ${stats.p95}ms`);
      console.log(`   P99:     ${stats.p99}ms`);
      console.log(`   Max:     ${stats.max}ms`);
      console.log('\n   Store these metrics for future regression comparison');

      // Document that baseline meets all targets
      expect(stats.p95).toBeLessThanOrEqual(PERF_CONFIG.targetP95);
      expect(stats.p99).toBeLessThanOrEqual(PERF_CONFIG.targetP99);
      expect(stats.median).toBeLessThanOrEqual(PERF_CONFIG.targetMedian);
    }, 120000);
  });
});
