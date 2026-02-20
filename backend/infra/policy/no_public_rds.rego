package main

import rego.v1

deny contains msg if {
  resource := input.resource_changes[_]
  resource.type == "aws_db_instance"
  resource.change.after.publicly_accessible == true
  msg := sprintf(
    "DENY: RDS instance '%s' has publicly_accessible = true. All databases must remain private. [CoNest Security Policy]",
    [resource.address],
  )
}
