import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../lib/auth.js';
import { connectDB, FileDB } from '../../../lib/db.js';
import PrepKit from '../../../models/PrepKit.js';
import { generateInterviewKit } from '../../../services/pipeline/index.js';

export async function GET(req) {
  try {
    const user = getAuthUser(req);
    const userId = user ? user.userId : 'guest';

    const isMongo = await connectDB();
    let kits = [];

    if (isMongo) {
      const docs = await PrepKit.find({ userId: userId }).sort({ createdAt: -1 });
      kits = docs.map(doc => doc.toObject()); // Serialize properly
    } else {
      kits = FileDB.getUserKits(userId);
    }

    return NextResponse.json({ success: true, kits });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    const userId = user ? user.userId : 'guest';

    const body = await req.json();

    // Check if batch upload of description-and-company pairs
    if (Array.isArray(body.pairs)) {
      const generatedKits = [];
      for (const pair of body.pairs) {
        const kit = await generateInterviewKit({
          jd: pair.jd || '',
          company_url: pair.company_url || '',
          days: pair.days || 5,
          userId: userId
        });

        const isMongo = await connectDB();
        if (isMongo) {
          const doc = new PrepKit(kit);
          await doc.save();
          generatedKits.push(doc.toObject());
        } else {
          FileDB.saveKit(kit);
          generatedKits.push(kit);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Batch generation complete! Created ${generatedKits.length} kits.`,
        kits: generatedKits
      });
    }

    // Single creation
    const { jd, company_url, days = 5 } = body;

    if (!jd && !company_url) {
      return NextResponse.json({
        success: false,
        error: 'Please provide a job description or company website URL.'
      }, { status: 400 });
    }

    const kit = await generateInterviewKit({
      jd: jd || '',
      company_url: company_url || '',
      days: days || 5,
      userId: userId
    });

    const isMongo = await connectDB();
    let savedKit = kit;

    if (isMongo) {
      const doc = new PrepKit(kit);
      await doc.save();
      savedKit = doc.toObject();
    } else {
      FileDB.saveKit(kit);
    }

    return NextResponse.json({
      success: true,
      message: 'Kit generated successfully!',
      kit: savedKit
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
