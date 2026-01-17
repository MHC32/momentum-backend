# Momentum Backend Testing Infrastructure

This directory contains the complete testing infrastructure for the Momentum backend application.

## Structure

```
tests/
├── setup.js                 # Global test setup with MongoDB Memory Server
├── helpers/
│   ├── testDb.js           # Database helper functions for test data creation
│   └── fixtures.js         # Test fixtures and mock data
├── unit/                    # Unit tests
│   └── infrastructure.test.js
└── integration/             # Integration tests (API endpoint tests)
```

## Test Helpers

### Database Helpers (`testDb.js`)

- `createTestUser(overrides)` - Create test users
- `createTestProject(userId, overrides)` - Create test projects
- `createTestTask(userId, projectId, overrides)` - Create test tasks
- `createTestGoal(userId, overrides)` - Create test goals

### Fixtures (`fixtures.js`)

- `generateAuthToken(userId)` - Generate JWT tokens for authenticated requests
- `validTaskPayload` - Valid task creation payload
- `validProjectPayload` - Valid project creation payload
- `validGoalPayload` - Valid goal creation payload
- `validBookProjectPayload` - Valid book project payload
- `validUserPayload` - Valid user registration payload
- `invalidPayloads` - Collection of invalid payloads for validation testing

## Running Tests

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Database

Tests use MongoDB Memory Server for isolated, fast database operations. The database is:
- Created before all tests start
- Cleared after each test
- Destroyed after all tests complete

## Environment Variables

The following environment variables are set automatically for tests:
- `JWT_SECRET`: 'test-secret'
- `JWT_EXPIRE`: '30d'

## Coverage Thresholds

Current coverage thresholds (set in `jest.config.js`):
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

## Writing Tests

### Unit Test Example

```javascript
const { createTestUser } = require('../helpers/testDb');

describe('User Model', () => {
  test('should create a user', async () => {
    const user = await createTestUser();
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const app = require('../../src/app');
const { createTestUser, generateAuthToken } = require('../helpers/testDb');

describe('POST /api/tasks', () => {
  test('should create a task', async () => {
    const user = await createTestUser();
    const token = generateAuthToken(user._id);

    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Task', type: 'dev' });

    expect(response.status).toBe(201);
    expect(response.body.task.title).toBe('New Task');
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Database is automatically cleaned between tests
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
5. **Mock External Services**: Use mocks for external APIs and services
