package main

import rego.v1

deny contains msg if {
  bucket_count := count([r |
    some r in input.resource_changes
    r.type == "aws_s3_bucket"
    r.change.actions != ["delete"]
  ])
  encryption_count := count([r |
    some r in input.resource_changes
    r.type == "aws_s3_bucket_server_side_encryption_configuration"
    r.change.actions != ["delete"]
  ])
  bucket_count > 0
  bucket_count > encryption_count
  msg := sprintf(
    "DENY: Found %d S3 bucket(s) but only %d encryption config(s). Every aws_s3_bucket must have a matching aws_s3_bucket_server_side_encryption_configuration. [CoNest Security Policy]",
    [bucket_count, encryption_count],
  )
}
