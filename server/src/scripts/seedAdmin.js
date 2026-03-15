import { ensureAdminUser } from '../services/authService.js';
import { disconnectDb } from '../db.js';

(async () => {
  try {
    await ensureAdminUser();
    console.log('Admin seed completed.');
  } catch (error) {
    console.error('Admin seed failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDb();
  }
})();
