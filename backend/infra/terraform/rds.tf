resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  engine            = "postgres"
  engine_version    = "15"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = "conest_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  publicly_accessible = false

  backup_retention_period = var.environment == "prod" ? 30 : 7
  multi_az                = var.environment == "prod"
  deletion_protection     = var.environment == "prod"

  skip_final_snapshot = var.environment != "prod"

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}
