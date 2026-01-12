# Tidywaro API Documentation

This document describes the REST API endpoints provided by the Tidywaro BFF (Backend-for-Frontend).

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: TBD

## Authentication

All protected endpoints require a valid JWT token from Supabase Auth in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

## Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* optional additional info */ }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input or missing required fields |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `PAYLOAD_TOO_LARGE` | 413 | File exceeds size limit |
| `UNPROCESSABLE_ENTITY` | 422 | Valid request but cannot be processed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `AI_ANALYSIS_ERROR` | 500 | AI service error |
| `STORAGE_ERROR` | 500 | Storage operation failed |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "uptime": 3600.5
}
```

---

### User

#### `GET /me`

Get the authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

### Wardrobe Items

#### `GET /wardrobe/items`

List all wardrobe items for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "category": "tops",
    "subcategory": "t-shirt",
    "color": "navy blue",
    "style": "casual",
    "pattern": "solid",
    "material": "cotton",
    "season": ["spring", "summer", "fall"],
    "occasions": ["everyday", "casual"],
    "brand": null,
    "ai_description": "A classic navy blue cotton t-shirt with a crew neck.",
    "ai_confidence": 0.92,
    "image_url": "https://...",
    "processed_image_url": "https://...",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
]
```

---

#### `POST /wardrobe/items`

Upload a new wardrobe item. AI automatically analyzes the image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `image` (file, required): Image file (JPEG, PNG, WebP, HEIC). Max 10MB.

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category": "tops",
  "subcategory": "t-shirt",
  "color": "navy blue",
  "style": "casual",
  "pattern": "solid",
  "material": "cotton",
  "season": ["spring", "summer", "fall"],
  "occasions": ["everyday"],
  "brand": null,
  "ai_description": "A classic navy blue cotton t-shirt.",
  "ai_confidence": 0.92,
  "image_url": "https://...",
  "processed_image_url": "https://...",
  "created_at": "2026-01-03T12:00:00.000Z"
}
```

**Errors:**
- `400` - No image file provided
- `400` - Invalid file type
- `413` - File too large (max 10MB)
- `429` - AI rate limit exceeded

---

#### `POST /wardrobe/items/bulk`

Upload multiple wardrobe items at once. AI analyzes each image.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `images` (files, required): Array of image files (JPEG, PNG, WebP, HEIC). Max 10 files, 10MB each.

**Response:** `201 Created`
```json
{
  "message": "Uploaded 3 of 4 items",
  "successful": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "category": "tops",
      "subcategory": "t-shirt",
      "color": "navy blue",
      "style": "casual",
      "pattern": "solid",
      "material": "cotton",
      "season": ["spring", "summer"],
      "occasions": ["everyday"],
      "ai_description": "A classic navy blue cotton t-shirt.",
      "ai_confidence": 0.92,
      "image_url": "https://...",
      "processed_image_url": "https://...",
      "created_at": "2026-01-03T12:00:00.000Z"
    }
    // ... more items
  ],
  "failed": [
    {
      "filename": "corrupted.jpg",
      "error": "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC"
    }
  ],
  "summary": {
    "total": 4,
    "successCount": 3,
    "failCount": 1
  }
}
```

**Notes:**
- Each file is processed sequentially with AI analysis
- A 500ms delay is added between files to avoid rate limiting
- Partial failures don't fail the entire request
- Results include both successful and failed items
- Request timeout should be set to ~30 seconds per image

**Errors:**
- `400` - No image files provided
- `400` - Too many files (max 10)
- `401` - Unauthorized
- `500` - All files failed to process

---

#### `GET /wardrobe/items/:id`

Get a single wardrobe item by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "category": "tops",
  "subcategory": "t-shirt",
  "color": "navy blue",
  "style": "casual",
  "pattern": "solid",
  "material": "cotton",
  "season": ["spring", "summer", "fall"],
  "occasions": ["everyday"],
  "brand": null,
  "ai_description": "A classic navy blue cotton t-shirt.",
  "ai_confidence": 0.92,
  "image_url": "https://...",
  "processed_image_url": "https://...",
  "created_at": "2026-01-03T12:00:00.000Z"
}
```

**Errors:**
- `404` - Item not found

---

#### `PUT /wardrobe/items/:id`

