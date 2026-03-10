package main

deny[msg] {
  bucket_count := count([r |
    r := input.resource_changes[_]
    r.type == "aws_s3_bucket"
    r.change.actions != ["delete"]
  ])
  encryption_count := count([r |
    r := input.resource_changes[_]
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
