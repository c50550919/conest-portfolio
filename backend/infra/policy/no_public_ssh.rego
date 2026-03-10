package main

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  ingress := resource.change.after.ingress[_]
  ingress.from_port <= 22
  ingress.to_port >= 22
  cidr := ingress.cidr_blocks[_]
  cidr == "0.0.0.0/0"
  msg := sprintf(
    "DENY: Security group '%s' allows SSH (port 22) from 0.0.0.0/0. SSH must not be open to the internet. [CoNest Security Policy]",
    [resource.address],
  )
}

deny[msg] {
  resource := input.resource_changes[_]
  resource.type == "aws_security_group"
  ingress := resource.change.after.ingress[_]
  ingress.from_port <= 22
  ingress.to_port >= 22
  cidr := ingress.ipv6_cidr_blocks[_]
  cidr == "::/0"
  msg := sprintf(
    "DENY: Security group '%s' allows SSH (port 22) from ::/0 (IPv6). SSH must not be open to the internet. [CoNest Security Policy]",
    [resource.address],
  )
}
