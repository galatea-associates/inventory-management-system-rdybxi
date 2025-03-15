# Local variables
locals {
  common_tags = {
    Project     = "IMS"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Find latest Amazon Linux 2 AMI for EC2 instances
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "ims-${var.environment}-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  tags = {
    Name        = "ims-${var.environment}-cluster"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# EKS Node Group for application services
resource "aws_eks_node_group" "app" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "ims-${var.environment}-app-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.eks_node_groups.app.instance_types

  scaling_config {
    desired_size = var.eks_node_groups.app.scaling_config.desired_size
    min_size     = var.eks_node_groups.app.scaling_config.min_size
    max_size     = var.eks_node_groups.app.scaling_config.max_size
  }

  labels = {
    role = "app"
  }

  tags = {
    Name        = "ims-${var.environment}-app-nodes"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# EKS Node Group for calculation services
resource "aws_eks_node_group" "calculation" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "ims-${var.environment}-calculation-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.eks_node_groups.calculation.instance_types

  scaling_config {
    desired_size = var.eks_node_groups.calculation.scaling_config.desired_size
    min_size     = var.eks_node_groups.calculation.scaling_config.min_size
    max_size     = var.eks_node_groups.calculation.scaling_config.max_size
  }

  labels = {
    role = "calculation"
  }

  taints = [
    {
      key    = "dedicated"
      value  = "calculation"
      effect = "NO_SCHEDULE"
    }
  ]

  tags = {
    Name        = "ims-${var.environment}-calculation-nodes"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# EKS Node Group for data processing services
resource "aws_eks_node_group" "data" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "ims-${var.environment}-data-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = var.eks_node_groups.data.instance_types

  scaling_config {
    desired_size = var.eks_node_groups.data.scaling_config.desired_size
    min_size     = var.eks_node_groups.data.scaling_config.min_size
    max_size     = var.eks_node_groups.data.scaling_config.max_size
  }

  labels = {
    role = "data"
  }

  taints = [
    {
      key    = "dedicated"
      value  = "data"
      effect = "NO_SCHEDULE"
    }
  ]

  tags = {
    Name        = "ims-${var.environment}-data-nodes"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# IAM Role for EKS Cluster
resource "aws_iam_role" "eks_cluster" {
  name = "ims-${var.environment}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

# Attach the AmazonEKSClusterPolicy to the cluster role
resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# IAM Role for EKS Nodes
resource "aws_iam_role" "eks_node" {
  name = "ims-${var.environment}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Attach policies to the node role
resource "aws_iam_role_policy_attachment" "eks_node_worker_policy" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Security Group for EKS Cluster
resource "aws_security_group" "eks_cluster" {
  name        = "ims-${var.environment}-eks-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
    description = "Kubernetes API server"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "ims-${var.environment}-eks-cluster-sg"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Launch Template for Cassandra Nodes
resource "aws_launch_template" "cassandra" {
  name        = "ims-${var.environment}-cassandra-lt"
  description = "Launch template for Cassandra nodes"
  
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.cassandra_instance_type
  key_name      = var.ssh_key_name
  
  vpc_security_group_ids = [var.app_security_group_id]
  
  iam_instance_profile {
    name = aws_iam_instance_profile.cassandra.name
  }
  
  block_device_mappings {
    device_name = "/dev/xvda"
    
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }
  
  # Additional volume for Cassandra data
  block_device_mappings {
    device_name = "/dev/sdf"
    
    ebs {
      volume_size           = 1000
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }
  
  user_data = base64encode(templatefile("${path.module}/templates/cassandra-user-data.sh.tpl", {
    cluster_name = "ims-${var.environment}-cassandra"
    environment = var.environment
  }))
  
  tags = {
    Name        = "ims-${var.environment}-cassandra-lt"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Auto Scaling Group for Cassandra
resource "aws_autoscaling_group" "cassandra" {
  name = "ims-${var.environment}-cassandra-asg"
  
  launch_template {
    id      = aws_launch_template.cassandra.id
    version = "$Latest"
  }
  
  min_size             = var.cassandra_node_count
  max_size             = var.cassandra_node_count
  desired_capacity     = var.cassandra_node_count
  vpc_zone_identifier  = var.private_subnet_ids
  
  health_check_type         = "EC2"
  health_check_grace_period = 300
  termination_policies      = ["OldestInstance"]
  
  tag {
    key                 = "Name"
    value               = "ims-${var.environment}-cassandra"
    propagate_at_launch = true
  }
  
  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
  
  tag {
    key                 = "Project"
    value               = "IMS"
    propagate_at_launch = true
  }
  
  tag {
    key                 = "ManagedBy"
    value               = "Terraform"
    propagate_at_launch = true
  }
}

# IAM Role for Cassandra Nodes
resource "aws_iam_role" "cassandra" {
  name = "ims-${var.environment}-cassandra-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# IAM Instance Profile for Cassandra Nodes
resource "aws_iam_instance_profile" "cassandra" {
  name = "ims-${var.environment}-cassandra-profile"
  role = aws_iam_role.cassandra.name
}

# IAM Policy for Cassandra Node Discovery
resource "aws_iam_role_policy" "cassandra_discovery" {
  name = "ims-${var.environment}-cassandra-discovery-policy"
  role = aws_iam_role.cassandra.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "autoscaling:DescribeAutoScalingGroups"
        ],
        Effect = "Allow",
        Resource = "*"
      }
    ]
  })
}

# Launch Template for InfluxDB Nodes
resource "aws_launch_template" "influxdb" {
  name        = "ims-${var.environment}-influxdb-lt"
  description = "Launch template for InfluxDB nodes"
  
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.influxdb_instance_type
  key_name      = var.ssh_key_name
  
  vpc_security_group_ids = [var.app_security_group_id]
  
  iam_instance_profile {
    name = aws_iam_instance_profile.influxdb.name
  }
  
  block_device_mappings {
    device_name = "/dev/xvda"
    
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }
  
  # Additional volume for InfluxDB data
  block_device_mappings {
    device_name = "/dev/sdf"
    
    ebs {
      volume_size           = 500
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }
  
  user_data = base64encode(templatefile("${path.module}/templates/influxdb-user-data.sh.tpl", {
    cluster_name = "ims-${var.environment}-influxdb"
    environment = var.environment
  }))
  
  tags = {
    Name        = "ims-${var.environment}-influxdb-lt"
    Environment = var.environment
    Project     = "IMS"
    ManagedBy   = "Terraform"
  }
}

# Auto Scaling Group for InfluxDB
resource "aws_autoscaling_group" "influxdb" {
  name = "ims-${var.environment}-influxdb-asg"
  
  launch_template {
    id      = aws_launch_template.influxdb.id
    version = "$Latest"
  }
  
  min_size             = var.influxdb_node_count
  max_size             = var.influxdb_node_count
  desired_capacity     = var.influxdb_node_count
  vpc_zone_identifier  = var.private_subnet_ids
  
  health_check_type         = "EC2"
  health_check_grace_period = 300
  termination_policies      = ["OldestInstance"]
  
  tag {
    key                 = "Name"
    value               = "ims-${var.environment}-influxdb"
    propagate_at_launch = true
  }
  
  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }
  
  tag {
    key                 = "Project"
    value               = "IMS"
    propagate_at_launch = true
  }
  
  tag {
    key                 = "ManagedBy"
    value               = "Terraform"
    propagate_at_launch = true
  }
}

# IAM Role for InfluxDB Nodes
resource "aws_iam_role" "influxdb" {
  name = "ims-${var.environment}-influxdb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# IAM Instance Profile for InfluxDB Nodes
resource "aws_iam_instance_profile" "influxdb" {
  name = "ims-${var.environment}-influxdb-profile"
  role = aws_iam_role.influxdb.name
}

# IAM Policy for InfluxDB Node Discovery
resource "aws_iam_role_policy" "influxdb_discovery" {
  name = "ims-${var.environment}-influxdb-discovery-policy"
  role = aws_iam_role.influxdb.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "autoscaling:DescribeAutoScalingGroups"
        ],
        Effect = "Allow",
        Resource = "*"
      }
    ]
  })
}

# EKS Cluster Authentication
data "aws_eks_cluster_auth" "cluster" {
  name = aws_eks_cluster.main.name
}

# Outputs
output "eks_cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "eks_cluster_name" {
  description = "The name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "The endpoint for the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "The certificate authority data for the EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "eks_node_groups" {
  description = "The EKS node groups"
  value = {
    app = aws_eks_node_group.app.id
    calculation = aws_eks_node_group.calculation.id
    data = aws_eks_node_group.data.id
  }
}

output "cassandra_asg_name" {
  description = "The name of the Cassandra Auto Scaling Group"
  value       = aws_autoscaling_group.cassandra.name
}

output "influxdb_asg_name" {
  description = "The name of the InfluxDB Auto Scaling Group"
  value       = aws_autoscaling_group.influxdb.name
}