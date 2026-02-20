package main

import rego.v1

deny contains msg if {
  some resource in input.resource_changes
  resource.type == "aws_security_group"
  some ingress in resource.change.after.ingress
  ingress.from_port <= 22
  ingress.to_port >= 22
  some cidr in ingress.cidr_blocks
  cidr == "0.0.0.0/0"
  msg := sprintf(
    "DENY: Security group '%s' allows SSH (port 22) from 0.0.0.0/0. SSH must not be open to the internet. [CoNest Security Policy]",
    [resource.address],
  )
}

deny contains msg if {
  some resource in input.resource_changes
  resource.type == "aws_security_group"
  some ingress in resource.change.after.ingress
  ingress.from_port <= 22
  ingress.to_port >= 22
  some cidr in ingress.ipv6_cidr_blocks
  cidr == "::/0"
  msg := sprintf(
    "DENY: Security group '%s' allows SSH (port 22) from ::/0 (IPv6). SSH must not be open to the internet. [CoNest Security Policy]",
    [resource.address],
  )
}
