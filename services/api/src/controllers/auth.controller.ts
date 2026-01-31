import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import mongoose from 'mongoose'; // To check connection status
import bcrypt from 'bcryptjs'; // Need authentic bcrypt for mock mode
import { sendEmail } from '../services/email.service';

import fs from 'fs';
import path from 'path';

// --- MOCK DATABASE (IN-MEMORY + FILE PERSISTENCE) ---
const MOCK_DB_PATH = path.join(__dirname, '../../mock_users.json');

// Helper: Load users from file
const loadMockUsers = (): any[] => {
    try {
        if (fs.existsSync(MOCK_DB_PATH)) {
            const data = fs.readFileSync(MOCK_DB_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Error loading mock DB:", error);
    }
    return [];
};

// Helper: Save users to file
const saveMockUsers = (users: any[]) => {
    try {
        fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error("Error saving mock DB:", error);
    }
};

let mockUsers: any[] = loadMockUsers();

// Helper: Check if DB is connected
const isDbConnected = () => mongoose.connection.readyState === 1;

// Generate JWT Token
const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'default_secret_please_change', {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        // --- MOCK MODE ---
        if (!isDbConnected()) {
            console.log('⚠️ [Mock Auth] Registering User:', email);
            if (mockUsers.find(u => u.email === email)) {
                return res.status(400).json({ message: 'User already exists (Mock Mode)' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = {
                _id: 'mock_id_' + Date.now(),
                username,
                email,
                password: hashedPassword,
                createdAt: new Date(),
                comparePassword: async function (candidate: string) { return bcrypt.compare(candidate, this.password); }
            };
            mockUsers.push(newUser);
            saveMockUsers(mockUsers); // PERSIST CHANGES

            return res.status(201).json({
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                token: generateToken(newUser._id),
            });
        }
        // -----------------

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id.toString()),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server Error during registration' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // --- MOCK MODE ---
        if (!isDbConnected()) {
            console.log('⚠️ [Mock Auth] Login User:', email);
            const mockUser = mockUsers.find(u => u.email === email);

            if (mockUser && (await bcrypt.compare(password, mockUser.password))) {
                return res.json({
                    _id: mockUser._id,
                    username: mockUser.username,
                    email: mockUser.email,
                    token: generateToken(mockUser._id),
                });
            } else {
                return res.status(401).json({ message: 'Invalid credentials (Mock Mode). Did you register?' });
            }
        }
        // -----------------

        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {

            // Send Login Alert (Async, don't wait)
            sendEmail(
                user.email,
                'CyberGuard Login Alert',
                `New login detected for your account: ${user.username} at ${new Date().toLocaleString()}`
            );

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id.toString()),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server Error during login' });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
        console.log(`[Forgot Password] Request received for: ${email}`);

        // --- MOCK MODE ---
        if (!isDbConnected()) {
            console.log('[Forgot Password] DB is offline. Checking Mock Users...');

            const mockUser = mockUsers.find(u => {
                console.log(`Checking against user: ${u.email}`);
                return u.email === email;
            });

            if (!mockUser) {
                console.log(`[Forgot Password] User not found in mock DB for email: ${email}`);
                console.log('Available mock emails:', mockUsers.map(u => u.email));
                return res.status(404).json({ message: 'User not found' });
            }

            console.log(`[Forgot Password] User found: ${mockUser.username}`);

            const resetToken = crypto.randomBytes(20).toString('hex');
            mockUser.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            mockUser.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
            saveMockUsers(mockUsers); // PERSIST CHANGES

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000';
            const resetUrl = `${frontendUrl}/legacy/frontend/index.html?resetToken=${resetToken}`;
            const message = `[MOCK RESET] You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

            await sendEmail(email, 'Password Reset Request', message);
            return res.status(200).json({ success: true, data: 'Email sent (Mock)', resetUrl });
        }
        // -----------------

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get reset token
        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // Create reset URL
        // Assuming frontend is running on localhost:5500 or similar. Using localhost:3000 as generic placeholder.
        // The frontend 'login.html' now handles 'resetToken' query param.
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/legacy/frontend/index.html?resetToken=${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail(user.email, 'Password Reset Request', message);
            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ message: 'Email could not be sent' });
        }

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resetToken
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        // --- MOCK MODE ---
        if (!isDbConnected()) {
            const mockUser = mockUsers.find(u =>
                u.resetPasswordToken === resetPasswordToken &&
                u.resetPasswordExpire > Date.now()
            );

            if (!mockUser) return res.status(400).json({ message: 'Invalid token' });

            const salt = await bcrypt.genSalt(10);
            mockUser.password = await bcrypt.hash(req.body.password, salt);
            mockUser.resetPasswordToken = undefined;
            mockUser.resetPasswordExpire = undefined;
            saveMockUsers(mockUsers); // PERSIST CHANGES

            return res.status(200).json({
                success: true,
                token: generateToken(mockUser._id)
            });
        }
        // -----------------

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            token: generateToken(user._id.toString())
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: any, res: Response) => {
    try {
        // --- MOCK MODE ---
        if (!isDbConnected()) {
            // In mock mode, we decode the token in middleware and attach it to req.user
            // req.user has { id: 'mock_id_...' }
            const mockUser = mockUsers.find(u => u._id === req.user.id);

            if (mockUser) {
                return res.json({
                    _id: mockUser._id,
                    username: mockUser.username,
                    email: mockUser.email
                });
            } else {
                // Even if not found in array (maybe restart?), return basic info from token to keep app alive
                return res.json({
                    _id: req.user.id,
                    username: 'Guest Agent',
                    email: 'offline@mode'
                });
            }
        }
        // -----------------

        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Fetch Me Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
