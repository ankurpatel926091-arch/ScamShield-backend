import { AuthService } from '../services/authService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators/authValidator.js';

export const register = asyncHandler(async (req, res) => {
  const validated = registerSchema.parse(req.body);
  const result = await AuthService.register(validated);
  return ApiResponse.success(res, result.message, result, 201);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const validated = verifyOtpSchema.parse(req.body);
  const result = await AuthService.verifyOtp(validated);
  return ApiResponse.success(res, result.message, result);
});

export const login = asyncHandler(async (req, res) => {
  const validated = loginSchema.parse(req.body);
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
  const userAgent = req.headers['user-agent'] || '';

  const result = await AuthService.login({ ...validated, ipAddress, userAgent });

  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000
  });

  return ApiResponse.success(res, 'Login successful', result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await AuthService.refreshToken(token);
  return ApiResponse.success(res, 'Token refreshed successfully', result);
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  const userId = req.user?.id;
  const result = await AuthService.logout(userId, refreshToken);
  res.clearCookie('accessToken');
  return ApiResponse.success(res, result.message);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const validated = forgotPasswordSchema.parse(req.body);
  const result = await AuthService.forgotPassword(validated.email);
  return ApiResponse.success(res, result.message);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const validated = resetPasswordSchema.parse(req.body);
  const result = await AuthService.resetPassword(validated.token, validated.newPassword);
  return ApiResponse.success(res, result.message);
});

export const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  return ApiResponse.success(res, 'User profile fetched', { user });
});