Update a wardrobe item.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "category": "string (optional)",
  "subcategory": "string (optional)",
  "color": "string (optional)",
  "style": "string (optional)",
  "pattern": "string (optional)",
  "material": "string (optional)",
  "season": ["string array (optional)"],
  "occasions": ["string array (optional)"],
  "brand": "string (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "category": "tops",
  "subcategory": "polo shirt",
  /* ... updated fields ... */
}
```

**Errors:**
- `400` - No valid fields to update
- `400` - Invalid field type
- `404` - Item not found

---

#### `DELETE /wardrobe/items/:id`

Delete a wardrobe item.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `204 No Content`

**Errors:**
- `404` - Item not found

---

#### `POST /wardrobe/items/:id/reanalyze`

Re-run AI analysis on an existing item.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "category": "suits",
  "subcategory": "blazer",
  "color": "charcoal gray",
  "ai_confidence": 0.95,
  /* ... updated AI fields ... */
}
```

**Errors:**
- `404` - Item not found
- `429` - AI rate limit exceeded
- `500` - Failed to fetch image from storage

---

### Weekly Plans

#### `GET /weekly-plans/current`

Get the current weekly outfit plan.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "start_date": "2026-01-06",
  "end_date": "2026-01-12",
  "daily_outfits": [
    {
      "date": "2026-01-06",
      "items": ["item-uuid-1", "item-uuid-2"],
      "notes": "Business casual for office"
    }
  ],
  "created_at": "2026-01-03T12:00:00.000Z"
}
```

---

#### `POST /weekly-plans/generate`

Generate a new weekly outfit plan using AI.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "startDate": "2026-01-06"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "start_date": "2026-01-06",
  "daily_outfits": [/* ... */],
  "created_at": "2026-01-03T12:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid start date
- `400` - Not enough wardrobe items

---

## Rate Limiting

The AI analysis endpoints are rate-limited by the Google Gemini API. If you exceed the rate limit:

1. The API will automatically retry with exponential backoff (up to 3 retries)
2. If all retries fail, you'll receive a `429` error with `Retry-After` header
3. Wait the suggested time before retrying

## File Upload Limits

- **Maximum file size**: 10MB
- **Allowed types**: JPEG, PNG, WebP, HEIC
- **Recommended**: Square images work best for AI analysis

---

## Subscription Endpoints

### `GET /subscription`

Get the authenticated user's subscription information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tier": "free",
  "status": "active",
  "itemLimit": 20,
  "itemsUsed": 5,
  "canUpgrade": true
}
```

---

### `GET /subscription/check-limit`

Check if user can add more wardrobe items based on their subscription.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "allowed": true,
  "itemsUsed": 5,
  "itemLimit": 20,
  "tier": "free"
}
```

---

### `POST /subscription/checkout`

Create a Stripe checkout session for upgrading to Premium.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "https://app.tidywaro.com/success",
  "cancelUrl": "https://app.tidywaro.com/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

---

### `POST /subscription/billing-portal`

Create a Stripe billing portal session for managing subscription.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

### `POST /subscription/cancel`

Cancel the user's subscription at period end.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Subscription will cancel at period end",
  "cancelAt": "2026-02-05T00:00:00.000Z"
}
```

---

### `POST /subscription/resume`

Resume a canceled subscription before it expires.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Subscription resumed",
  "status": "active"
}
```

---

## Try-On Endpoints (Experimental)

### `GET /tryon/status`

Check if the virtual try-on service is available.

**Response:**
```json
{
  "available": true,
  "message": "Try-on service is operational"
}
```

---

### `POST /tryon/generate`

Generate a virtual try-on image with a single garment.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "itemId": "wardrobe-item-uuid",
  "modelId": "model-1"
}
```

**Response:**
```json
{
  "imageUrl": "https://...",
  "cached": false
}
```

**Errors:**
- `404` - Item not found
- `503` - Try-on service unavailable

---

### `POST /tryon/outfit`

Generate a virtual try-on image with multiple garments (outfit).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "itemIds": ["top-uuid", "bottom-uuid"],
  "modelId": "model-1"
}
```

**Response:**
```json
{
  "imageUrl": "https://...",
  "cached": false
}
```

**Errors:**
- `400` - Invalid item IDs
- `404` - One or more items not found
- `503` - Try-on service unavailable

---

## Environment Variables

The BFF requires the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon/public key |
| `PORT` | No | Server port (default: 3000) |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key for AI analysis |
| `HUGGINGFACE_API_KEY` | No | HuggingFace API key for background removal |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for subscriptions |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |

> ⚠️ **Important**: Without a valid `GEMINI_API_KEY`, all clothing analysis will fail and items will be categorized as "uncategorized".
