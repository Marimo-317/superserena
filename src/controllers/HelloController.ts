import { Request, Response } from 'express';
import { HelloResponse, HealthResponse } from '../types';

export class HelloController {
  private readonly version = '1.0.0';

  /**
   * Root hello endpoint
   */
  public hello = (req: Request, res: Response): void => {
    const response: HelloResponse = {
      message: 'Hello World',
      timestamp: new Date().toISOString(),
      version: this.version
    };

    res.status(200).json(response);
  };

  /**
   * Personalized hello endpoint
   */
  public helloName = (req: Request, res: Response): void => {
    const { name } = req.params;
    
    if (!name || name.trim() === '') {
      res.status(400).json({
        message: 'Name parameter is required',
        timestamp: new Date().toISOString(),
        version: this.version
      });
      return;
    }

    const response: HelloResponse = {
      message: `Hello ${name}!`,
      name: name,
      timestamp: new Date().toISOString(),
      version: this.version
    };

    res.status(200).json(response);
  };

  /**
   * Health check endpoint
   */
  public health = (req: Request, res: Response): void => {
    const response: HealthResponse = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: this.version
    };

    res.status(200).json(response);
  };
}