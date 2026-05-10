# MyClothes.com

Ứng dụng mua sắm thời trang trực tuyến, được thiết kế theo kiến trúc **stateless** để triển khai và mở rộng ngang (horizontal scaling) trên AWS.

---

## Tính năng

- Danh sách sản phẩm với bộ lọc theo danh mục và tìm kiếm
- Giỏ hàng — lưu trên Redis, không mất khi reload hoặc đổi server
- Đăng ký / Đăng nhập tài khoản
- Quản lý thông tin cá nhân và địa chỉ giao hàng
- Session lưu trên Redis — app hoàn toàn stateless, scale ngang được
- Health check endpoint `/health` tương thích ALB / ECS

---

## Tech Stack

| Layer | Local (dev) | AWS (production) |
|---|---|---|
| App | Node.js + Express | EC2 Auto Scaling / ECS Fargate |
| Session & Cart | Redis (container) | ElastiCache Redis |
| Database | MySQL (container) | RDS MySQL |
| Load Balancer | — | Application Load Balancer |

---

## Cấu trúc dự án

```
my-clothes/
├── src/
│   ├── app.js                 # Entry point, Express + Redis session
│   ├── config/
│   │   ├── database.js        # MySQL connection pool
│   │   └── redis.js           # Redis client
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/register|login|logout
│   │   ├── products.js        # GET  /api/products
│   │   ├── cart.js            # GET/POST/PUT/DELETE /api/cart
│   │   └── user.js            # GET/PUT /api/user/profile|addresses
│   └── middleware/
│       └── requireAuth.js
├── public/                    # Frontend SPA (HTML + CSS + Vanilla JS)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── sql/
│   └── init.sql               # Schema + 18 sản phẩm mẫu
├── .env.example               # Mẫu biến môi trường
├── Dockerfile
└── docker-compose.yml         # Môi trường dev local (app + mysql + redis)
```

---

## Chạy local với Docker

**Yêu cầu:** Docker và Docker Compose đã được cài đặt.

```bash
# 1. Clone dự án
git clone <your-repo-url>
cd my-clothes

# 2. Dùng file env development (đã có sẵn)
cp .env.example .env   # nếu chưa có .env

# 3. Build và khởi động toàn bộ stack
docker-compose up --build
```

Truy cập tại: **http://localhost:3000**

Dừng:
```bash
docker-compose down
```

Dừng và xóa toàn bộ data:
```bash
docker-compose down -v
```

---

## Biến môi trường

| Biến | Mô tả | Ví dụ |
|---|---|---|
| `NODE_ENV` | Môi trường chạy | `development` / `production` |
| `PORT` | Port lắng nghe | `3000` |
| `SESSION_SECRET` | Secret key cho session | chuỗi ngẫu nhiên >= 32 ký tự |
| `DB_HOST` | MySQL host | RDS endpoint hoặc `mysql` (local) |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `admin` |
| `DB_PASSWORD` | MySQL password | — |
| `DB_NAME` | Tên database | `myclothes` |
| `REDIS_URL` | Redis connection URL | ElastiCache endpoint hoặc `redis://redis:6379` (local) |

---

## Triển khai trên AWS

### Kiến trúc

```
Internet
    │
    ▼
[Application Load Balancer]
    │
    ├── EC2 / ECS instance (app) ──┐
    ├── EC2 / ECS instance (app) ──┼──► ElastiCache Redis
    └── EC2 / ECS instance (app) ──┘
         Auto Scaling Group         └──► RDS MySQL (Multi-AZ)
```

### Các bước triển khai

**1. Tạo RDS MySQL**
```
AWS Console → RDS → Create database
  Engine: MySQL 8.0
  DB identifier: myclothes-db
  Public access: No
```
Sau khi tạo, chạy schema:
```bash
mysql -h <rds-endpoint> -u admin -p myclothes < sql/init.sql
```

**2. Tạo ElastiCache Redis**
```
AWS Console → ElastiCache → Redis OSS → Create
  Node type: cache.t3.micro
  Cluster mode: Disabled
```

**3. Cấu hình Security Groups**
```
SG app   → outbound 3306 tới SG của RDS
SG app   → outbound 6379 tới SG của ElastiCache
SG RDS   → inbound  3306 từ SG của app
SG Redis → inbound  6379 từ SG của app
```

**4. Deploy app (EC2)**
```bash
# Chỉ chạy app container, trỏ tới RDS và ElastiCache
docker build -t myclothes-app .
docker run -d \
  --env-file .env \
  -p 3000:3000 \
  myclothes-app
```

File `.env` trên EC2:
```env
NODE_ENV=production
DB_HOST=myclothes-db.xxxx.us-east-1.rds.amazonaws.com
REDIS_URL=redis://myclothes.xxxx.cache.amazonaws.com:6379
SESSION_SECRET=<random-32-chars>
```

**5. Tạo Application Load Balancer**
```
Target Group:
  Health check path: /health
  Port: 3000
→ Đăng ký các EC2 instance vào target group
```

### Lý do thiết kế stateless

- **Session và Cart lưu trên Redis** → nhiều EC2 instance dùng chung, user không mất dữ liệu khi ALB route sang instance khác
- **App không giữ state nào trong bộ nhớ** → Auto Scaling Group có thể thêm/xóa instance tự do
- **Health check `/health`** → ALB tự động loại instance bị lỗi ra khỏi pool

---

## API Reference

### Auth
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/logout` | Đăng xuất |
| GET | `/api/auth/me` | Lấy user hiện tại |

### Products
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/products` | Danh sách sản phẩm (`?category=X&search=Y`) |
| GET | `/api/products/categories` | Danh sách danh mục |
| GET | `/api/products/:id` | Chi tiết sản phẩm |

### Cart
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/cart` | Xem giỏ hàng |
| POST | `/api/cart/add` | Thêm sản phẩm |
| PUT | `/api/cart/update` | Cập nhật số lượng |
| DELETE | `/api/cart/remove/:id` | Xóa sản phẩm |
| DELETE | `/api/cart/clear` | Xóa toàn bộ giỏ |

### User (yêu cầu đăng nhập)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/user/profile` | Xem thông tin cá nhân |
| PUT | `/api/user/profile` | Cập nhật thông tin |
| GET | `/api/user/addresses` | Danh sách địa chỉ |
| POST | `/api/user/addresses` | Thêm địa chỉ |
| PUT | `/api/user/addresses/:id` | Sửa địa chỉ |
| DELETE | `/api/user/addresses/:id` | Xóa địa chỉ |
