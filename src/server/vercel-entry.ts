import express from 'express';
import projectReportMarkdown from '../../documentation/PROJECT_REPORT_BTECH_VT.md';
import { createApiApp } from './app.ts';

if (!process.env.BUNDLED_PROJECT_REPORT_MD) {
  process.env.BUNDLED_PROJECT_REPORT_MD = projectReportMarkdown;
}

const wrapper = express();

wrapper.use((req, _res, next) => {
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const capturedRoute = parsed.searchParams.get('__route');
    parsed.searchParams.delete('__route');

    let pathname = parsed.pathname;
    if (
      capturedRoute !== null &&
      (pathname === '/api/index' || pathname === '/api/index.js' || pathname === '/api')
    ) {
      const cleanSubpath = capturedRoute.replace(/^\/+/, '');
      pathname = cleanSubpath ? `/api/${cleanSubpath}` : '/api';
    } else if (!pathname.startsWith('/api')) {
      pathname = `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;
    }

    const qs = parsed.searchParams.toString();
    req.url = qs ? `${pathname}?${qs}` : pathname;
  } catch {
    if (!req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
  }
  next();
});

wrapper.use(createApiApp());

export const maxDuration = 60;
export default wrapper;
