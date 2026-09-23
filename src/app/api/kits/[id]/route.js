import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth.js';
import { connectDB, FileDB } from '../../../../lib/db.js';
import PrepKit from '../../../../models/PrepKit.js';
import mongoose from 'mongoose';

// Helper: find kit by custom id OR MongoDB _id (handles CastError gracefully)
async function findKitById(id) {
  const query = { id: id }; // always search by custom string id first
  // Also try MongoDB _id if it looks like a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(id)) {
    return await PrepKit.findOne({ $or: [{ id: id }, { _id: id }] });
  }
  return await PrepKit.findOne(query);
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
      // Security: only allow owner to update
      const filter = { id: id };
      if (user) filter.userId = user.userId;

      const result = await PrepKit.findOneAndUpdate(
        filter,
        { $set: { ...updatedKitData, id: id, updatedAt: new Date() } },
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
      await PrepKit.deleteOne({ id: id });
    } else {
      FileDB.deleteKit(id);
    }

    return NextResponse.json({ success: true, message: 'Kit deleted.' });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
