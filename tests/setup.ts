// Jest setup file for global test configuration

// Set test timeout
jest.setTimeout(10000);

// Mock console for cleaner test output
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});