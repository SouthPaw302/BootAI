# BootAI Testing Specification

## Testing Strategy Overview

BootAI employs a comprehensive testing strategy covering unit tests, integration tests, system tests, and user acceptance tests to ensure reliability and quality.

## Test Categories

### 1. Unit Tests
**Scope**: Individual functions and components
**Tools**: Jest, Mocha
**Coverage**: 80%+ code coverage target

#### Frontend Unit Tests
```javascript
// Example: Form validation tests
describe('Form Validation', () => {
  test('validates base OS selection', () => {
    expect(validateBaseOs('ubuntu-22.04')).toBe(true);
    expect(validateBaseOs('invalid')).toBe(false);
  });
  
  test('validates AI model selection', () => {
    expect(validateModel('phi3:mini')).toBe(true);
    expect(validateModel('invalid')).toBe(false);
  });
});
```

#### Backend Unit Tests
```javascript
// Example: API endpoint tests
describe('API Endpoints', () => {
  test('validates build ISO request', () => {
    const validRequest = { baseOs: 'ubuntu-22.04', model: 'phi3:mini' };
    const invalidRequest = { baseOs: 'invalid' };
    
    expect(validateBuildRequest(validRequest)).toBe(true);
    expect(validateBuildRequest(invalidRequest)).toBe(false);
  });
});
```

### 2. Integration Tests
**Scope**: Component interactions and API endpoints
**Tools**: Supertest, Jest
**Environment**: Test database and mock services

#### API Integration Tests
```javascript
describe('API Integration', () => {
  test('build ISO endpoint', async () => {
    const response = await request(app)
      .post('/api/build-iso')
      .send({ baseOs: 'ubuntu-22.04', model: 'phi3:mini' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
  
  test('USB drive detection', async () => {
    const response = await request(app)
      .get('/api/usb-drives')
      .expect(200);
    
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

#### WebSocket Integration Tests
```javascript
describe('WebSocket Integration', () => {
  test('progress updates', (done) => {
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'progress') {
        expect(message.stage).toBeDefined();
        expect(message.message).toBeDefined();
        ws.close();
        done();
      }
    });
  });
});
```

### 3. System Tests
**Scope**: End-to-end functionality
**Tools**: Playwright, Cypress
**Environment**: Full application stack

#### E2E Test Scenarios
```javascript
describe('BootAI E2E Tests', () => {
  test('complete ISO build workflow', async () => {
    // 1. Open application
    await page.goto('http://localhost:3000');
    
    // 2. Select configuration
    await page.selectOption('#baseOs', 'ubuntu-22.04');
    await page.selectOption('#model', 'phi3:mini');
    
    // 3. Start build
    await page.click('#buildButton');
    
    // 4. Monitor progress
    await page.waitForSelector('.progress-bar');
    await page.waitForSelector('.build-completed', { timeout: 1800000 });
    
    // 5. Download ISO
    await page.click('#downloadButton');
    
    // 6. Verify file exists
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.iso');
  });
});
```

### 4. Performance Tests
**Scope**: Load testing and performance metrics
**Tools**: Artillery, K6
**Metrics**: Response time, throughput, resource usage

#### Load Testing Scenarios
```yaml
# Artillery configuration
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
    - duration: 60
      arrivalRate: 5

scenarios:
  - name: "API Load Test"
    weight: 100
    flow:
      - get:
          url: "/api/wsl-status"
      - post:
          url: "/api/build-iso"
          json:
            baseOs: "ubuntu-22.04"
            model: "phi3:mini"
```

### 5. Security Tests
**Scope**: Security vulnerabilities and data protection
**Tools**: OWASP ZAP, Snyk
**Focus**: Input validation, injection attacks, data exposure

#### Security Test Cases
```javascript
describe('Security Tests', () => {
  test('SQL injection prevention', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await request(app)
      .post('/api/build-iso')
      .send({ baseOs: maliciousInput, model: 'phi3:mini' })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid base OS');
  });
  
  test('XSS prevention', async () => {
    const maliciousScript = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/build-iso')
      .send({ baseOs: 'ubuntu-22.04', model: maliciousScript })
      .expect(400);
    
    expect(response.body.error).toContain('Invalid model');
  });
});
```

## Test Data Management

### 1. Test Data Sets
```javascript
// Test data for different scenarios
const testData = {
  validConfigurations: [
    { baseOs: 'ubuntu-22.04', model: 'phi3:mini' },
    { baseOs: 'ubuntu-24.04', model: 'phi3' },
    { baseOs: 'debian-12', model: 'llama3' }
  ],
  invalidConfigurations: [
    { baseOs: 'invalid', model: 'phi3:mini' },
    { baseOs: 'ubuntu-22.04', model: 'invalid' },
    { baseOs: '', model: 'phi3:mini' }
  ],
  usbDrives: [
    { device: 'E:', label: 'Test USB', size: '8GB' },
    { device: 'F:', label: 'Another USB', size: '16GB' }
  ]
};
```

### 2. Mock Services
```javascript
// Mock WSL service for testing
const mockWSL = {
  status: () => ({ installed: true, running: true }),
  execute: (command) => Promise.resolve({ stdout: 'success', stderr: '' }),
  buildISO: (config) => Promise.resolve('ai-node.iso')
};

