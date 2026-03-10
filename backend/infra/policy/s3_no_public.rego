package main

deny[msg] {
  bucket_count := count([r |
    r := input.resource_changes[_]
    r.type == "aws_s3_bucket"
    r.change.actions != ["delete"]
  ])
  block_count := count([r |
    r := input.resource_changes[_]
    r.type == "aws_s3_bucket_public_access_block"
    r.change.actions != ["delete"]
  ])
  bucket_count > 0
  bucket_count > block_count
  msg := sprintf(
    "DENY: Found %d S3 bucket(s) but only %d public access block(s). Every aws_s3_bucket must have a matching aws_s3_bucket_public_access_block. [CoNest Security Policy]",
    [bucket_count, block_count],
  )
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.after.block_public_acls != true
  msg := sprintf(
    "DENY: S3 public access block '%s' must have block_public_acls = true. [CoNest Security Policy]",
    [resource.address],
  )
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.after.block_public_policy != true
  msg := sprintf(
    "DENY: S3 public access block '%s' must have block_public_policy = true. [CoNest Security Policy]",
    [resource.address],
  )
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.after.ignore_public_acls != true
  msg := sprintf(
    "DENY: S3 public access block '%s' must have ignore_public_acls = true. [CoNest Security Policy]",
    [resource.address],
  )
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_s3_bucket_public_access_block"
  resource.change.after.restrict_public_buckets != true
  msg := sprintf(
    "DENY: S3 public access block '%s' must have restrict_public_buckets = true. [CoNest Security Policy]",
    [resource.address],
  )
}
