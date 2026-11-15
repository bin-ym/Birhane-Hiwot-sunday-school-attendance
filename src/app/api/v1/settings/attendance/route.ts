import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/apiAuth";
import {
  getAttendanceCalendarSettings,
  saveAttendanceCalendarSettings,
} from "@/lib/attendanceSettingsServer";
import { DEFAULT_ATTENDANCE_CALENDAR_MODE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/attendance
 * Retrieves the configured attendance calendar mode and metadata.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const settings = await getAttendanceCalendarSettings();
    return NextResponse.json({
      success: true,
      mode: settings.mode,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
      defaultMode: DEFAULT_ATTENDANCE_CALENDAR_MODE,
    });
  } catch (err) {
    console.error("Failed to load attendance settings:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load attendance settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/attendance
 * Updates the attendance calendar mode. Restricted strictly to Super Admin.
 */
export async function POST(req: NextRequest) {
  const { token, error } = await requireSuperAdmin(req);
  if (error) return error;

  try {
    const body = await req.json();
    const mode = body.mode;

    if (mode !== "sundays_only" && mode !== "all_days") {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid mode. Mode must be either "sundays_only" or "all_days".',
        },
        { status: 400 },
      );
    }

    const updatedBy =
      (token.email as string) || (token.username as string) || "Super Admin";
    const userId = (token.sub as string) || (token.id as string) || updatedBy;

    const result = await saveAttendanceCalendarSettings({
      mode,
      updatedBy,
      userId,
      userRole: "Super Admin",
    });

    return NextResponse.json({
      success: true,
      mode: result.mode,
      message: `Attendance calendar mode successfully updated to "${result.mode === "sundays_only" ? "Sundays Only" : "All Days"}".`,
    });
  } catch (err) {
    console.error("Failed to save attendance settings:", err);
    return NextResponse.json(
      { success: false, message: "Failed to save attendance settings" },
      { status: 500 },
    );
  }
}
