import db from '../../../src/config/database';

describe('organizations table', () => {
  afterAll(async () => {
    await db.destroy();
  });

  it('should exist with required columns', async () => {
    const columns = await db('organizations').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('slug');
    expect(columns).toHaveProperty('plan_tier');
    expect(columns).toHaveProperty('stripe_customer_id');
    expect(columns).toHaveProperty('settings');
    expect(columns).toHaveProperty('is_active');
  });

  it('should enforce unique slug', async () => {
    const org = { name: 'Test Org', slug: 'test-org' };
    await db('organizations').insert(org);
    await expect(db('organizations').insert(org)).rejects.toThrow();
    await db('organizations').where({ slug: 'test-org' }).del();
  });
});
