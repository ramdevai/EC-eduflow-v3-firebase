import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTemplates, updateTemplate } from '@/lib/db-sheets';

export async function GET(req: Request) {
    const session = await auth() as any;
    const sheetId = req.headers.get('x-sheet-id');
    if (!session?.accessToken || !sheetId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const templates = await getTemplates(sheetId, session.accessToken);
    return NextResponse.json(templates);
}

export async function PATCH(req: Request) {
    const session = await auth() as any;
    const sheetId = req.headers.get('x-sheet-id');
    if (!session?.accessToken || !sheetId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, subject, message } = await req.json();
    if (!id || (subject === undefined && message === undefined)) {
        return NextResponse.json({ error: 'ID and either subject or message are required' }, { status: 400 });
    }
    try {
        await updateTemplate(sheetId, session.accessToken, id, { subject, message });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
