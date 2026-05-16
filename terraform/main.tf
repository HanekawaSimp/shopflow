provider "aws" {
    region = "ap-south-1"
}

resource "aws_vpc" "shopflow_vpc" {
    cidr_block = "10.0.0.0/16"
    enable_dns_support = true
    enable_dns_hostnames = true
    tags = {
        Name = "shopflow-vpc"
    }
}

resource "aws_subnet" "shopflow_public_subnet" {
    vpc_id = aws_vpc.shopflow_vpc.id
    cidr_block = "10.0.1.0/24"
    map_public_ip_on_launch = true
    availability_zone = "ap-south-1a"

    tags = {
        Name = "shopflow-public-subnet"
    }
}

resource "aws_internet_gateway" "shopflow_igw" {
    vpc_id = aws_vpc.shopflow_vpc.id
    tags = {
        Name = "shopflow-igw"
    }
}

resource "aws_route_table" "shopflow_public_rt" {
    vpc_id = aws_vpc.shopflow_vpc.id

    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.shopflow_igw.id
    }

    tags = {
        Name = "shopflow-public-rt"
    }
}

resource "aws_route_table_association" "shopflow_public_rt_assoc" {
    subnet_id = aws_subnet.shopflow_public_subnet.id
    route_table_id = aws_route_table.shopflow_public_rt.id
}

resource "aws_security_group" "shopflow_sg" {
    name = "shopflow-sg"
    description = "Allow SSH and Frontend inbound traffic"
    vpc_id = aws_vpc.shopflow_vpc.id

    #Inbound: Allow SSH
    ingress {
        from_port = 22
        to_port = 22
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }
    #Inbound: Allow Frontend (port 80)
    ingress {
        from_port = 8080
        to_port = 8080
        protocol = "tcp"
        cidr_blocks = ["182.69.181.226/32"] # Replace with your IP for better security
    }
    #Outboud: Allow everything (to download Docker, packages, etc.)
    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }
}

resource "aws_instance" "shopflow_ec2" {
    ami = "ami-0f5ee92e2d63afc18"
    instance_type = "t3.medium"
    subnet_id = aws_subnet.shopflow_public_subnet.id
    vpc_security_group_ids = [aws_security_group.shopflow_sg.id]
   key_name = aws_key_pair.shopflow_key_pair.key_name

    tags = {
        Name = "shopflow-server"
    }
}

resource "tls_private_key" "shopflow_key" {
    algorithm = "RSA"
    rsa_bits = 4096
}

resource "aws_key_pair" "shopflow_key_pair" {
    key_name = "shopflow-key"
    public_key = tls_private_key.shopflow_key.public_key_openssh
}

resource "local_file" "shopflow_private_key" {
    content = tls_private_key.shopflow_key.private_key_pem
    filename = "${path.module}/shopflow-key.pem"
    file_permission = "0400"
}

output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value = aws_instance.shopflow_ec2.public_ip
}