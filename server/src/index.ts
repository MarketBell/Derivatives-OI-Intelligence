import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    message: 'OI Intelligence Dashboard Backend Service',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'OI Intelligence Server' });
});

app.listen(PORT, () => {
  console.log(`[OI Intelligence Server] Running on port ${PORT}`);
});
