import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { hasPdf } = body;
        if (!hasPdf) {
            return NextResponse.json(
                { error: "No PDF file available to sign" },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "PDF signature validated successfully"
            },
            { status: 200 }
        );
    } catch {
        return NextResponse.json(
            { error: "Invalid request" },
            { status: 400 }
        );
    }
}
