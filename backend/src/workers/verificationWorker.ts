import Queue from 'bull';
import { VerificationService } from '../features/verification';
import logger from '../config/logger';

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// Create verification queue
export const verificationQueue = new Queue('verification', redisConfig);

// Job types
interface VerificationJob {
  userId: string;
  type: 'id' | 'background' | 'income';
}

// Process verification jobs
verificationQueue.process('id_verification', async (job) => {
  const { userId, sessionId } = job.data as VerificationJob & { sessionId: string };

  logger.info(`Processing ID verification for user ${userId}`);

  if (!sessionId) {
    logger.error(`ID verification failed for user ${userId}: Missing sessionId`);
    throw new Error('Session ID is required for ID verification');
  }

  try {
    await VerificationService.completeIDVerification(userId, sessionId);
    logger.info(`ID verification completed for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`ID verification failed for user ${userId}:`, error);
    throw error;
  }
});

verificationQueue.process('background_check', async (job) => {
  const { userId } = job.data as VerificationJob;

  logger.info(`Processing background check for user ${userId}`);

  try {
    await VerificationService.initiateBackgroundCheck(userId);
    logger.info(`Background check initiated for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Background check failed for user ${userId}:`, error);
    throw error;
  }
});

// Add job to queue
export const queueVerification = async (userId: string, type: 'id' | 'background' | 'income') => {
  const jobName = `${type}_verification`;

  await verificationQueue.add(jobName, {
    userId,
    type,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info(`Queued ${type} verification for user ${userId}`);
};

// Event listeners
verificationQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed:`, result);
});

verificationQueue.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

verificationQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

export default verificationQueue;
