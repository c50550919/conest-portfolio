table "admin_actions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "admin_id" {
    null = false
    type = uuid
  }
  column "action_type" {
    null = false
    type = character_varying(50)
  }
  column "target_user_id" {
    null = true
    type = uuid
  }
  column "target_message_id" {
    null = true
    type = uuid
  }
  column "target_conversation_id" {
    null = true
    type = uuid
  }
  column "related_report_id" {
    null = true
    type = uuid
  }
  column "reason" {
    null = false
    type = text
  }
  column "metadata" {
    null = true
    type = jsonb
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "admin_actions_admin_id_fkey" {
    columns     = [column.admin_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "admin_actions_related_report_id_fkey" {
    columns     = [column.related_report_id]
    ref_columns = [table.message_reports.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "admin_actions_target_conversation_id_fkey" {
    columns     = [column.target_conversation_id]
    ref_columns = [table.conversations.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "admin_actions_target_message_id_fkey" {
    columns     = [column.target_message_id]
    ref_columns = [table.messages.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "admin_actions_target_user_id_fkey" {
    columns     = [column.target_user_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "idx_admin_actions_action_type" {
    columns = [column.action_type]
  }
  index "idx_admin_actions_admin_id" {
    columns = [column.admin_id]
  }
  index "idx_admin_actions_created_at" {
    columns = [column.created_at]
  }
  index "idx_admin_actions_target_user_id" {
    columns = [column.target_user_id]
  }
  check "admin_actions_action_type_check" {
    expr = "((action_type)::text = ANY ((ARRAY['message_deleted'::character varying, 'message_approved'::character varying, 'message_rejected'::character varying, 'user_warned'::character varying, 'user_suspended'::character varying, 'user_banned'::character varying, 'conversation_closed'::character varying, 'report_resolved'::character varying])::text[]))"
  }
}
table "audit_logs" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "user_id" {
    null = true
    type = uuid
  }
  column "action" {
    null = false
    type = character_varying(100)
  }
  column "resource_type" {
    null = true
    type = character_varying(50)
  }
  column "resource_id" {
    null = true
    type = uuid
  }
  column "ip_address" {
    null = true
    type = inet
  }
  column "user_agent" {
    null = true
    type = text
  }
  column "metadata" {
    null = true
    type = jsonb
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "audit_logs_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "idx_audit_logs_action" {
    on {
      column = column.action
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  index "idx_audit_logs_user" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
}
table "background_checks" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "checkr_candidate_id" {
    null = true
    type = character_varying(255)
  }
  column "checkr_report_id" {
    null = true
    type = character_varying(255)
  }
  column "status" {
    null    = true
    type    = character_varying(50)
    default = "pending"
  }
  column "criminal_search" {
    null = true
    type = jsonb
  }
  column "sex_offender_search" {
    null = true
    type = jsonb
  }
  column "county_criminal_search" {
    null = true
    type = jsonb
  }
  column "national_criminal_search" {
    null = true
    type = jsonb
  }
  column "overall_result" {
    null = true
    type = character_varying(20)
  }
  column "reviewed_by" {
    null = true
    type = uuid
  }
  column "review_notes" {
    null = true
    type = text
  }
  column "initiated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "completed_at" {
    null = true
    type = timestamptz
  }
  column "expires_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "background_checks_parent_id_fkey" {
    columns     = [column.parent_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "background_checks_reviewed_by_fkey" {
    columns     = [column.reviewed_by]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  check "background_checks_overall_result_check" {
    expr = "((overall_result)::text = ANY ((ARRAY['clear'::character varying, 'review'::character varying, 'failed'::character varying])::text[]))"
  }
  check "background_checks_status_check" {
    expr = "((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'complete'::character varying, 'consider'::character varying, 'suspended'::character varying, 'failed'::character varying])::text[]))"
  }
  unique "background_checks_checkr_candidate_id_key" {
    columns = [column.checkr_candidate_id]
  }
  unique "background_checks_checkr_report_id_key" {
    columns = [column.checkr_report_id]
  }
}
table "blocked_users" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "blocker_id" {
    null = true
    type = uuid
  }
  column "blocked_id" {
    null = true
    type = uuid
  }
  column "reason" {
    null = true
    type = character_varying(255)
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "blocked_users_blocked_id_fkey" {
    columns     = [column.blocked_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "blocked_users_blocker_id_fkey" {
    columns     = [column.blocker_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  unique "blocked_users_blocker_id_blocked_id_key" {
    columns = [column.blocker_id, column.blocked_id]
  }
}
table "connection_requests" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "sender_id" {
    null = false
    type = uuid
  }
  column "recipient_id" {
    null = false
    type = uuid
  }
  column "message_encrypted" {
    null = false
    type = text
  }
  column "message_iv" {
    null = false
    type = character_varying(32)
  }
  column "status" {
    null    = false
    type    = character_varying(20)
    default = "pending"
  }
  column "sent_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "expires_at" {
    null    = false
    type    = timestamptz
    default = sql("(now() + '14 days'::interval)")
  }
  column "response_message_encrypted" {
    null = true
    type = text
  }
  column "response_message_iv" {
    null = true
    type = character_varying(32)
  }
  column "responded_at" {
    null = true
    type = timestamptz
  }
  column "archived_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "connection_requests_recipient_id_fkey" {
    columns     = [column.recipient_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "connection_requests_sender_id_fkey" {
    columns     = [column.sender_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_connection_requests_archived_at" {
    columns = [column.archived_at]
    where   = "(archived_at IS NULL)"
  }
  index "idx_connection_requests_expires_at" {
    columns = [column.expires_at]
    where   = "((status)::text = 'pending'::text)"
  }
  index "idx_connection_requests_recipient" {
    columns = [column.recipient_id, column.status]
  }
  index "idx_connection_requests_sender" {
    columns = [column.sender_id, column.status]
  }
  check "chk_connection_requests_not_self" {
    expr = "(sender_id <> recipient_id)"
  }
  check "connection_requests_status_check" {
    expr = "((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying, 'cancelled'::character varying])::text[]))"
  }
  unique "idx_connection_requests_unique" {
    columns = [column.sender_id, column.recipient_id]
  }
}
table "conversations" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "participant1_id" {
    null = true
    type = uuid
  }
  column "participant2_id" {
    null = true
    type = uuid
  }
  column "household_id" {
    null = true
    type = uuid
  }
  column "last_message_at" {
    null = true
    type = timestamptz
  }
  column "last_message_preview_encrypted" {
    null = true
    type = text
  }
  column "participant1_archived" {
    null    = true
    type    = boolean
    default = false
  }
  column "participant2_archived" {
    null    = true
    type    = boolean
    default = false
  }
  column "participant1_muted" {
    null    = true
    type    = boolean
    default = false
  }
  column "participant2_muted" {
    null    = true
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "both_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "archived" {
    null    = true
    type    = boolean
    default = false
  }
  column "archived_by" {
    null = true
    type = uuid
  }
  column "archived_at" {
    null = true
    type = timestamptz
  }
  column "unread_count_p1" {
    null    = true
    type    = integer
    default = 0
  }
  column "unread_count_p2" {
    null    = true
    type    = integer
    default = 0
  }
  column "last_message_sender_id" {
    null = true
    type = uuid
  }
  column "last_message_preview" {
    null = true
    type = text
  }
  column "muted_by_p1" {
    null    = true
    type    = boolean
    default = false
  }
  column "muted_by_p2" {
    null    = true
    type    = boolean
    default = false
  }
  column "blocked" {
    null    = true
    type    = boolean
    default = false
  }
  column "blocked_by" {
    null = true
    type = uuid
  }
  column "blocked_at" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "conversations_archived_by_fkey" {
    columns     = [column.archived_by]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "conversations_blocked_by_fkey" {
    columns     = [column.blocked_by]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "conversations_household_id_fkey" {
    columns     = [column.household_id]
    ref_columns = [table.households.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "conversations_last_message_sender_id_fkey" {
    columns     = [column.last_message_sender_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "conversations_participant1_id_fkey" {
    columns     = [column.participant1_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "conversations_participant2_id_fkey" {
    columns     = [column.participant2_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_conversations_archived" {
    columns = [column.archived]
  }
  index "idx_conversations_both_verified" {
    columns = [column.both_verified]
  }
  index "idx_conversations_participants" {
    columns = [column.participant1_id, column.participant2_id]
  }
  unique "conversations_participant1_id_participant2_id_household_id_key" {
    columns = [column.participant1_id, column.participant2_id, column.household_id]
  }
}
table "encryption_keys" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "key_id" {
    null = false
    type = character_varying(100)
  }
  column "encrypted_key" {
    null = false
    type = text
  }
  column "version" {
    null = false
    type = integer
  }
  column "active_from" {
    null = false
    type = timestamptz
  }
  column "active_until" {
    null = true
    type = timestamptz
  }
  column "is_active" {
    null    = true
    type    = boolean
    default = true
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_encryption_keys_active" {
    columns = [column.is_active, column.active_from]
  }
  index "idx_encryption_keys_key_id" {
    columns = [column.key_id]
  }
  unique "encryption_keys_key_id_key" {
    columns = [column.key_id]
  }
}
table "household_members" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "household_id" {
    null = true
    type = uuid
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "role" {
    null = true
    type = character_varying(50)
  }
  column "move_in_date" {
    null = true
    type = date
  }
  column "move_out_date" {
    null = true
    type = date
  }
  column "rent_share" {
    null = true
    type = numeric(10,2)
  }
  column "security_deposit_paid" {
    null = true
    type = numeric(10,2)
  }
  column "lease_signed" {
    null    = true
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "household_members_household_id_fkey" {
    columns     = [column.household_id]
    ref_columns = [table.households.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "household_members_parent_id_fkey" {
    columns     = [column.parent_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  check "household_members_role_check" {
    expr = "((role)::text = ANY ((ARRAY['owner'::character varying, 'co-tenant'::character varying, 'pending'::character varying])::text[]))"
  }
  unique "household_members_household_id_parent_id_key" {
    columns = [column.household_id, column.parent_id]
  }
}
table "households" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "name" {
    null = false
    type = character_varying(255)
  }
  column "address_encrypted" {
    null = false
    type = text
  }
  column "address_hash" {
    null = true
    type = text
  }
  column "location" {
    null = false
    type = sql("geography(Point,4326)")
  }
  column "city" {
    null = true
    type = character_varying(100)
  }
  column "state" {
    null = true
    type = character_varying(50)
  }
  column "zip_code" {
    null = true
    type = character_varying(10)
  }
  column "school_district" {
    null = true
    type = character_varying(255)
  }
  column "property_type" {
    null = true
    type = character_varying(50)
  }
  column "bedrooms" {
    null = false
    type = integer
  }
  column "bathrooms" {
    null = true
    type = numeric(3,1)
  }
  column "square_feet" {
    null = true
    type = integer
  }
  column "parking_spaces" {
    null = true
    type = integer
  }
  column "monthly_rent" {
    null = false
    type = numeric(10,2)
  }
  column "security_deposit" {
    null = true
    type = numeric(10,2)
  }
  column "utilities_included" {
    null    = true
    type    = boolean
    default = false
  }
  column "utilities_estimate" {
    null = true
    type = numeric(10,2)
  }
  column "child_safety_features" {
    null = true
    type = jsonb
  }
  column "amenities" {
    null = true
    type = sql("text[]")
  }
  column "house_rules" {
    null = false
    type = text
  }
  column "pet_policy" {
    null = true
    type = character_varying(100)
  }
  column "max_occupants" {
    null = false
    type = integer
  }
  column "current_occupants" {
    null    = true
    type    = integer
    default = 1
  }
  column "available_rooms" {
    null = true
    type = integer
  }
  column "photos" {
    null = true
    type = jsonb
  }
  column "virtual_tour_url" {
    null = true
    type = text
  }
  column "lease_start_date" {
    null = true
    type = date
  }
  column "lease_end_date" {
    null = true
    type = date
  }
  column "lease_type" {
    null = true
    type = character_varying(50)
  }
  column "created_by" {
    null = true
    type = uuid
  }
  column "landlord_approved" {
    null    = true
    type    = boolean
    default = false
  }
  column "active" {
    null    = true
    type    = boolean
    default = true
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "households_created_by_fkey" {
    columns     = [column.created_by]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "idx_households_active" {
    columns = [column.active]
    where   = "(active = true)"
  }
  index "idx_households_created_by" {
    columns = [column.created_by]
  }
  index "idx_households_location" {
    columns = [column.location]
    type    = GIST
  }
  index "idx_households_rent" {
    columns = [column.monthly_rent]
  }
  check "households_lease_type_check" {
    expr = "((lease_type)::text = ANY ((ARRAY['month-to-month'::character varying, 'fixed-term'::character varying, 'sublease'::character varying])::text[]))"
  }
  check "households_property_type_check" {
    expr = "((property_type)::text = ANY ((ARRAY['house'::character varying, 'townhouse'::character varying, 'apartment'::character varying, 'condo'::character varying, 'other'::character varying])::text[]))"
  }
}
table "id_verifications" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "jumio_scan_reference" {
    null = true
    type = character_varying(255)
  }
  column "jumio_transaction_reference" {
    null = true
    type = character_varying(255)
  }
  column "id_type" {
    null = true
    type = character_varying(50)
  }
  column "id_number_hash" {
    null = true
    type = text
  }
  column "issuing_country" {
    null = true
    type = character_varying(3)
  }
  column "issuing_state" {
    null = true
    type = character_varying(50)
  }
  column "status" {
    null    = true
    type    = character_varying(50)
    default = "pending"
  }
  column "face_match_score" {
    null = true
    type = numeric(3,2)
  }
  column "document_validity" {
    null = true
    type = boolean
  }
  column "verified_first_name" {
    null = true
    type = character_varying(100)
  }
  column "verified_last_name" {
    null = true
    type = character_varying(100)
  }
  column "verified_dob" {
    null = true
    type = date
  }
  column "expires_at" {
    null = true
    type = date
  }
  column "verified_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "id_verifications_parent_id_fkey" {
    columns     = [column.parent_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  check "id_verifications_id_type_check" {
    expr = "((id_type)::text = ANY ((ARRAY['drivers_license'::character varying, 'passport'::character varying, 'state_id'::character varying, 'national_id'::character varying])::text[]))"
  }
  check "id_verifications_status_check" {
    expr = "((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'denied'::character varying, 'review'::character varying])::text[]))"
  }
  unique "id_verifications_jumio_scan_reference_key" {
    columns = [column.jumio_scan_reference]
  }
}
table "knex_migrations" {
  schema = schema.public
  column "id" {
    null = false
    type = serial
  }
  column "name" {
    null = true
    type = character_varying(255)
  }
  column "batch" {
    null = true
    type = integer
  }
  column "migration_time" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
}
table "knex_migrations_lock" {
  schema = schema.public
  column "index" {
    null = false
    type = serial
  }
  column "is_locked" {
    null = true
    type = integer
  }
  primary_key {
    columns = [column.index]
  }
}
table "match_group_members" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "match_group_id" {
    null = false
    type = uuid
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "role" {
    null    = false
    type    = text
    default = "member"
  }
  column "joined_at" {
    null    = true
    type    = timestamptz
    default = sql("CURRENT_TIMESTAMP")
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "match_group_members_match_group_id_foreign" {
    columns     = [column.match_group_id]
    ref_columns = [table.match_groups.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "match_group_members_user_id_foreign" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "match_group_members_match_group_id_index" {
    columns = [column.match_group_id]
  }
  index "match_group_members_user_id_index" {
    columns = [column.user_id]
  }
  check "match_group_members_role_check" {
    expr = "(role = ANY (ARRAY['initiator'::text, 'member'::text]))"
  }
  unique "match_group_members_match_group_id_user_id_unique" {
    columns = [column.match_group_id, column.user_id]
  }
}
table "match_groups" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "type" {
    null    = false
    type    = text
    default = "pair"
  }
  column "status" {
    null    = false
    type    = text
    default = "forming"
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("CURRENT_TIMESTAMP")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("CURRENT_TIMESTAMP")
  }
  primary_key {
    columns = [column.id]
  }
  index "match_groups_status_index" {
    columns = [column.status]
  }
  index "match_groups_type_index" {
    columns = [column.type]
  }
  check "match_groups_status_check" {
    expr = "(status = ANY (ARRAY['forming'::text, 'active'::text, 'dissolved'::text]))"
  }
  check "match_groups_type_check" {
    expr = "(type = ANY (ARRAY['pair'::text, 'trio'::text, 'quad'::text]))"
  }
}
table "matches" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "parent1_id" {
    null = true
    type = uuid
  }
  column "parent2_id" {
    null = true
    type = uuid
  }
  column "compatibility_score" {
    null = false
    type = numeric(5,2)
  }
  column "score_breakdown" {
    null = false
    type = jsonb
  }
  column "parent1_status" {
    null    = true
    type    = character_varying(20)
    default = "pending"
  }
  column "parent2_status" {
    null    = true
    type    = character_varying(20)
    default = "pending"
  }
  column "matched" {
    null    = true
    type    = boolean
    default = false
  }
  column "matched_at" {
    null = true
    type = timestamptz
  }
  column "parent1_viewed_at" {
    null = true
    type = timestamptz
  }
  column "parent2_viewed_at" {
    null = true
    type = timestamptz
  }
  column "conversation_started" {
    null    = true
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "matches_parent1_id_fkey" {
    columns     = [column.parent1_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "matches_parent2_id_fkey" {
    columns     = [column.parent2_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_matches_matched" {
    on {
      column = column.matched
    }
    on {
      desc   = true
      column = column.matched_at
    }
  }
  index "idx_matches_parent1" {
    columns = [column.parent1_id, column.parent2_status]
  }
  index "idx_matches_parent2" {
    columns = [column.parent2_id, column.parent1_status]
  }
  index "idx_matches_score" {
    on {
      desc   = true
      column = column.compatibility_score
    }
  }
  check "matches_check" {
    expr = "(parent1_id < parent2_id)"
  }
  check "matches_parent1_status_check" {
    expr = "((parent1_status)::text = ANY ((ARRAY['pending'::character varying, 'liked'::character varying, 'passed'::character varying, 'blocked'::character varying])::text[]))"
  }
  check "matches_parent2_status_check" {
    expr = "((parent2_status)::text = ANY ((ARRAY['pending'::character varying, 'liked'::character varying, 'passed'::character varying, 'blocked'::character varying])::text[]))"
  }
  unique "matches_parent1_id_parent2_id_key" {
    columns = [column.parent1_id, column.parent2_id]
  }
}
table "message_reports" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "message_id" {
    null = false
    type = uuid
  }
  column "reported_by" {
    null = false
    type = uuid
  }
  column "reported_user_id" {
    null = false
    type = uuid
  }
  column "report_type" {
    null = false
    type = character_varying(50)
  }
  column "description" {
    null = true
    type = text
  }
  column "status" {
    null    = true
    type    = character_varying(20)
    default = "pending"
  }
  column "severity" {
    null    = true
    type    = character_varying(20)
    default = "medium"
  }
  column "assigned_to" {
    null = true
    type = uuid
  }
  column "resolved_by" {
    null = true
    type = uuid
  }
  column "resolved_at" {
    null = true
    type = timestamptz
  }
  column "resolution_notes" {
    null = true
    type = text
  }
  column "action_taken" {
    null = true
    type = character_varying(50)
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "message_reports_assigned_to_fkey" {
    columns     = [column.assigned_to]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "message_reports_message_id_fkey" {
    columns     = [column.message_id]
    ref_columns = [table.messages.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "message_reports_reported_by_fkey" {
    columns     = [column.reported_by]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "message_reports_reported_user_id_fkey" {
    columns     = [column.reported_user_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "message_reports_resolved_by_fkey" {
    columns     = [column.resolved_by]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "idx_message_reports_assigned_to" {
    columns = [column.assigned_to]
  }
  index "idx_message_reports_message_id" {
    columns = [column.message_id]
  }
  index "idx_message_reports_reported_by" {
    columns = [column.reported_by]
  }
  index "idx_message_reports_reported_user_id" {
    columns = [column.reported_user_id]
  }
  index "idx_message_reports_severity" {
    columns = [column.severity]
  }
  index "idx_message_reports_status" {
    columns = [column.status]
  }
  index "idx_message_reports_status_severity" {
    columns = [column.status, column.severity]
  }
  check "message_reports_action_taken_check" {
    expr = "((action_taken)::text = ANY ((ARRAY['none'::character varying, 'warning_issued'::character varying, 'message_deleted'::character varying, 'user_suspended'::character varying, 'user_banned'::character varying, 'escalated'::character varying])::text[]))"
  }
  check "message_reports_report_type_check" {
    expr = "((report_type)::text = ANY ((ARRAY['inappropriate_content'::character varying, 'harassment'::character varying, 'spam'::character varying, 'scam'::character varying, 'child_safety_concern'::character varying, 'other'::character varying])::text[]))"
  }
  check "message_reports_severity_check" {
    expr = "((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))"
  }
  check "message_reports_status_check" {
    expr = "((status)::text = ANY ((ARRAY['pending'::character varying, 'investigating'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))"
  }
}
table "messages" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "conversation_id" {
    null = true
    type = uuid
  }
  column "sender_id" {
    null = true
    type = uuid
  }
  column "message_encrypted" {
    null = false
    type = text
  }
  column "message_type" {
    null    = true
    type    = character_varying(20)
    default = "text"
  }
  column "attachment_url" {
    null = true
    type = text
  }
  column "attachment_type" {
    null = true
    type = character_varying(50)
  }
  column "attachment_size_bytes" {
    null = true
    type = integer
  }
  column "delivered_at" {
    null = true
    type = timestamptz
  }
  column "read_at" {
    null = true
    type = timestamptz
  }
  column "deleted_by_sender" {
    null    = true
    type    = boolean
    default = false
  }
  column "deleted_by_recipient" {
    null    = true
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "encryption_iv" {
    null = true
    type = character_varying(32)
  }
  column "encryption_salt" {
    null = true
    type = character_varying(64)
  }
  column "encryption_version" {
    null    = true
    type    = character_varying(20)
    default = "aes-256-gcm-v1"
  }
  column "flagged_for_review" {
    null    = true
    type    = boolean
    default = false
  }
  column "reviewed_by" {
    null = true
    type = uuid
  }
  column "reviewed_at" {
    null = true
    type = timestamptz
  }
  column "moderation_status" {
    null    = true
    type    = character_varying(20)
    default = "auto_approved"
  }
  column "moderation_notes" {
    null = true
    type = text
  }
  column "metadata" {
    null = true
    type = jsonb
  }
  column "is_system_message" {
    null    = true
    type    = boolean
    default = false
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "messages_conversation_id_fkey" {
    columns     = [column.conversation_id]
    ref_columns = [table.conversations.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "messages_reviewed_by_fkey" {
    columns     = [column.reviewed_by]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "messages_sender_id_fkey" {
    columns     = [column.sender_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_messages_conversation" {
    on {
      column = column.conversation_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  index "idx_messages_flagged" {
    columns = [column.flagged_for_review]
  }
  index "idx_messages_flagged_moderation" {
    columns = [column.flagged_for_review, column.moderation_status]
  }
  index "idx_messages_moderation_status" {
    columns = [column.moderation_status]
  }
  index "idx_messages_sender" {
    columns = [column.sender_id]
  }
  check "messages_message_type_check" {
    expr = "((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'document'::character varying, 'system'::character varying])::text[]))"
  }
}
table "parents" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "user_id" {
    null = true
    type = uuid
  }
  column "first_name" {
    null = false
    type = character_varying(100)
  }
  column "last_name" {
    null = false
    type = character_varying(100)
  }
  column "bio" {
    null = true
    type = text
  }
  column "profile_photo_url" {
    null = true
    type = text
  }
  column "date_of_birth" {
    null = false
    type = date
  }
  column "children_count" {
    null = false
    type = integer
  }
  column "children_age_groups" {
    null = false
    type = sql("text[]")
  }
  column "occupation" {
    null = true
    type = character_varying(255)
  }
  column "employer" {
    null = true
    type = character_varying(255)
  }
  column "work_schedule" {
    null = true
    type = jsonb
  }
  column "work_from_home" {
    null    = true
    type    = boolean
    default = false
  }
  column "parenting_style" {
    null = true
    type = character_varying(50)
  }
  column "household_preferences" {
    null = true
    type = jsonb
  }
  column "dietary_restrictions" {
    null = true
    type = sql("text[]")
  }
  column "allergies" {
    null = true
    type = sql("text[]")
  }
  column "verified_status" {
    null    = true
    type    = character_varying(50)
    default = "pending"
  }
  column "background_check_status" {
    null    = true
    type    = character_varying(50)
    default = "not_started"
  }
  column "background_check_date" {
    null = true
    type = date
  }
  column "id_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "income_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "references_count" {
    null    = true
    type    = integer
    default = 0
  }
  column "location" {
    null = true
    type = sql("geography(Point,4326)")
  }
  column "city" {
    null = true
    type = character_varying(100)
  }
  column "state" {
    null = true
    type = character_varying(50)
  }
  column "zip_code" {
    null = true
    type = character_varying(10)
  }
  column "preferred_radius" {
    null    = true
    type    = integer
    default = 10
  }
  column "school_districts" {
    null = true
    type = sql("text[]")
  }
  column "budget_min" {
    null = true
    type = numeric(10,2)
  }
  column "budget_max" {
    null = true
    type = numeric(10,2)
  }
  column "move_in_date" {
    null = true
    type = date
  }
  column "looking_for_housing" {
    null    = true
    type    = boolean
    default = true
  }
  column "profile_completed" {
    null    = true
    type    = boolean
    default = false
  }
  column "profile_completion_percentage" {
    null    = true
    type    = integer
    default = 0
  }
  column "trust_score" {
    null    = true
    type    = numeric(3,2)
    default = 0.5
  }
  column "response_rate" {
    null    = true
    type    = numeric(3,2)
    default = 0
  }
  column "average_response_time" {
    null = true
    type = integer
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "open_to_group_living" {
    null    = true
    type    = boolean
    default = false
  }
  column "preferred_household_size" {
    null    = true
    type    = integer
    default = 2
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "parents_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_parents_budget" {
    columns = [column.budget_min, column.budget_max]
  }
  index "idx_parents_location" {
    columns = [column.location]
    type    = GIST
  }
  index "idx_parents_looking_for_housing" {
    columns = [column.looking_for_housing]
    where   = "(looking_for_housing = true)"
  }
  index "idx_parents_school_districts" {
    columns = [column.school_districts]
    type    = GIN
  }
  index "idx_parents_user_id" {
    columns = [column.user_id]
  }
  index "idx_parents_verified_status" {
    columns = [column.verified_status]
  }
  index "parents_open_to_group_living_index" {
    columns = [column.open_to_group_living]
  }
  check "chk_parents_preferred_household_size" {
    expr = "((preferred_household_size >= 2) AND (preferred_household_size <= 6))"
  }
  check "parents_background_check_status_check" {
    expr = "((background_check_status)::text = ANY ((ARRAY['not_started'::character varying, 'pending'::character varying, 'clear'::character varying, 'review'::character varying, 'failed'::character varying])::text[]))"
  }
  check "parents_children_count_check" {
    expr = "(children_count > 0)"
  }
  check "parents_verified_status_check" {
    expr = "((verified_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[]))"
  }
  unique "parents_user_id_key" {
    columns = [column.user_id]
  }
}
table "payments" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "household_id" {
    null = true
    type = uuid
  }
  column "payer_id" {
    null = true
    type = uuid
  }
  column "recipient_id" {
    null = true
    type = uuid
  }
  column "stripe_payment_intent_id" {
    null = true
    type = character_varying(255)
  }
  column "stripe_charge_id" {
    null = true
    type = character_varying(255)
  }
  column "amount" {
    null = false
    type = numeric(10,2)
  }
  column "currency" {
    null    = true
    type    = character_varying(3)
    default = "USD"
  }
  column "payment_type" {
    null = true
    type = character_varying(50)
  }
  column "status" {
    null    = true
    type    = character_varying(50)
    default = "pending"
  }
  column "description" {
    null = true
    type = text
  }
  column "due_date" {
    null = true
    type = date
  }
  column "paid_at" {
    null = true
    type = timestamptz
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "payments_household_id_fkey" {
    columns     = [column.household_id]
    ref_columns = [table.households.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "payments_payer_id_fkey" {
    columns     = [column.payer_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "payments_recipient_id_fkey" {
    columns     = [column.recipient_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  index "idx_payments_household" {
    on {
      column = column.household_id
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  index "idx_payments_payer" {
    columns = [column.payer_id]
  }
  index "idx_payments_status" {
    columns = [column.status, column.due_date]
  }
  check "payments_payment_type_check" {
    expr = "((payment_type)::text = ANY ((ARRAY['rent'::character varying, 'utilities'::character varying, 'deposit'::character varying, 'subscription'::character varying, 'success_fee'::character varying])::text[]))"
  }
  check "payments_status_check" {
    expr = "((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))"
  }
  unique "payments_stripe_payment_intent_id_key" {
    columns = [column.stripe_payment_intent_id]
  }
}
table "reports" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "reporter_id" {
    null = true
    type = uuid
  }
  column "reported_user_id" {
    null = true
    type = uuid
  }
  column "reported_message_id" {
    null = true
    type = uuid
  }
  column "report_type" {
    null = true
    type = character_varying(50)
  }
  column "description" {
    null = false
    type = text
  }
  column "evidence_urls" {
    null = true
    type = jsonb
  }
  column "status" {
    null    = true
    type    = character_varying(50)
    default = "pending"
  }
  column "reviewed_by" {
    null = true
    type = uuid
  }
  column "review_notes" {
    null = true
    type = text
  }
  column "action_taken" {
    null = true
    type = character_varying(100)
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "resolved_at" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "reports_reported_message_id_fkey" {
    columns     = [column.reported_message_id]
    ref_columns = [table.messages.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "reports_reported_user_id_fkey" {
    columns     = [column.reported_user_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "reports_reporter_id_fkey" {
    columns     = [column.reporter_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = SET_NULL
  }
  foreign_key "reports_reviewed_by_fkey" {
    columns     = [column.reviewed_by]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = NO_ACTION
  }
  index "idx_reports_reported_user" {
    columns = [column.reported_user_id]
  }
  index "idx_reports_status" {
    on {
      column = column.status
    }
    on {
      desc   = true
      column = column.created_at
    }
  }
  check "reports_report_type_check" {
    expr = "((report_type)::text = ANY ((ARRAY['harassment'::character varying, 'inappropriate_content'::character varying, 'scam'::character varying, 'safety_concern'::character varying, 'fake_profile'::character varying, 'other'::character varying])::text[]))"
  }
  check "reports_status_check" {
    expr = "((status)::text = ANY ((ARRAY['pending'::character varying, 'investigating'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[]))"
  }
}
table "saved_profiles" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "profile_id" {
    null = false
    type = uuid
  }
  column "folder" {
    null = false
    type = character_varying(50)
  }
  column "notes_encrypted" {
    null = true
    type = text
  }
  column "notes_iv" {
    null = true
    type = character_varying(32)
  }
  column "saved_at" {
    null    = false
    type    = timestamp
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "saved_profiles_profile_id_fkey" {
    columns     = [column.profile_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "saved_profiles_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_saved_profiles_folder" {
    columns = [column.user_id, column.folder]
  }
  index "idx_saved_profiles_saved_at" {
    on {
      column = column.user_id
    }
    on {
      desc   = true
      column = column.saved_at
    }
  }
  index "idx_saved_profiles_user_id" {
    columns = [column.user_id]
  }
  check "chk_saved_profiles_folder" {
    expr = "((folder)::text = ANY ((ARRAY['Top Choice'::character varying, 'Strong Maybe'::character varying, 'Considering'::character varying, 'Backup'::character varying])::text[]))"
  }
  check "chk_saved_profiles_not_own" {
    expr = "(user_id <> profile_id)"
  }
  unique "idx_saved_profiles_unique" {
    columns = [column.user_id, column.profile_id]
  }
}
table "stripe_accounts" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "stripe_customer_id" {
    null = false
    type = character_varying(255)
  }
  column "stripe_connect_account_id" {
    null = true
    type = character_varying(255)
  }
  column "onboarding_complete" {
    null    = true
    type    = boolean
    default = false
  }
  column "payouts_enabled" {
    null    = true
    type    = boolean
    default = false
  }
  column "charges_enabled" {
    null    = true
    type    = boolean
    default = false
  }
  column "default_payment_method_id" {
    null = true
    type = character_varying(255)
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "stripe_accounts_parent_id_fkey" {
    columns     = [column.parent_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  unique "stripe_accounts_parent_id_key" {
    columns = [column.parent_id]
  }
  unique "stripe_accounts_stripe_connect_account_id_key" {
    columns = [column.stripe_connect_account_id]
  }
  unique "stripe_accounts_stripe_customer_id_key" {
    columns = [column.stripe_customer_id]
  }
}
table "subscriptions" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "parent_id" {
    null = true
    type = uuid
  }
  column "stripe_subscription_id" {
    null = true
    type = character_varying(255)
  }
  column "stripe_price_id" {
    null = true
    type = character_varying(255)
  }
  column "plan_type" {
    null = true
    type = character_varying(50)
  }
  column "status" {
    null = true
    type = character_varying(50)
  }
  column "current_period_start" {
    null = true
    type = timestamptz
  }
  column "current_period_end" {
    null = true
    type = timestamptz
  }
  column "cancel_at_period_end" {
    null    = true
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "subscriptions_parent_id_fkey" {
    columns     = [column.parent_id]
    ref_columns = [table.parents.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  check "subscriptions_plan_type_check" {
    expr = "((plan_type)::text = ANY ((ARRAY['free'::character varying, 'premium'::character varying, 'enterprise'::character varying])::text[]))"
  }
  check "subscriptions_status_check" {
    expr = "((status)::text = ANY ((ARRAY['active'::character varying, 'canceled'::character varying, 'past_due'::character varying, 'trialing'::character varying])::text[]))"
  }
  unique "subscriptions_stripe_subscription_id_key" {
    columns = [column.stripe_subscription_id]
  }
}
table "swipes" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "target_user_id" {
    null = false
    type = uuid
  }
  column "swipe_direction" {
    null = false
    type = character_varying(10)
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "swipes_target_user_id_fkey" {
    columns     = [column.target_user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  foreign_key "swipes_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_swipes_target_user_id" {
    columns = [column.target_user_id]
  }
  index "idx_swipes_user_id" {
    columns = [column.user_id]
  }
  check "swipes_swipe_direction_check" {
    expr = "((swipe_direction)::text = ANY ((ARRAY['left'::character varying, 'right'::character varying])::text[]))"
  }
  unique "swipes_user_id_target_user_id_key" {
    columns = [column.user_id, column.target_user_id]
  }
}
table "users" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("uuid_generate_v4()")
  }
  column "email" {
    null = false
    type = character_varying(255)
  }
  column "phone" {
    null = true
    type = character_varying(20)
  }
  column "password_hash" {
    null = false
    type = text
  }
  column "email_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "phone_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "mfa_enabled" {
    null    = true
    type    = boolean
    default = false
  }
  column "mfa_secret" {
    null = true
    type = text
  }
  column "refresh_token_hash" {
    null = true
    type = text
  }
  column "last_login" {
    null = true
    type = timestamptz
  }
  column "account_status" {
    null    = true
    type    = character_varying(20)
    default = "active"
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "status" {
    null    = true
    type    = text
    default = "active"
  }
  primary_key {
    columns = [column.id]
  }
  index "idx_users_created_at" {
    on {
      desc   = true
      column = column.created_at
    }
  }
  index "idx_users_email" {
    columns = [column.email]
  }
  index "idx_users_phone" {
    columns = [column.phone]
  }
  check "email_format" {
    expr = "((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'::text)"
  }
  check "users_account_status_check" {
    expr = "((account_status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'deleted'::character varying])::text[]))"
  }
  check "users_status_check" {
    expr = "(status = ANY (ARRAY['active'::text, 'suspended'::text, 'deactivated'::text]))"
  }
  unique "users_email_key" {
    columns = [column.email]
  }
  unique "users_phone_key" {
    columns = [column.phone]
  }
}
table "verifications" {
  schema = schema.public
  column "id" {
    null    = false
    type    = uuid
    default = sql("gen_random_uuid()")
  }
  column "user_id" {
    null = false
    type = uuid
  }
  column "id_verification_status" {
    null    = true
    type    = character_varying(20)
    default = "pending"
  }
  column "id_verification_date" {
    null = true
    type = timestamptz
  }
  column "id_verification_data" {
    null = true
    type = text
  }
  column "background_check_status" {
    null    = true
    type    = character_varying(20)
    default = "pending"
  }
  column "background_check_date" {
    null = true
    type = timestamptz
  }
  column "background_check_report_id" {
    null = true
    type = character_varying(255)
  }
  column "income_verification_status" {
    null    = true
    type    = character_varying(20)
    default = "pending"
  }
  column "income_verification_date" {
    null = true
    type = timestamptz
  }
  column "income_range" {
    null = true
    type = character_varying(50)
  }
  column "phone_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "phone_verification_date" {
    null = true
    type = timestamptz
  }
  column "email_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "email_verification_date" {
    null = true
    type = timestamptz
  }
  column "verification_score" {
    null    = true
    type    = integer
    default = 0
  }
  column "fully_verified" {
    null    = true
    type    = boolean
    default = false
  }
  column "created_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "updated_at" {
    null    = false
    type    = timestamptz
    default = sql("now()")
  }
  column "admin_review_required" {
    null    = true
    type    = boolean
    default = false
  }
  column "id_provider" {
    null = true
    type = character_varying(50)
  }
  column "background_provider" {
    null = true
    type = character_varying(50)
  }
  primary_key {
    columns = [column.id]
  }
  foreign_key "verifications_user_id_fkey" {
    columns     = [column.user_id]
    ref_columns = [table.users.column.id]
    on_update   = NO_ACTION
    on_delete   = CASCADE
  }
  index "idx_verifications_fully_verified" {
    columns = [column.fully_verified]
  }
  index "idx_verifications_score" {
    columns = [column.verification_score]
  }
  check "verifications_background_check_status_check" {
    expr = "((background_check_status)::text = ANY ((ARRAY['pending'::character varying, 'clear'::character varying, 'consider'::character varying, 'suspended'::character varying, 'not_started'::character varying])::text[]))"
  }
  check "verifications_id_verification_status_check" {
    expr = "((id_verification_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[]))"
  }
  check "verifications_income_verification_status_check" {
    expr = "((income_verification_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[]))"
  }
  unique "verifications_user_id_key" {
    columns = [column.user_id]
  }
}
schema "public" {
  comment = "standard public schema"
}
