# NeyNegar Backend

A GraphQL API server for the NeyNegar application built with Node.js, Express, Apollo Server, and MongoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/neynegar
```

3. Make sure MongoDB is running on your system

## Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The GraphQL playground will be available at: http://localhost:4000/graphql

## API Examples

### Queries

Fetch all todos:
```graphql
query {
  todos {
    id
    title
    completed
    createdAt
    updatedAt
  }
}
```

Fetch a single todo:
```graphql
query {
  todo(id: "todo-id") {
    id
    title
    completed
    createdAt
    updatedAt
  }
}
```

### Mutations

Create a todo:
```graphql
mutation {
  createTodo(title: "New Todo") {
    id
    title
    completed
    createdAt
  }
}
```

Update a todo:
```graphql
mutation {
  updateTodo(id: "todo-id", title: "Updated Title", completed: true) {
    id
    title
    completed
    updatedAt
  }
}
```

Delete a todo:
```graphql
mutation {
  deleteTodo(id: "todo-id")
}
``` 