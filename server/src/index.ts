import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './env';
import { api } from './routes';
import { errorHandler, notFound } from './middleware/error';
import { initSocket } from './lib/socket';
import { scheduleBackups } from './lib/backup';
import { logger } from './lib/logger';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.webOrigin, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use('/static', express.static(path.resolve(process.cwd(), 'uploads'), { maxAge: '30d' }));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);
scheduleBackups();

server.listen(env.port, () => {
  logger.info(`RiseNext API listening on :${env.port} (${env.nodeEnv})`);
});

export { app, server };
