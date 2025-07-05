# RSSFeeder API Documentation

## Overview

The RSSFeeder API provides RESTful endpoints for managing RSS/Atom feeds, user subscriptions, and content organization. All API responses return JSON and follow consistent patterns for success and error handling.

**Base URL**: `http://localhost:3000/api/v1`

## Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-07-05T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "preferences": {
        "dark_mode": false,
        "text_size": 2,
        "theme_color": "orange"
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/refresh
Refresh JWT token.

**Headers:**
```
Authorization: Bearer <current_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## User Management

### GET /users/profile
Get current user profile and preferences.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "avatar_url": "https://example.com/avatar.jpg",
    "preferences": {
      "dark_mode": false,
      "text_size": 2,
      "theme_color": "orange",
      "push_notifications": true,
      "email_notifications": true,
      "new_feed_alerts": false,
      "data_collection": true
    },
    "created_at": "2025-07-05T10:30:00Z",
    "updated_at": "2025-07-05T10:30:00Z"
  }
}
```

### PUT /users/profile
Update user profile and preferences.

**Request Body:**
```json
{
  "name": "John Smith",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "preferences": {
    "dark_mode": true,
    "text_size": 3,
    "theme_color": "blue"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Smith",
    "email": "john@example.com",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "preferences": {
      "dark_mode": true,
      "text_size": 3,
      "theme_color": "blue",
      "push_notifications": true,
      "email_notifications": true,
      "new_feed_alerts": false,
      "data_collection": true
    },
    "updated_at": "2025-07-05T11:45:00Z"
  }
}
```

## Feed Management

### GET /feeds
Get all available feeds (for discovery).

**Query Parameters:**
- `limit` (optional): Number of feeds to return (default: 50)
- `offset` (optional): Number of feeds to skip (default: 0)
- `search` (optional): Search feeds by name or URL

**Response (200):**
```json
{
  "success": true,
  "data": {
    "feeds": [
      {
        "id": 1,
        "name": "TechCrunch",
        "url": "https://techcrunch.com/feed/",
        "status": "active",
        "fetch_interval": 3600,
        "last_fetched_at": "2025-07-05T10:00:00Z",
        "subscriber_count": 150
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### POST /feeds
Add a new feed to the system.

**Request Body:**
```json
{
  "url": "https://example.com/feed.xml",
  "name": "Example Blog"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Example Blog",
    "url": "https://example.com/feed.xml",
    "status": "active",
    "fetch_interval": 3600,
    "last_fetched_at": null,
    "created_at": "2025-07-05T11:00:00Z"
  }
}
```

### GET /feeds/:id
Get detailed information about a specific feed.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "TechCrunch",
    "url": "https://techcrunch.com/feed/",
    "status": "active",
    "fetch_interval": 3600,
    "last_fetched_at": "2025-07-05T10:00:00Z",
    "created_at": "2025-07-05T09:00:00Z",
    "updated_at": "2025-07-05T10:00:00Z",
    "stats": {
      "total_items": 1250,
      "items_last_30_days": 45,
      "subscriber_count": 150
    }
  }
}
```

### PUT /feeds/:id
Update feed information (admin only).

**Request Body:**
```json
{
  "name": "TechCrunch - Updated",
  "status": "active",
  "fetch_interval": 1800
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "TechCrunch - Updated",
    "url": "https://techcrunch.com/feed/",
    "status": "active",
    "fetch_interval": 1800,
    "updated_at": "2025-07-05T11:30:00Z"
  }
}
```

## User Subscriptions

