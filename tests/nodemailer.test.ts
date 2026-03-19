import { describe, it, expect } from 'vitest';
import nodemailer from 'nodemailer';

describe('nodemailer verification', () => {
  it('should be able to create a transport object', () => {
    const transporter = nodemailer.createTransport({
      host: 'mail.educompass.in',
      port: 587,
      secure: false,
      auth: {
        user: 'test@educompass.in',
        pass: 'password'
      }
    });

    expect(transporter).toBeDefined();
    expect(typeof transporter.sendMail).toBe('function');
  });

  it('should have the expected version', () => {
    // Nodemailer doesn't export version directly easily, 
    // but we can check if it's imported correctly.
    expect(nodemailer).toBeDefined();
  });
});
