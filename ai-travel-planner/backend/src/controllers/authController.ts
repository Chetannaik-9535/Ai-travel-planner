import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StringValue } from 'ms';
import User from '../models/User';
//import { errorHandler } from '../middleware/errorHandler';
import {AppError} from '../utils/AppError'; // Adjust the relative path to match your folder structure


// Wait! Double check if the file exports 'AppError' or 'errorHandler'



const signToken = (id: string, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError('JWT_SECRET not configured', 500);

  // Cast to `any` for expiresIn: newer @types/jsonwebtoken (v9+) uses a
  // `StringValue` branded type that env strings don't satisfy at compile time.
  // The value is still validated at runtime by the jwt library itself.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;

  return jwt.sign({ id, email }, secret, { expiresIn });
};

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('An account with this email already exists', 409);
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id.toString(), user.email);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Explicitly select password (excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      // Vague error for security (don't reveal if email exists)
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user._id.toString(), user.email);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getMe = async (
  req: Request & { user?: { id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) throw new AppError('User not found', 404);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};