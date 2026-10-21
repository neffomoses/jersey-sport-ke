<<<<<<< HEAD
CREATE DATABASE IF NOT EXISTS jersey_sport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jersey_sport;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(130) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  items TEXT NOT NULL,
  total VARCHAR(80) NOT NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
=======
CREATE DATABASE IF NOT EXISTS jersey_sport CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jersey_sport;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(130) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  items TEXT NOT NULL,
  total VARCHAR(80) NOT NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
>>>>>>> f17c75c (Add website files and netlify config)