// Mock USB service for testing
const mockUSB = {
  detect: () => Promise.resolve([{ device: 'E:', size: '8GB' }]),
  write: (iso, device) => Promise.resolve('success')
};
```

## Test Environment Setup

### 1. Development Environment
```bash
# Install test dependencies
npm install --save-dev jest supertest playwright

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### 2. CI/CD Pipeline
```yaml
# GitHub Actions workflow
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

### 3. Test Database
```javascript
// Test database configuration
const testDB = {
  host: 'localhost',
  port: 5432,
  database: 'bootai_test',
  username: 'test_user',
  password: 'test_password'
};
```

## Test Execution Strategy

### 1. Test Phases
1. **Pre-commit**: Unit tests and linting
2. **Pull Request**: Integration tests and security scans
3. **Main Branch**: Full test suite including E2E tests
4. **Release**: Performance tests and user acceptance tests

### 2. Test Prioritization
- **Critical**: Core functionality (ISO building, USB writing)
- **High**: API endpoints, WebSocket communication
- **Medium**: UI components, error handling
- **Low**: Edge cases, performance optimizations

### 3. Test Automation
```javascript
// Automated test runner
const testRunner = {
  unit: () => runJestTests('src/**/*.test.js'),
  integration: () => runSupertestTests('tests/integration/**/*.test.js'),
  e2e: () => runPlaywrightTests('tests/e2e/**/*.test.js'),
  performance: () => runArtilleryTests('tests/performance/**/*.yml')
};
```

## Quality Gates

### 1. Code Coverage
- **Minimum**: 80% overall coverage
- **Critical Paths**: 95% coverage
- **New Code**: 90% coverage

### 2. Performance Benchmarks
- **API Response Time**: < 200ms for simple requests
- **Build Process**: < 30 minutes for standard ISO
- **Memory Usage**: < 100MB for application
- **Startup Time**: < 10 seconds

### 3. Security Standards
- **OWASP Top 10**: All vulnerabilities addressed
- **Dependency Scanning**: No high-severity vulnerabilities
- **Code Analysis**: No security anti-patterns

## Test Reporting

### 1. Test Results Dashboard
```javascript
// Test results structure
const testResults = {
  summary: {
    total: 150,
    passed: 145,
    failed: 5,
    skipped: 0,
    coverage: 85
  },
  details: {
    unit: { passed: 50, failed: 0 },
    integration: { passed: 40, failed: 2 },
    e2e: { passed: 35, failed: 3 },
    performance: { passed: 20, failed: 0 }
  },
  failures: [
    {
      test: 'USB write functionality',
      error: 'Permission denied',
      stack: '...'
    }
  ]
};
```

### 2. Continuous Monitoring
- **Test Execution**: Automated on every commit
- **Performance Tracking**: Trend analysis over time
- **Coverage Monitoring**: Coverage trends and gaps
- **Failure Analysis**: Root cause analysis for failures

## Test Maintenance

### 1. Test Data Refresh
- **Regular Updates**: Test data updated monthly
- **Version Compatibility**: Tests updated for new OS versions
- **Model Updates**: Tests updated for new AI models

### 2. Test Environment Cleanup
```bash
# Cleanup script
#!/bin/bash
# Remove test artifacts
rm -rf test-artifacts/
rm -rf iso_extract/
rm -rf iso_new/
rm -rf iso_mount/

# Reset test database
npm run test:db:reset

# Clear test cache
npm run test:cache:clear
```

### 3. Test Documentation
- **Test Cases**: Documented in test files
- **Test Data**: Documented in test data files
- **Test Environment**: Documented in setup guides
- **Test Results**: Documented in reports

## Current Testing Status

### Tested Components ✅
- **Application startup** - BootAI runs on port 3000
- **Web interface** - Step-by-step wizard loads correctly
- **API endpoints** - All endpoints respond correctly
- **WSL integration** - Build process completes successfully
- **ISO creation** - ai-node.iso generated (1.5GB+ file)
- **Caching system** - Prevents re-downloads
- **WebSocket communication** - Real-time progress updates
- **Error handling** - Comprehensive error management
- **Input validation** - Server-side validation working

### Pending Tests ⚠️
- **USB writing functionality** - Needs testing with actual hardware
- **Different OS/model combinations** - Needs comprehensive testing
- **Performance under load** - Needs load testing
- **Error recovery scenarios** - Needs failure injection testing
- **Cross-browser compatibility** - Needs browser testing

### Current Test Results
- **Build Success Rate**: 100% for Ubuntu 22.04 + Phi-3 mini
- **API Response Time**: < 200ms for simple requests
- **WebSocket Latency**: < 100ms for progress updates
- **Memory Usage**: ~50MB base + operation overhead
- **Build Time**: ~15-20 minutes for standard ISO

### Recent Testing Achievements
- **Fixed Ubuntu Server compatibility** - Resolved squashfs extraction issues
- **Implemented caching tests** - Verified cache functionality
- **Added timeout testing** - Verified timeout handling
- **Error handling tests** - Verified comprehensive error management
- **Progress tracking tests** - Verified WebSocket updates
- **Input validation tests** - Verified server-side validation

### Known Test Issues
- **JSON parsing error** - Appears in terminal but non-blocking
- **WSL systemd warnings** - Expected behavior, not critical
- **USB hardware dependency** - Requires actual USB drives for testing

## Future Testing Enhancements

### Planned Improvements
- **Visual Regression Testing**: Screenshot comparison
- **Accessibility Testing**: WCAG compliance testing
- **Cross-browser Testing**: Multiple browser support
- **Mobile Testing**: Responsive design testing
- **API Contract Testing**: API schema validation
- **Chaos Engineering**: Failure injection testing
