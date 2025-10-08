/**
 * Minimal test to see if app can be imported without hanging
 */

describe('Minimal Import Test', () => {
  it('should import app without hanging', (done) => {
    console.log('Starting import...');

    setTimeout(() => {
      done(new Error('Import timed out after 5 seconds'));
    }, 5000);

    import('../src/server').then((module) => {
      console.log('Import successful!');
      console.log('App type:', typeof module.default);
      done();
    }).catch((err) => {
      console.error('Import failed:', err);
      done(err);
    });
  });
});
