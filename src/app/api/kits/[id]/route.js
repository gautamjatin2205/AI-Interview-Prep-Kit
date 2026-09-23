import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth.js';
import { connectDB, FileDB, getKitQuery } from '../../../../lib/db.js';
import PrepKit from '../../../../models/PrepKit.js';

async function findKitById(id) {
  return await PrepKit.findOne(getKitQuery(id));
}

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const isMongo = await connectDB();

    let kit = null;
    if (isMongo) {
      kit = await findKitById(id);
      if (kit) kit = kit.toObject(); // Convert Mongoose doc to plain object for JSON serialization
    } else {
      kit = FileDB.getKitById(id);
    }

    if (!kit) {
      return NextResponse.json({ success: false, error: 'Prep kit not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, kit });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const user = getAuthUser(req);
    const updatedKitData = await req.json();

    const isMongo = await connectDB();
    let savedKit = null;

    if (isMongo) {
      const existingKit = await findKitById(id);
      if (!existingKit) {
        return NextResponse.json({ success: false, error: 'Kit not found.' }, { status: 404 });
      }

      if (user && existingKit.userId && existingKit.userId !== 'guest' && existingKit.userId !== user.userId) {
        return NextResponse.json({ success: false, error: 'Kit not found or access denied.' }, { status: 403 });
      }

      const updatedDoc = {
        ...updatedKitData,
        id: existingKit.id || id,
        userId: user ? user.userId : existingKit.userId || 'guest',
        updatedAt: new Date()
      };

      const result = await PrepKit.findOneAndUpdate(
        getKitQuery(id),
        { $set: updatedDoc },
        { new: true, runValidators: false }
      );

      if (!result) {
        return NextResponse.json({ success: false, error: 'Kit not found or access denied.' }, { status: 404 });
      }
      savedKit = result.toObject();
    } else {
      savedKit = FileDB.saveKit({ ...updatedKitData, id: id });
    }

    return NextResponse.json({
      success: true,
      message: 'Kit updated successfully.',
      kit: savedKit
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const isMongo = await connectDB();

    if (isMongo) {
      await PrepKit.deleteOne(getKitQuery(id));
    } else {
      FileDB.deleteKit(id);
    }

    return NextResponse.json({ success: true, message: 'Kit deleted.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
