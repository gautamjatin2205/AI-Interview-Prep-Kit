import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB, FileDB } from '../../../../lib/db.js';
import User from '../../../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-2026';

export async function POST(req) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ success: false, error: 'Name, Email, and Password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isMongo = await connectDB();

    let existingUser = null;

    if (isMongo) {
      existingUser = await User.findOne({ email: lowerEmail });
    } else {
      existingUser = FileDB.findUserByEmail(lowerEmail);
    }

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userId;

    if (isMongo) {
      const u = new User({ email: lowerEmail, password: hashedPassword, name });
      await u.save();
      userId = u._id.toString();
    } else {
      const fileUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const userObj = {
        id: fileUserId,
        email: lowerEmail,
        password: hashedPassword,
        name: name,
        createdAt: new Date().toISOString()
      };
      FileDB.createUser(userObj);
      userId = fileUserId;
    }

    const token = jwt.sign({ userId, email: lowerEmail, name }, JWT_SECRET, { expiresIn: '7d' });

    const response = NextResponse.json({
      success: true,
      message: 'Account registered successfully.',
      user: { id: userId, email: lowerEmail, name }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (err) {
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

