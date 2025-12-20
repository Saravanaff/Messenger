#!/bin/bash

# Setup MySQL user for chat app
echo "Setting up MySQL database and user..."

# You'll be prompted for your MySQL root password
mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS chatapp;
CREATE USER IF NOT EXISTS 'chatuser'@'localhost' IDENTIFIED BY 'chatpassword';
GRANT ALL PRIVILEGES ON chatapp.* TO 'chatuser'@'localhost';
FLUSH PRIVILEGES;
SELECT User, Host FROM mysql.user WHERE User = 'chatuser';
EOF

echo "✅ Database setup complete!"
echo "Now run: cd backend && npm run dev"
