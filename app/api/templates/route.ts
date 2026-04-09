import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTemplates, updateTemplate } from '@/lib/db-firestore';
import { UserRole } from '@/lib/types';

export async function GET(req: Request) {
    const session = await auth() as any;
    if (!session?.user?.id || !session?.user?.role) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const templates = await getTemplates();
    return NextResponse.json(templates);
}

export async function PATCH(req: Request) {
    const session = await auth() as any;
    if (!session?.user?.id || !session?.user?.role) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id, subject, message } = await req.json();
    if (!id || (subject === undefined && message === undefined)) {
        return NextResponse.json({ error: 'ID and either subject or message are required' }, { status: 400 });
    }
    try {
        await updateTemplate(session.user.id, session.user.role as UserRole, id, { subject, message });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
