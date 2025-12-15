# Suman Jwellaries Backend

Node.js Express backend for an e‑commerce app. It provides product, category, subcategory, file upload, and mail endpoints. MongoDB is used via Mongoose.

## Tech Stack
- Node.js, Express
- MongoDB, Mongoose
- Multer for uploads
- Nodemailer for email
- Helmet, CORS, Morgan

## Getting Started
1. Install dependencies: `npm install`
2. Configure environment: create `.env` using the variables below
3. Run dev server: `npm run dev`
4. Health: `GET /health` → `{"ok":true}`

## Environment Variables
```
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
UPLOAD_DIR=uploads
MONGODB_URI=mongodb://localhost:27017/sumanjwellaries
MAIL_HOST=
MAIL_PORT=
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM=no-reply@example.com
MAIL_TO=
```

## Directory Structure
```
src/
  app.js
  server.js
  config/
    env.js
    db.js
    mailer.js
  middlewares/
    error.js
    upload.js
  models/
    category.model.js
    subcategory.model.js
    product.model.js
    order.model.js
    payment.model.js
    promocode.model.js
  controllers/
    productController.js
    categoryController.js
    subCategoryController.js
    filesController.js
    mail.controller.js
  routes/
    product.routes.js
    category.routes.js
    subcategory.routes.js
    files.routes.js
    mail.routes.js
    index.js
```

## API Overview

Base URL: `http://localhost:3000`

### Health
- `GET /health`

### Files
- `POST /api/files/image` (multipart `image`) → `{ ok, path }`
- `POST /api/files/images` (multipart `images[]`) → `{ ok, paths }`
- Static serving: `GET /uploads/<filename>`

### Categories
- `GET /api/categories` (query: `page`, `limit`, `q`, `isActive`)
- `GET /api/categories/:id`
- `POST /api/categories`
  - body: `{ name, description?, isActive? }`
- `PUT /api/categories/:id`
  - body: `{ name?, description?, isActive?, slug? }`
- `DELETE /api/categories/:id`

Notes: `name` required; slug is derived from name and unique.

### Subcategories
- `GET /api/subcategories` (query: `page`, `limit`, `q`, `isActive`, `categoryId`)
- `GET /api/subcategories/:id`
- `POST /api/subcategories`
  - body: `{ name, categoryId, description?, isActive? }`
- `PUT /api/subcategories/:id`
  - body: `{ name?, categoryId?, description?, isActive?, slug? }`
- `DELETE /api/subcategories/:id`

Notes: `categoryId` required and must exist.

### Products
- `GET /api/products` (query: `page`, `limit`, `q`)
- `GET /api/products/:id`
- `POST /api/products`
  - body: `{ name, price, description?, categoryId?, subCategoryId?, sku?, stock?, attributes?, image?, images? }`
- `PUT /api/products/:id`
  - body: same as POST (all optional)
- `DELETE /api/products/:id`

Notes:
- `price` must be a non‑negative number.
- If both `categoryId` and `subCategoryId` provided, they must match; otherwise category is inferred from subcategory.

### Mail
- `POST /api/mail/send` → `{ to?, subject, text?, html? }`
- `POST /api/mail/contact` → `{ name, email, message }`

## Error Responses
- `400` invalid input (e.g., invalid ObjectId, missing required fields)
- `404` resource not found
- `409` conflict (duplicate key)
- `503` database not connected
- `500` internal server error

## Notes for Frontend Developers
- Upload an image first and use the returned `path` in product creation (`image` or `images`).
- Pagination defaults: `page=1`, `limit=20`.
- Products, categories, subcategories return `data` arrays with `page`, `limit`, `total` when listing.
- All write endpoints return `{ ok: true, data }` or `204` on delete.

