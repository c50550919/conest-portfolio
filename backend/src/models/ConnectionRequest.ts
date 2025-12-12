import { db } from '../config/database';
import { encryptNote, decryptNote } from '../utils/encryption';
import redis from '../config/redis';

/**
 * ConnectionRequest Model
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * Constitution Principle I: NO child PII - only parent communication
 * Constitution Principle III: Messages encrypted at rest (AES-256-GCM)
 * Constitution Principle IV: Rate limiting - 5/day, 15/week
 *
 * Entity: Connection requests between parents with 14-day expiration
 * - Status: pending, accepted, declined, expired, cancelled
 * - Auto-expiration after 14 days
 * - Encrypted messages (max 500 chars decrypted)
 * - Rate limiting via Redis (5/day, 15/week per user)
 */

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_encrypted: string;
  message_iv: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  sent_at: Date;
  expires_at: Date;
  response_message_encrypted: string | null;
  response_message_iv: string | null;
  responded_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConnectionRequestData {
  sender_id: string;
  recipient_id: string;
  message: string; // Plaintext, will be encrypted
}

export interface ConnectionRequestWithProfiles extends ConnectionRequest {
  sender: {
    id: string;
    first_name: string;
    age: number;
    city: string;
    state: string;
    verification_score: number;
  };
  recipient: {
    id: string;
    first_name: string;
    age: number;
    city: string;
    state: string;
    verification_score: number;
  };
}

const RATE_LIMIT_DAILY = 5;
const RATE_LIMIT_WEEKLY = 15;

