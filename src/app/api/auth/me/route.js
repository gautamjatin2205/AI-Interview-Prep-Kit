import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth.js';

export async function GET(req) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.userId,
      email: user.email,
      name: user.name
    }
  });
}