### GET /subscriptions
Get user's feed subscriptions.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": 1,
        "feed": {
          "id": 1,
          "name": "TechCrunch",
          "url": "https://techcrunch.com/feed/",
          "status": "active"
        },
        "preferences": {
          "auto_refresh": true,
          "custom_interval": null,
          "show_read_items": false
        },
        "stats": {
          "unread_count": 15,
          "total_items": 1250
        },
        "created_at": "2025-07-05T09:00:00Z"
      }
    ]
  }
}
```

### POST /subscriptions
Subscribe to a feed.

**Request Body:**
```json
{
  "feed_id": 1,
  "preferences": {
    "auto_refresh": true,
    "show_read_items": false
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "feed_id": 1,
    "preferences": {
      "auto_refresh": true,
      "custom_interval": null,
      "show_read_items": false
    },
    "created_at": "2025-07-05T11:00:00Z"
  }
}
```

### PUT /subscriptions/:id
Update subscription preferences.

**Request Body:**
```json
{
  "preferences": {
    "auto_refresh": false,
    "custom_interval": 7200,
    "show_read_items": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "preferences": {
      "auto_refresh": false,
      "custom_interval": 7200,
      "show_read_items": true
    },
    "updated_at": "2025-07-05T11:30:00Z"
  }
}
```

### DELETE /subscriptions/:id
Unsubscribe from a feed.

**Response (204):**
```json
{
  "success": true,
  "message": "Successfully unsubscribed"
}
```

## Feed Items

### GET /items
Get feed items for the user's subscriptions.

**Query Parameters:**
- `limit` (optional): Number of items to return (default: 20)
- `offset` (optional): Number of items to skip (default: 0)
- `feed_id` (optional): Filter by specific feed
- `category_id` (optional): Filter by category
- `unread_only` (optional): Show only unread items (default: false)
- `bookmarked_only` (optional): Show only bookmarked items (default: false)
- `search` (optional): Search items by title or content
- `sort` (optional): Sort order (published_desc, published_asc, created_desc)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "feed": {
          "id": 1,
          "name": "TechCrunch",
          "url": "https://techcrunch.com/feed/"
        },
        "title": "Latest Tech News",
        "link": "https://techcrunch.com/article/123",
        "summary": "Brief summary of the article...",
        "author": "John Writer",
        "image_url": "https://example.com/image.jpg",
        "published_at": "2025-07-05T10:00:00Z",
        "categories": [
          {
            "id": 1,
            "name": "Technology"
          }
        ],
        "user_state": {
          "is_read": false,
          "is_bookmarked": false,
          "read_at": null
        }
      }
    ],
    "pagination": {
      "total": 500,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### GET /items/:id
Get detailed information about a specific item.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "feed": {
      "id": 1,
      "name": "TechCrunch",
      "url": "https://techcrunch.com/feed/"
    },
    "guid": "https://techcrunch.com/article/123",
    "title": "Latest Tech News",
    "link": "https://techcrunch.com/article/123",
    "summary": "Brief summary of the article...",
    "content": "Full article content...",
    "author": "John Writer",
    "image_url": "https://example.com/image.jpg",
    "published_at": "2025-07-05T10:00:00Z",
    "fetched_at": "2025-07-05T10:05:00Z",
    "categories": [
      {
        "id": 1,
        "name": "Technology"
      }
    ],
    "user_state": {
      "is_read": false,
      "is_bookmarked": false,
      "read_at": null
    }
  }
}
```

### POST /items/:id/read
Mark an item as read.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item_id": 1,
    "read_at": "2025-07-05T11:00:00Z"
  }
}
```

### DELETE /items/:id/read
Mark an item as unread.

**Response (204):**
```json
{
  "success": true,
  "message": "Item marked as unread"
}
```

### POST /items/:id/bookmark
Bookmark an item.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item_id": 1,
    "bookmarked_at": "2025-07-05T11:00:00Z"
  }
}
```

### DELETE /items/:id/bookmark
Remove bookmark from an item.

**Response (204):**
```json
{
  "success": true,
  "message": "Bookmark removed"
}
```

### POST /items/bulk-read
Mark multiple items as read.

**Request Body:**
```json
{
  "item_ids": [1, 2, 3, 4, 5]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "marked_read": 5,
    "read_at": "2025-07-05T11:00:00Z"
  }
}
```

## Categories

