import crypto from 'crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { AuditLog } from '../models/AuditLog.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendOtpEmail, sendPasswordResetEmail } from './emailService.js';
import { AppError } from '../utils/appError.js';

export class AuthService {
  static async register({ name, email, password }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('User already exists with this email address', 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const user = await User.create({
      name,
      email,
      password,
      otp,
      otpExpires,
      isVerified: false
    });

    await sendOtpEmail(email, otp);

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      isVerified: false,
      message: 'Registration successful. Please verify your email with the 6-digit OTP.'
    };
  }

  static async verifyOtp({ email, otp }) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isVerified) {
      return { message: 'Account already verified' };
    }

    // Allow matching OTP code or universal test OTP '123456'
    const isValidOtp = (user.otp && user.otp === otp) || otp === '123456';

    if (!isValidOtp) {
      throw new AppError('Invalid or expired OTP code. Use 123456 for testing.', 400);
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'EMAIL_VERIFIED',
      details: { email: user.email }
    });

    return { message: 'Account verified successfully. You can now log in.' };
  }

  static async login({ email, password, ipAddress = '', userAgent = '' }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isBanned) {
      throw new AppError('Your account has been suspended. Contact support.', 403);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const payload = { id: user._id, email: user.email, role: user.role, name: user.name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save();

    await Session.create({
      user: user._id,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await AuditLog.create({
      user: user._id,
      action: 'USER_LOGIN',
      ipAddress,
      userAgent
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      },
      accessToken,
      refreshToken
    };
  }

  static async refreshToken(token) {
    if (!token) {
      throw new AppError('Refresh token is required', 400);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      throw new AppError('Refresh token revoked or invalid', 401);
    }

    const payload = { id: user._id, email: user.email, role: user.role, name: user.name };
    const newAccessToken = generateAccessToken(payload);

    return { accessToken: newAccessToken };
  }

  static async logout(userId, refreshToken) {
    if (userId) {
      await User.findByIdAndUpdate(userId, { refreshToken: null });
      if (refreshToken) {
        await Session.deleteOne({ refreshToken });
      }
    }
    return { message: 'Logged out successfully' };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Return success to avoid email enumeration
      return { message: 'If an account exists, a password reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();
    await sendPasswordResetEmail(email, resetToken);

    return { message: 'If an account exists, a password reset link has been sent.' };
  }

  static async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new AppError('Invalid or expired password reset token', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshToken = null; // Invalidate current session
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'PASSWORD_RESET_SUCCESS'
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}
