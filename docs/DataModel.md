# Data Model

This document describes the entities, relationships, and cardinalities for the Feed Monitor App data model. It also includes a Mermaid ER diagram illustrating the schema visually.

## Entities

- **User**  
  Stores user profile and settings.
- **Feed**  
  Represents an RSS feed source (URL, name, status, schedule).
- **FeedItem**  
  Individual article/item fetched from a feed.
- **Category**  
  Tags or classifications for feed items.
- **ItemCategory**  
  Join table linking FeedItems to Categories (many-to-many).
- **UserFeedSubscription**  
  Join table representing which Users subscribe to which Feeds, with per-subscription preferences.
- **ReadState**  
  Tracks when a User marks a FeedItem as read.
- **Bookmark**  
  Tracks when a User bookmarks a FeedItem.
- **Nugget**  
  User-created actions on FeedItems (reply, reshare, comment, bookmark, etc.).
- **PollLog**  
  Audit logs for each feed polling operation (timestamp, success, new item count).

## Relationships & Cardinalities

- A **User** can subscribe to **many Feeds** (via **UserFeedSubscription**), and a **Feed** can have **many subscribing Users** (many-to-many).
- A **Feed** can produce **many FeedItems**; each **FeedItem** belongs to exactly one **Feed** (one-to-many).
- A **FeedItem** can have **zero or more Categories**; a **Category** can apply to **many FeedItems** (many-to-many via **ItemCategory**).
- A **User** can mark **many FeedItems** as read (via **ReadState**); each **ReadState** record links one **User** and one **FeedItem**.
- A **User** can bookmark **many FeedItems** (via **Bookmark**); each **Bookmark** record links one **User** and one **FeedItem**.
- A **User** can create **many Nuggets**; each **Nugget** belongs to one **User** and one **FeedItem** (one-to-many).
- A **Feed** can have **many PollLogs**; each **PollLog** belongs to one **Feed** (one-to-many).

## ER Diagram

```mermaid
erDiagram
    User {
        INTEGER id PK
        TEXT name
        TEXT email
    }
    Feed {
        INTEGER id PK
        TEXT name
        TEXT url
    }
    FeedItem {
        INTEGER id PK
        INTEGER feed_id FK
        TEXT guid
        TEXT title
    }
    Category {
        INTEGER id PK
        TEXT name
    }
    ItemCategory {
        INTEGER item_id FK
        INTEGER category_id FK
    }
    UserFeedSubscription {
        INTEGER id PK
        INTEGER user_id FK
        INTEGER feed_id FK
    }
    ReadState {
        INTEGER user_id FK
        INTEGER item_id FK
    }
    Bookmark {
        INTEGER user_id FK
        INTEGER item_id FK
    }
    Nugget {
        INTEGER id PK
        INTEGER user_id FK
        INTEGER item_id FK
    }
    PollLog {
        INTEGER id PK
        INTEGER feed_id FK
        BOOLEAN success
        INTEGER new_items
    }

    User ||--o{ UserFeedSubscription : subscribes
    Feed ||--o{ UserFeedSubscription : "is subscribed by"
    Feed ||--o{ FeedItem : produces
    FeedItem }o--|| Feed : "belongs to"
    FeedItem ||--o{ ItemCategory : categorized by
    Category ||--o{ ItemCategory : categorizes
    User ||--o{ ReadState : "marks read"
    FeedItem ||--o{ ReadState : "is read by"
    User ||--o{ Bookmark : bookmarks
    FeedItem ||--o{ Bookmark : "is bookmarked by"
    User ||--o{ Nugget : creates
    FeedItem ||--o{ Nugget : "has nuggets"
    Feed ||--o{ PollLog : logs
```
