const request = require('supertest');

process.env.BOOTAI_TEST_MODE = '1';

const { app } = require('../src/main');

describe('BootAI API (test mode)', () => {
  test('WSL status endpoint reports success in test mode', async () => {
    const response = await request(app).get('/api/wsl-status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        available: true,
        summary: expect.stringContaining('WSL')
      })
    );
    expect(Array.isArray(response.body.checks)).toBe(true);
    expect(response.body.checks[0]).toEqual(
      expect.objectContaining({
        name: 'Test Mode',
        success: true
      })
    );
  });

  test('build-iso endpoint validates inputs', async () => {
    const response = await request(app)
      .post('/api/build-iso')
      .send({ baseOs: 'invalid', model: 'phi3:mini' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({ success: false })
    );
  });

  test('build-iso endpoint succeeds in test mode with valid input', async () => {
    const response = await request(app)
      .post('/api/build-iso')
      .send({ baseOs: 'ubuntu-24.04', model: 'phi3:mini' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('Test mode')
      })
    );
  });

  test('USB drive scan returns a simulated device in test mode', async () => {
    const response = await request(app).get('/api/usb-drives');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toEqual(
      expect.objectContaining({
        deviceName: 'E:',
        volumeName: 'TestUSB'
      })
    );
  });
});
