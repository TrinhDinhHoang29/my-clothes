CREATE DATABASE IF NOT EXISTS myclothes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myclothes;

CREATE TABLE IF NOT EXISTS users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name  VARCHAR(100) DEFAULT '',
  last_name   VARCHAR(100) DEFAULT '',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS addresses (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  street      VARCHAR(255) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(100) DEFAULT '',
  postal_code VARCHAR(20)  DEFAULT '',
  country     VARCHAR(100) NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS products (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,
  image_url   VARCHAR(500),
  category    VARCHAR(100) NOT NULL,
  stock       INT DEFAULT 100,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_stock (stock)
);

-- Seed product data
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Classic White T-Shirt',   'Premium 100% cotton t-shirt, breathable and perfect for everyday wear. Available in multiple sizes.', 29.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', 'T-Shirts', 150),
('Graphic Print Tee',       'Trendy oversized graphic tee with modern urban print. Soft jersey fabric for all-day comfort.',          34.99, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80', 'T-Shirts', 120),
('Striped Polo Shirt',      'Classic striped polo shirt in pique cotton. Smart-casual look suitable for work or weekend.',            45.99, 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=500&q=80', 'T-Shirts', 90),
('Slim Fit Blue Jeans',     'Premium slim fit denim jeans with 2% stretch for comfort. Mid-rise waist with 5-pocket design.',        79.99, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80', 'Pants',   80),
('Khaki Chino Pants',       'Classic chino pants in versatile khaki. Straight fit with button closure and zip fly.',                64.99, 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&q=80', 'Pants',   70),
('Casual Linen Trousers',   'Lightweight linen trousers perfect for warm weather. Relaxed fit with elastic waistband.',              55.99, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80', 'Pants',   60),
('Summer Floral Dress',     'Light and breezy floral print midi dress. Perfect for summer days and casual outings.',                 59.99, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80', 'Dresses', 60),
('Black Evening Gown',      'Elegant floor-length evening gown in premium crepe fabric. Flattering A-line silhouette.',             249.99, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500&q=80', 'Dresses', 20),
('Wrap Maxi Dress',         'Versatile wrap maxi dress in soft jersey fabric. Adjustable tie waist for a perfect fit.',              74.99, 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&q=80', 'Dresses', 45),
('Black Leather Jacket',    'Genuine full-grain leather jacket with quilted lining. Classic biker style with silver hardware.',     199.99, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&q=80', 'Jackets', 30),
('Classic Denim Jacket',    'Iconic blue denim jacket in 100% cotton. Versatile layering piece for any season.',                    89.99, 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=500&q=80', 'Jackets', 45),
('Wool Blend Blazer',       'Sharp wool-blend blazer with notch lapels. Ideal for business casual and formal occasions.',          149.99, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80', 'Jackets', 35),
('Fleece Zip Hoodie',       'Ultra-soft fleece zip-up hoodie with kangaroo pockets. Cozy essential for cooler days.',               54.99, 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=500&q=80', 'Hoodies', 130),
('Pullover Graphic Hoodie', 'Heavyweight cotton pullover hoodie with bold front graphic. Relaxed fit with ribbed cuffs.',           64.99, 'https://images.unsplash.com/photo-1578768079052-aa76e52ff770?w=500&q=80', 'Hoodies', 100),
('Navy Blue Suit',          'Two-piece slim fit suit in premium wool blend. Includes jacket and matching trousers.',               349.99, 'https://images.unsplash.com/photo-1493568369-60ddf72be1cb?w=500&q=80', 'Suits',   25),
('Performance Leggings',    'High-waist sports leggings with moisture-wicking fabric and phone pocket. 4-way stretch.',             49.99, 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500&q=80', 'Sportswear', 85),
('Running Shorts',          'Lightweight 2-in-1 running shorts with built-in liner and back zip pocket.',                          39.99, 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=500&q=80', 'Sportswear', 95),
('Sports Bra',              'Medium-impact sports bra with racerback design and removable padding. Quick-dry fabric.',              34.99, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80', 'Sportswear', 110);