### GET /categories
Get all categories.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Technology",
        "item_count": 150
      },
      {
        "id": 2,
        "name": "Science",
        "item_count": 89
      }
    ]
  }
}
```

### POST /categories
Create a new category.

**Request Body:**
```json
{
  "name": "Artificial Intelligence"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Artificial Intelligence",
    "item_count": 0
  }
}
```

### PUT /categories/:id
Update a category.

**Request Body:**
```json
{
  "name": "AI & Machine Learning"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "AI & Machine Learning",
    "item_count": 0
  }
}
```

### DELETE /categories/:id
Delete a category.

**Response (204):**
```json
{
  "success": true,
  "message": "Category deleted"
}
```

### POST /items/:id/categories
Add categories to an item.

**Request Body:**
```json
{
  "category_ids": [1, 2]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "item_id": 1,
    "categories": [
      {
        "id": 1,
        "name": "Technology"
      },
      {
        "id": 2,
        "name": "Science"
      }
    ]
  }
}
```

### DELETE /items/:id/categories/:category_id
Remove a category from an item.

**Response (204):**
```json
{
  "success": true,
  "message": "Category removed from item"
}
```

## Search

### GET /search
Search across items, feeds, and categories.

**Query Parameters:**
- `q` (required): Search query
- `type` (optional): Search type (items, feeds, categories, all)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Offset for pagination

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": {
      "items": [
        {
          "id": 1,
          "title": "Latest Tech News",
          "summary": "Brief summary...",
          "feed_name": "TechCrunch",
          "published_at": "2025-07-05T10:00:00Z",
          "relevance_score": 0.95
        }
      ],
      "feeds": [
        {
          "id": 1,
          "name": "TechCrunch",
          "url": "https://techcrunch.com/feed/",
          "relevance_score": 0.87
        }
      ],
      "categories": [
        {
          "id": 1,
          "name": "Technology",
          "item_count": 150,
          "relevance_score": 0.92
        }
      ]
    },
    "pagination": {
      "total": 25,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

## Admin/System Operations

### POST /admin/feeds/poll
Manually trigger feed polling (admin only).

**Request Body:**
```json
{
  "feed_id": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "feed_id": 1,
    "new_items": 3,
    "poll_time": "2025-07-05T11:00:00Z"
  }
}
```

### GET /admin/logs/polls
Get polling logs (admin only).

**Query Parameters:**
- `feed_id` (optional): Filter by feed
- `success` (optional): Filter by success status
- `limit` (optional): Number of logs (default: 50)
- `offset` (optional): Offset for pagination

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "feed_id": 1,
        "feed_name": "TechCrunch",
        "run_at": "2025-07-05T10:00:00Z",
        "success": true,
        "new_items": 3,
        "error_message": null
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### GET /admin/stats
Get system statistics (admin only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "active_last_30_days": 120
    },
    "feeds": {
      "total": 50,
      "active": 48,
      "paused": 2
    },
    "items": {
      "total": 15000,
      "added_last_24_hours": 200
    },
    "subscriptions": {
      "total": 300,
      "average_per_user": 2.5
    }
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid request parameters
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource already exists
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **General API**: 100 requests per minute
- **Feed polling**: 1 request per minute
- **Bulk operations**: 10 requests per minute

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625500800
```

## Webhooks

### POST /webhooks/feed-updated
Receive notifications when feeds are updated (for integrations).

**Request Body:**
```json
{
  "event": "feed.updated",
  "data": {
    "feed_id": 1,
    "new_items": 3,
    "timestamp": "2025-07-05T11:00:00Z"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const RSSFeederAPI = require('@rssfeeder/api-client');

const client = new RSSFeederAPI({
  baseURL: 'http://localhost:3000/api/v1',
  token: 'your-jwt-token'
});

// Get user's items
const items = await client.items.list({
  unread_only: true,
  limit: 10
});

// Mark item as read
await client.items.markRead(itemId);

// Subscribe to feed
await client.subscriptions.create({
  feed_id: 1,
  preferences: {
    auto_refresh: true
  }
});
```

### Python

```python
from rssfeeder_client import RSSFeederClient

client = RSSFeederClient(
    base_url='http://localhost:3000/api/v1',
    token='your-jwt-token'
)

# Get user's items
items = client.items.list(unread_only=True, limit=10)

# Mark item as read
client.items.mark_read(item_id)

# Subscribe to feed
client.subscriptions.create(
    feed_id=1,
    preferences={'auto_refresh': True}
)
```
