import type { RequestHandler } from 'express';
import {
  SegmentQuerySchema,
  type AnalyticsService,
} from '../services/AnalyticsService.js';

function parseSegmentQuery(query: unknown) {
  return SegmentQuerySchema.parse(query);
}

export function createAnalyticsController(service: AnalyticsService): {
  dashboard: RequestHandler;
  listBases: RequestHandler;
  baseAnalytics: RequestHandler;
  baseAccounts: RequestHandler;
  trends: RequestHandler;
} {
  const dashboard: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const body = await service.getDashboard(segment);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  const listBases: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const body = await service.listBases(segment);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  const baseAnalytics: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const baseId = String(req.params.id ?? '');
      const body = await service.getBaseAnalytics(baseId, segment);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  const baseAccounts: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const baseId = String(req.params.id ?? '');
      const body = await service.listBaseAccounts(baseId, segment);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  const trends: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const body = await service.getTrends(segment);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  return { dashboard, listBases, baseAnalytics, baseAccounts, trends };
}
