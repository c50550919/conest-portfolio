import Queue from 'bull';
import logger from '../config/logger';

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// Create notification queue
export const notificationQueue = new Queue('notifications', redisConfig);

interface NotificationJob {
  userId: string;
  type: 'email' | 'sms' | 'push';
  title?: string;
  message: string;
  data?: any;
}

// Process notification jobs
void notificationQueue.process('email', async (job) => {
  const { userId, message, data } = job.data as NotificationJob;

  logger.info(`Sending email notification to user ${userId}`);

  try {
    // MOCK: In production, integrate with SendGrid, Mailgun, etc.
    logger.info('[MOCK] Email sent to user', { userId, message });
    console.log('\n📧 MOCK Email notification:\nTo: User', userId, '\nMessage:', message, '\nData:', data, '\n');

    return { success: true };
  } catch (error) {
    logger.error(`Email notification failed for user ${userId}:`, error);
    throw error;
  }
});

void notificationQueue.process('sms', async (job) => {
  const { userId, message } = job.data as NotificationJob;

  logger.info(`Sending SMS notification to user ${userId}`);

  try {
    // MOCK: In production, integrate with Twilio
    logger.info('[MOCK] SMS sent to user', { userId, message });
    console.log('\n📱 MOCK SMS notification:\nTo: User', userId, '\nMessage:', message, '\n');

    return { success: true };
  } catch (error) {
    logger.error(`SMS notification failed for user ${userId}:`, error);
    throw error;
  }
});

void notificationQueue.process('push', async (job) => {
  const { userId, title, message, data } = job.data as NotificationJob;

  logger.info(`Sending push notification to user ${userId}`);

  try {
    // MOCK: In production, integrate with Firebase Cloud Messaging
    logger.info('[MOCK] Push notification sent to user', { userId, title, message });
    console.log('\n🔔 MOCK Push notification:\nTo: User', userId, '\nTitle:', title, '\nMessage:', message, '\nData:', data, '\n');

    return { success: true };
  } catch (error) {
    logger.error(`Push notification failed for user ${userId}:`, error);
    throw error;
  }
});

// Add notification to queue
export const queueNotification = async (
  userId: string,
  type: 'email' | 'sms' | 'push',
  message: string,
  options?: { title?: string; data?: any },
) => {
  await notificationQueue.add(type, {
    userId,
    type,
    title: options?.title,
    message,
    data: options?.data,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info(`Queued ${type} notification for user ${userId}`);
};

// Event listeners
notificationQueue.on('completed', (job, result) => {
  logger.info(`Notification job ${job.id} completed:`, result);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Notification job ${job?.id} failed:`, err);
});

export default notificationQueue;
