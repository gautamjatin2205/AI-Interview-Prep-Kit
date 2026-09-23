import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB, FileDB } from '../../../../lib/db.js';
import User from '../../../../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-2026';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and Password are required.' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isMongo = await connectDB();

    let user = null;

    if (isMongo) {
      user = await User.findOne({ email: lowerEmail });
    } else {
      user = FileDB.findUserByEmail(lowerEmail);
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    // Use MongoDB _id when available, fallback to custom id field
    const userId = user._id ? user._id.toString() : (user.id || lowerEmail);
    const token = jwt.sign({ userId, email: lowerEmail, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: { id: userId, email: lowerEmail, name: user.name }
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
