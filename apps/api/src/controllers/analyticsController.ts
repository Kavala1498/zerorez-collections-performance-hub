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
  baseTrends: RequestHandler;
  alerts: RequestHandler;
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
      const base =
        typeof req.query.base === 'string' && req.query.base.trim()
          ? req.query.base
          : undefined;
      const body = await service.getTrends(segment, base);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  const baseTrends: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const baseId = String(req.params.id ?? '');
      const body = await service.getTrends(segment, baseId);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  const alerts: RequestHandler = async (req, res, next) => {
    try {
      const { segment } = parseSegmentQuery(req.query);
      const base =
        typeof req.query.base === 'string' && req.query.base.trim()
          ? req.query.base
          : undefined;
      const body = await service.getCriticalStageAlerts(segment, base);
      res.json(body);
    } catch (err) {
      next(err);
    }
  };

  return {
    dashboard,
    listBases,
    baseAnalytics,
    baseAccounts,
    trends,
    baseTrends,
    alerts,
  };
}