export const ConnectionRequestModel = {
  /**
   * Create a new connection request
   * Encrypts message, sets 14-day expiration, checks rate limits
   * @throws Error if rate limit exceeded or duplicate request exists
   */
  async create(data: CreateConnectionRequestData): Promise<ConnectionRequest> {
    // Check for duplicate request
    const existing = await db('connection_requests')
      .where({
        sender_id: data.sender_id,
        recipient_id: data.recipient_id,
      })
      .whereIn('status', ['pending', 'accepted'])
      .first();

    if (existing) {
      throw new Error('CONNECTION_REQUEST_ALREADY_EXISTS');
    }

    // Check not sending to own profile
    if (data.sender_id === data.recipient_id) {
      throw new Error('CANNOT_SEND_REQUEST_TO_SELF');
    }

    // Check rate limits (5/day, 15/week)
    await this.checkRateLimits(data.sender_id);

    // Encrypt message
    const encrypted = encryptNote(data.message);

    // Create request with 14-day expiration
    const [request] = await db('connection_requests')
      .insert({
        sender_id: data.sender_id,
        recipient_id: data.recipient_id,
        message_encrypted: encrypted.encrypted,
        message_iv: encrypted.iv,
        status: 'pending',
        expires_at: db.raw("NOW() + INTERVAL '14 days'"),
      })
      .returning('*');

    // Increment rate limit counters in Redis
    await this.incrementRateLimitCounters(data.sender_id);

    return request;
  },

  /**
   * Check rate limits for connection requests
   * @throws Error if rate limit exceeded
   */
  async checkRateLimits(userId: string): Promise<void> {
    const dailyKey = `connection_requests:daily:${userId}`;
    const weeklyKey = `connection_requests:weekly:${userId}`;

    const [dailyCount, weeklyCount] = await Promise.all([
      redis.get(dailyKey),
      redis.get(weeklyKey),
    ]);

    if (dailyCount && parseInt(dailyCount) >= RATE_LIMIT_DAILY) {
      throw new Error('RATE_LIMIT_DAILY_EXCEEDED');
    }

    if (weeklyCount && parseInt(weeklyCount) >= RATE_LIMIT_WEEKLY) {
      throw new Error('RATE_LIMIT_WEEKLY_EXCEEDED');
    }
  },

  /**
   * Increment rate limit counters in Redis
   */
  async incrementRateLimitCounters(userId: string): Promise<void> {
    const dailyKey = `connection_requests:daily:${userId}`;
    const weeklyKey = `connection_requests:weekly:${userId}`;

    // Increment daily counter (24-hour TTL)
    const dailyCount = await redis.incr(dailyKey);
    if (dailyCount === 1) {
      await redis.expire(dailyKey, 86400); // 24 hours
    }

    // Increment weekly counter (7-day TTL)
    const weeklyCount = await redis.incr(weeklyKey);
    if (weeklyCount === 1) {
      await redis.expire(weeklyKey, 604800); // 7 days
    }
  },

  /**
   * Get decrypted message for a connection request
   * Only returns message if requester is sender or recipient
   */
  async getDecryptedMessage(
    id: string,
    userId: string,
  ): Promise<string | null> {
    const request = await db('connection_requests')
      .where({ id })
      .where(function () {
        this.where('sender_id', userId).orWhere('recipient_id', userId);
      })
      .first();

    if (!request) {
      return null;
    }

    return decryptNote(request.message_encrypted, request.message_iv);
  },

  /**
   * Get decrypted response message for a connection request
   * Only returns response if requester is sender or recipient
   */
  async getDecryptedResponseMessage(
    id: string,
    userId: string,
  ): Promise<string | null> {
    const request = await db('connection_requests')
      .where({ id })
      .where(function () {
        this.where('sender_id', userId).orWhere('recipient_id', userId);
      })
      .first();

    if (
      !request?.response_message_encrypted ||
      !request.response_message_iv
    ) {
      return null;
    }

    return decryptNote(
      request.response_message_encrypted,
      request.response_message_iv,
    );
  },

  /**
   * Find all connection requests received by a user
   * Returns requests with sender profile information
   */
  async findByRecipientId(
    recipientId: string,
    status?: string,
  ): Promise<ConnectionRequestWithProfiles[]> {
    const query = db('connection_requests as cr')
      .join('users as sender_user', 'cr.sender_id', 'sender_user.id')
      .join('parents as sender_parent', 'sender_user.id', 'sender_parent.user_id')
      .leftJoin(
        'verifications as sender_verification',
        'sender_user.id',
        'sender_verification.user_id',
      )
      .join('users as recipient_user', 'cr.recipient_id', 'recipient_user.id')
      .join(
        'parents as recipient_parent',
        'recipient_user.id',
        'recipient_parent.user_id',
      )
      .leftJoin(
        'verifications as recipient_verification',
        'recipient_user.id',
        'recipient_verification.user_id',
      )
      .where('cr.recipient_id', recipientId)
      .whereNull('cr.archived_at')
      .select(
        'cr.*',
        'sender_parent.first_name as sender_first_name',
        db.raw('EXTRACT(YEAR FROM age(sender_parent.date_of_birth))::int as sender_age'),
        'sender_parent.city as sender_city',
        'sender_parent.state as sender_state',
        'sender_verification.verification_score as sender_verification_score',
        'recipient_parent.first_name as recipient_first_name',
        db.raw('EXTRACT(YEAR FROM age(recipient_parent.date_of_birth))::int as recipient_age'),
        'recipient_parent.city as recipient_city',
        'recipient_parent.state as recipient_state',
        'recipient_verification.verification_score as recipient_verification_score',
      )
      .orderBy('cr.sent_at', 'desc');

    if (status) {
      query.where('cr.status', status);
    }

    const results = await query;

    return results.map((row) => ({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      message_encrypted: row.message_encrypted,
      message_iv: row.message_iv,
      status: row.status,
      sent_at: row.sent_at,
      expires_at: row.expires_at,
      response_message_encrypted: row.response_message_encrypted,
      response_message_iv: row.response_message_iv,
      responded_at: row.responded_at,
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: {
        id: row.sender_id,
        first_name: row.sender_first_name,
        age: row.sender_age,
        city: row.sender_city,
        state: row.sender_state,
        verification_score: row.sender_verification_score || 0,
      },
      recipient: {
        id: row.recipient_id,
        first_name: row.recipient_first_name,
        age: row.recipient_age,
        city: row.recipient_city,
        state: row.recipient_state,
        verification_score: row.recipient_verification_score || 0,
      },
    }));
  },

  /**
   * Find all connection requests sent by a user
   * Returns requests with recipient profile information
   */
  async findBySenderId(
    senderId: string,
    status?: string,
  ): Promise<ConnectionRequestWithProfiles[]> {
    const query = db('connection_requests as cr')
      .join('users as sender_user', 'cr.sender_id', 'sender_user.id')
      .join('parents as sender_parent', 'sender_user.id', 'sender_parent.user_id')
      .leftJoin(
        'verifications as sender_verification',
        'sender_user.id',
        'sender_verification.user_id',
      )
      .join('users as recipient_user', 'cr.recipient_id', 'recipient_user.id')
      .join(
        'parents as recipient_parent',
        'recipient_user.id',
        'recipient_parent.user_id',
      )
      .leftJoin(
        'verifications as recipient_verification',
        'recipient_user.id',
        'recipient_verification.user_id',
      )
      .where('cr.sender_id', senderId)
      .whereNull('cr.archived_at')
      .select(
        'cr.*',
        'sender_parent.first_name as sender_first_name',
        db.raw('EXTRACT(YEAR FROM age(sender_parent.date_of_birth))::int as sender_age'),
        'sender_parent.city as sender_city',
        'sender_parent.state as sender_state',
        'sender_verification.verification_score as sender_verification_score',
        'recipient_parent.first_name as recipient_first_name',
        db.raw('EXTRACT(YEAR FROM age(recipient_parent.date_of_birth))::int as recipient_age'),
        'recipient_parent.city as recipient_city',
        'recipient_parent.state as recipient_state',
        'recipient_verification.verification_score as recipient_verification_score',
      )
      .orderBy('cr.sent_at', 'desc');

    if (status) {
      query.where('cr.status', status);
    }

    const results = await query;

    return results.map((row) => ({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      message_encrypted: row.message_encrypted,
      message_iv: row.message_iv,
      status: row.status,
      sent_at: row.sent_at,
      expires_at: row.expires_at,
      response_message_encrypted: row.response_message_encrypted,
      response_message_iv: row.response_message_iv,
      responded_at: row.responded_at,
      archived_at: row.archived_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: {
        id: row.sender_id,
        first_name: row.sender_first_name,
        age: row.sender_age,
        city: row.sender_city,
        state: row.sender_state,
        verification_score: row.sender_verification_score || 0,
      },
      recipient: {
        id: row.recipient_id,
        first_name: row.recipient_first_name,
        age: row.recipient_age,
        city: row.recipient_city,
        state: row.recipient_state,
        verification_score: row.recipient_verification_score || 0,
      },
    }));
  },

  /**
   * Find connection request by ID
   */
  async findById(id: string): Promise<ConnectionRequest | undefined> {
    return await db('connection_requests').where({ id }).first();
  },

  /**
   * Accept a connection request
   * Updates status, creates a match, and sends notification
   * @param responseMessage Optional response message (encrypted)
   */
  async accept(
    id: string,
    recipientId: string,
    responseMessage?: string,
  ): Promise<ConnectionRequest> {
    const request = await this.findById(id);

    if (!request) {
      throw new Error('CONNECTION_REQUEST_NOT_FOUND');
    }

    if (request.recipient_id !== recipientId) {
      throw new Error('UNAUTHORIZED');
    }

    if (request.status !== 'pending') {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    // Check if request has expired
    if (new Date() > new Date(request.expires_at)) {
      throw new Error('CONNECTION_REQUEST_EXPIRED');
    }

    // Encrypt response message if provided
    let response_message_encrypted = null;
    let response_message_iv = null;
    if (responseMessage) {
      const encrypted = encryptNote(responseMessage);
      response_message_encrypted = encrypted.encrypted;
      response_message_iv = encrypted.iv;
    }

    // Update request status
    const [updatedRequest] = await db('connection_requests')
      .where({ id, recipient_id: recipientId })
      .update({
        status: 'accepted',
        response_message_encrypted,
        response_message_iv,
        responded_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!updatedRequest) {
      throw new Error('CONNECTION_REQUEST_NOT_FOUND');
    }

    // Get parent IDs for both users
    const senderParent = await db('parents').where({ user_id: request.sender_id }).first();
    const recipientParent = await db('parents').where({ user_id: request.recipient_id }).first();

    if (senderParent && recipientParent) {
      // Ensure parent1_id < parent2_id to satisfy CHECK constraint
      const [parent1_id, parent2_id] = senderParent.id < recipientParent.id
        ? [senderParent.id, recipientParent.id]
        : [recipientParent.id, senderParent.id];

      // Create a match in the matches table
      await db('matches').insert({
        parent1_id,
        parent2_id,
        compatibility_score: 85.00, // Default score for connection request matches
        score_breakdown: JSON.stringify({
          source: 'connection_request',
          request_id: id,
          note: 'Match created from accepted connection request',
        }),
        parent1_status: 'liked',
        parent2_status: 'liked',
        matched: true,
        matched_at: db.fn.now(),
      });

      // Create a conversation for messaging (uses parent IDs)
      const [conversation] = await db('conversations').insert({
        participant1_id: senderParent.id,
        participant2_id: recipientParent.id,
        both_verified: true, // Both users verified since they can send connection requests
        created_at: db.fn.now(),
      }).returning('*');

      // If there's a response message, insert it as the first message in the conversation
      if (responseMessage?.trim()) {
        // Encrypt the message for storage
        const encryptedMsg = encryptNote(responseMessage);

        await db('messages').insert({
          conversation_id: conversation.id,
          sender_id: recipientParent.id, // Use parent ID
          message_encrypted: encryptedMsg.encrypted,
          encryption_iv: encryptedMsg.iv,
          message_type: 'text',
          created_at: db.fn.now(),
        });

        // Update conversation with last message info
        await db('conversations')
          .where({ id: conversation.id })
          .update({
            last_message_at: db.fn.now(),
            last_message_preview: responseMessage.substring(0, 100),
          });
      }
    }

    return updatedRequest;
  },

  /**
   * Decline a connection request
   * Updates status and optionally stores response message
   * @param responseMessage Optional response message (encrypted)
   */
  async decline(
    id: string,
    recipientId: string,
    responseMessage?: string,
  ): Promise<ConnectionRequest> {
    const request = await this.findById(id);

    if (!request) {
      throw new Error('CONNECTION_REQUEST_NOT_FOUND');
    }

    if (request.recipient_id !== recipientId) {
      throw new Error('UNAUTHORIZED');
    }

    if (request.status !== 'pending') {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    // Encrypt response message if provided
    let response_message_encrypted = null;
    let response_message_iv = null;
    if (responseMessage) {
      const encrypted = encryptNote(responseMessage);
      response_message_encrypted = encrypted.encrypted;
      response_message_iv = encrypted.iv;
    }

    const [updatedRequest] = await db('connection_requests')
      .where({ id, recipient_id: recipientId })
      .update({
        status: 'declined',
        response_message_encrypted,
        response_message_iv,
        responded_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!updatedRequest) {
      throw new Error('CONNECTION_REQUEST_NOT_FOUND');
    }

    return updatedRequest;
  },

  /**
   * Cancel a connection request (sender only)
   * Can only cancel pending requests
   */
  async cancel(id: string, senderId: string): Promise<ConnectionRequest> {
    const request = await this.findById(id);

    if (!request) {
      throw new Error('CONNECTION_REQUEST_NOT_FOUND');
    }

    if (request.sender_id !== senderId) {
      throw new Error('UNAUTHORIZED');
    }

    if (request.status !== 'pending') {
      throw new Error('INVALID_STATUS_TRANSITION');
    }

    const [updatedRequest] = await db('connection_requests')
      .where({ id, sender_id: senderId })
      .update({
        status: 'cancelled',
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!updatedRequest) {
      throw new Error('CONNECTION_REQUEST_NOT_FOUND');
    }

    return updatedRequest;
  },

  /**
   * Expire old pending connection requests (14 days)
   * Called by cron worker
   * @returns Number of requests expired
   */
  async expireOldRequests(): Promise<number> {
    const result = await db('connection_requests')
      .where('status', 'pending')
      .where('expires_at', '<=', db.fn.now())
      .update({
        status: 'expired',
        updated_at: db.fn.now(),
      });

    return result;
  },

  /**
   * Archive old connection requests (90 days after response/expiration)
   * Called by cron worker
   * @returns Number of requests archived
   */
  async archiveOldRequests(): Promise<number> {
    const result = await db('connection_requests')
      .whereIn('status', ['accepted', 'declined', 'expired', 'cancelled'])
      .whereNull('archived_at')
      .where(function () {
        this.where(
          'responded_at',
          '<=',
          db.raw("NOW() - INTERVAL '90 days'"),
        ).orWhere('updated_at', '<=', db.raw("NOW() - INTERVAL '90 days'"));
      })
      .update({
        archived_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    return result;
  },

  /**
   * Get rate limit status for a user
   * Returns remaining requests for today and this week
   */
  async getRateLimitStatus(
    userId: string,
  ): Promise<{ daily: number; weekly: number }> {
    const dailyKey = `connection_requests:daily:${userId}`;
    const weeklyKey = `connection_requests:weekly:${userId}`;

    const [dailyCount, weeklyCount] = await Promise.all([
      redis.get(dailyKey),
      redis.get(weeklyKey),
    ]);

    return {
      daily: RATE_LIMIT_DAILY - (dailyCount ? parseInt(dailyCount) : 0),
      weekly: RATE_LIMIT_WEEKLY - (weeklyCount ? parseInt(weeklyCount) : 0),
    };
  },
};
