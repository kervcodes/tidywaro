import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authMiddleware, AuthRequest } from './middleware/auth.middleware';
import wardrobeRoutes from './routes/wardrobe.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/wardrobe', wardrobeRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Protected Route
app.get('/me', authMiddleware, ((req: Request, res: Response) => {
    const user = (req as AuthRequest).user;
    res.json(user);
}) as any);

app.listen(port, () => {
    console.log(`BFF running on http://localhost:${port}`);
});
