import { ReportService } from '../services/reportService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { createReportSchema, commentSchema, voteSchema } from '../validators/reportValidator.js';

export const createReport = asyncHandler(async (req, res) => {
  const validated = createReportSchema.parse(req.body);
  const report = await ReportService.createReport(req.user.id, validated);
  return ApiResponse.success(res, 'Scam report submitted successfully', { report }, 201);
});

export const getReports = asyncHandler(async (req, res) => {
  const { query, category, scamType, status, page, limit, sort } = req.query;
  const result = await ReportService.getReports({
    query,
    category,
    scamType,
    status,
    page: page || 1,
    limit: limit || 10,
    sort
  });

  return ApiResponse.paginated(
    res,
    'Reports retrieved',
    result.reports,
    result.page,
    result.limit,
    result.total
  );
});

export const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await ReportService.getReportById(id);
  return ApiResponse.success(res, 'Report details fetched', result);
});

export const voteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = voteSchema.parse(req.body);
  const result = await ReportService.voteReport(id, req.user.id, type);
  return ApiResponse.success(res, result.message);
});

export const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = commentSchema.parse(req.body);
  const comment = await ReportService.addComment(id, req.user.id, content);
  return ApiResponse.success(res, 'Comment posted successfully', { comment }, 201);
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await ReportService.toggleBookmark(id, req.user.id);
  return ApiResponse.success(res, result.message, result);
});

export const getBookmarks = asyncHandler(async (req, res) => {
  const reports = await ReportService.getUserBookmarks(req.user.id);
  return ApiResponse.success(res, 'Bookmarked reports fetched', { reports });
});
