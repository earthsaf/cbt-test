```mermaid
erDiagram
  USER {
    int id PK
    string username
    string password_hash
    string role
    string telegram_id
    int class_id FK
  }
  CLASS {
    int id PK
    string name
  }
  EXAM {
    int id PK
    string title
    int class_id FK
    int created_by FK
    datetime start_time
    int duration_minutes
    string status
  }
  QUESTION {
    int id PK
    int exam_id FK
    string type
    string text
    string options
    string answer
    string status
    int version
  }
  ANSWER {
    int id PK
    int user_id FK
    int exam_id FK
    int question_id FK
    string answer
    datetime timestamp
    bool flagged
  }
  SESSION {
    int id PK
    int user_id FK
    int exam_id FK
    datetime start_time
    datetime end_time
    string status
  }
  LOG {
    int id PK
    int user_id FK
    string action
    datetime timestamp
    string details
  }
  PROCTORING_EVENT {
    int id PK
    int session_id FK
    string event_type
    datetime timestamp
    string data
  }
  USER ||--o{ ANSWER : ""
  USER ||--o{ SESSION : ""
  USER }o--o{ CLASS : ""
  CLASS ||--o{ EXAM : ""
  EXAM ||--o{ QUESTION : ""
  EXAM ||--o{ SESSION : ""
  QUESTION ||--o{ ANSWER : ""
  SESSION ||--o{ PROCTORING_EVENT : ""
  USER ||--o{ LOG : ""
``` 