import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const transporter = nodemailer.createTransport(
  config.smtp.host?.includes('gmail') || config.smtp.user?.endsWith('@gmail.com')
    ? {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        family: 4,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      }
    : {
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        family: 4,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      }
);

export const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: config.smtp.from,
    to: email,
    subject: '🛡️ ScamShield AI - Verification OTP Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #06b6d4;">ScamShield AI Email Verification</h2>
        <p>Thank you for registering on ScamShield AI. Please use the following 6-digit One-Time Password (OTP) to verify your account:</p>
        <div style="background-color: #1e293b; border: 1px solid #334155; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    if (!config.smtp.user || config.smtp.user === 'test@scamshield.ai') {
      logger.info(`[Email Service Mock] OTP for ${email} is: ${otp}`);
      return true;
    }
    await transporter.sendMail(mailOptions);
    logger.info(`Verification OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    logger.warn(`Failed to send email to ${email} (${error.message}). Logging OTP for dev: ${otp}`);
    return false;
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
  const mailOptions = {
    from: config.smtp.from,
    to: email,
    subject: '🛡️ ScamShield AI - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #06b6d4;">Password Reset Request</h2>
        <p>You requested a password reset for your ScamShield AI account. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #06b6d4; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">This link will expire in 1 hour. Direct link: ${resetUrl}</p>
      </div>
    `
  };

  try {
    if (!config.smtp.user || config.smtp.user === 'test@scamshield.ai') {
      logger.info(`[Email Service Mock] Reset URL for ${email} is: ${resetUrl}`);
      return true;
    }
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    logger.warn(`Failed to send reset email to ${email}. Logging reset URL: ${resetUrl}`);
    return false;
  }
};
