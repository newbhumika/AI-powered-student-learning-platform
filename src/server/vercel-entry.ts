import express from 'express';
import { createApiApp } from './app.ts';

const wrapper = express();

wrapper.use((req, _res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  next();
});

wrapper.use(createApiApp());

export default wrapper;
