import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authMiddleware, AuthRequest } from './middleware/auth.middleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Protected Route
app.get('/me', authMiddleware, (req: AuthRequest, res) => {
    res.json(req.user);
});

app.listen(port, () => {
    console.log(`BFF running on http://localhost:${port}`);
});
