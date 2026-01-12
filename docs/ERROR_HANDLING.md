# Error Handling Guide

This document describes the error handling architecture in Tidywaro.

## Overview

Tidywaro implements a comprehensive error handling system across both the BFF (backend) and mobile app:

- **Custom Error Classes**: Typed errors with HTTP status codes and error codes
- **Global Error Middleware**: Catches all errors and returns consistent JSON responses
- **React Error Boundary**: Prevents crashes from propagating in the mobile app
- **Retry Logic**: Automatic retry with exponential backoff for transient failures

---

## Backend (BFF) Error Handling

### Custom Error Classes

All custom errors extend the base `AppError` class:

```typescript
// apps/bff/src/utils/errors.ts

class AppError extends Error {
    statusCode: number;    // HTTP status code
    code: string;          // Machine-readable error code
    isOperational: boolean; // true = expected error, false = bug
    details?: object;      // Additional context
}
```

### Available Error Classes

| Class | Status | Code | Use Case |
|-------|--------|------|----------|
| `BadRequestError` | 400 | `BAD_REQUEST` | Invalid input |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Missing/invalid auth |
| `ForbiddenError` | 403 | `FORBIDDEN` | Insufficient permissions |
| `NotFoundError` | 404 | `NOT_FOUND` | Resource doesn't exist |
| `ConflictError` | 409 | `CONFLICT` | Duplicate resource |
| `PayloadTooLargeError` | 413 | `PAYLOAD_TOO_LARGE` | File too big |
| `UnprocessableEntityError` | 422 | `UNPROCESSABLE_ENTITY` | Can't process |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| `InternalError` | 500 | `INTERNAL_ERROR` | Unexpected error |
| `AIAnalysisError` | 500 | `AI_ANALYSIS_ERROR` | AI service failed |
| `AIRateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` | AI rate limited |
| `StorageError` | 500 | `STORAGE_ERROR` | File storage failed |
| `DatabaseError` | 500 | `DATABASE_ERROR` | DB operation failed |
| `ValidationError` | 400 | `BAD_REQUEST` | Field validation failed |

### Using Errors in Controllers

```typescript
// Throw errors instead of returning res.status()
import { BadRequestError, NotFoundError } from "../utils/errors";

static async getItem(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        
        if (!id) {
            throw new BadRequestError("Item ID is required");
        }
        
        const item = await db.findItem(id);
        if (!item) {
            throw new NotFoundError("Item");
        }
        
        res.json(item);
    } catch (error) {
        next(error); // Pass to error middleware
    }
}
```

### Global Error Middleware

The error middleware (`errorHandler.middleware.ts`) catches all errors:

```typescript
// Registered last in app setup
app.use(notFoundHandler);  // Catch 404s
app.use(errorHandler);     // Handle all errors
```

Response format:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Item not found",
    "details": {},
    "stack": "..." // Only in development
  }
}
```

### Supabase Error Conversion

Use `fromSupabaseError()` to convert Supabase errors:

```typescript
import { fromSupabaseError } from "../utils/errors";

const { data, error } = await supabase.from("items").select("*");
if (error) {
    throw fromSupabaseError(error);
}
```

Conversion mapping:
| Supabase Code | Converted Error |
|---------------|-----------------|
| `PGRST116` | `NotFoundError` |
| `23505` | `ConflictError` (unique violation) |
| `23503` | `BadRequestError` (foreign key) |
| `23502` | `BadRequestError` (not null) |
| `42501` | `ForbiddenError` (privilege) |
| `PGRST301` | `UnauthorizedError` (JWT) |

---

## AI Service Error Handling

The AI service has special error handling for rate limits:

### Retry Logic

```typescript
// Automatic retry with exponential backoff
const MAX_RETRIES = 3;

// If rate limited:
// Attempt 1: Wait 10s
// Attempt 2: Wait 20s  
// Attempt 3: Wait 40s
// Then: Throw AIRateLimitError
```

### Default Values

If AI analysis fails (non-rate-limit), default values are returned:

```typescript
{
    category: "uncategorized",
    subcategory: "unknown",
    color: "unknown",
    style: "casual",
    pattern: "solid",
    material: "unknown",
    season: ["spring", "summer", "fall", "winter"],
    occasions: ["everyday"],
    description: "Clothing item (AI analysis unavailable)",
    confidence: 0,
}
```

---

## Mobile App Error Handling

### Error Boundary

The `ErrorBoundary` component wraps the entire app:

```tsx
// App.tsx
<ErrorBoundary>
  <AuthProvider>
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  </AuthProvider>
</ErrorBoundary>
```

Features:
- Catches JavaScript errors in the component tree
- Displays user-friendly error UI
- Shows stack trace in development mode
- "Try Again" button to reset the error state
- Logs errors for debugging

### API Error Handling

The API service parses errors into user-friendly messages:

```typescript
// apps/mobile/src/services/api.ts

const getErrorMessage = (error: unknown, context: string): string => {
    if (axios.isAxiosError(error)) {
        switch (error.response?.status) {
            case 400: return `${context}: Invalid request`;
            case 401: return `${context}: Authentication failed`;
            case 404: return `${context}: Resource not found`;
            case 429: return `${context}: Too many requests`;
            case 500: return `${context}: Server error`;
            // ...
        }
    }
    return `${context}: An unexpected error occurred`;
};
```

### Screen-Level Error Handling

Each screen handles errors with user feedback:

```tsx
try {
    const result = await uploadWardrobeItem(image, token);
    Alert.alert('Success', 'Item uploaded!');
} catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    Alert.alert('Error', message);
}
```

---

## Logging

### Backend Logging

Winston logger with multiple transports:

```typescript
// Log levels: debug, info, warn, error
logger.info("Operation completed", { userId, itemId });
logger.error("Operation failed", { error: error.message });
```

Log files:
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs

### Mobile Logging

Development logger with history:

```typescript
import { logger, logApi, logAuth } from '../utils/logger';

logger.info('Operation completed', { data });
logApi.request('POST', '/wardrobe/items');
logAuth.signIn(true);
```

---

## Best Practices

### Do's

✅ Throw custom errors instead of returning `res.status()`
✅ Use `next(error)` in controllers to pass to middleware
✅ Log errors with context (userId, itemId, etc.)
✅ Show user-friendly messages on the frontend
✅ Use appropriate error types for different scenarios

### Don'ts

❌ Don't catch errors silently without logging
❌ Don't expose stack traces in production
❌ Don't return generic "Error" messages to users
❌ Don't forget to handle async errors with try/catch

---

## Troubleshooting

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| `UNAUTHORIZED` | Token expired | Re-authenticate |
| `NOT_FOUND` | Item deleted or wrong ID | Refresh the list |
| `RATE_LIMIT_EXCEEDED` | Too many AI requests | Wait and retry |
| `PAYLOAD_TOO_LARGE` | Image > 10MB | Compress image |
| `STORAGE_ERROR` | Supabase storage issue | Check bucket permissions |

### Debug Mode

In development, errors include:
- Full stack traces
- Request/response logs
- AI attempt counts
- Duration metrics
