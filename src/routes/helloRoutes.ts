import { Router } from 'express';
import { HelloController } from '../controllers/HelloController';

const router = Router();
const helloController = new HelloController();

// Root routes
router.get('/', helloController.hello);
router.get('/health', helloController.health);

// API routes
router.get('/api/hello', helloController.hello);
router.get('/api/hello/:name', helloController.helloName);

export { router as helloRoutes };