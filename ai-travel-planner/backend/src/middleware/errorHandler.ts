export const errorHandler = (err: any, req: any, res: any, next: any) => {
  // MongoDB duplicate-key error code is a number on the driver
  // not a string - cast to a union type so strict equality is
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.code === 11000) {
    statusCode = 409;
    message = 'A resource with this value already exists';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
