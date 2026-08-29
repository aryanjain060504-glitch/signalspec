import cron, { ScheduledTask } from 'node-cron';
import { User } from '../modules/users/user.model';
import { logger } from '../utils/logger';

class CronService {
  private jobs: ScheduledTask[] = [];

  startAll(): void {
    // 1. Hourly session cleanup: prune expired refresh tokens
    const sessionCleanupJob = cron.schedule('0 * * * *', async () => {
      try {
        const now = new Date();
        const result = await User.updateMany(
          { 'refreshTokens.expiresAt': { $lt: now } },
          { $pull: { refreshTokens: { expiresAt: { $lt: now } } } }
        );
        if (result.modifiedCount > 0) {
          logger.info(`Pruned expired refresh token sessions from ${result.modifiedCount} users`);
        }
      } catch (err) {
        logger.error('Error during scheduled session cleanup cron:', err);
      }
    });

    this.jobs.push(sessionCleanupJob);
    logger.info('Background cron services scheduled');
  }

  stopAll(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    logger.info('Background cron services stopped');
  }
}

export const cronService = new CronService();
