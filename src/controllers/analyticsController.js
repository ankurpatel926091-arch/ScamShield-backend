import { AnalyticsService } from '../services/analyticsService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await AnalyticsService.getAnalyticsOverview();
  return ApiResponse.success(res, 'Analytics overview retrieved', { data });
});
