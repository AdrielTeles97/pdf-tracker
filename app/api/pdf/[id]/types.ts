import { NextRequest, NextResponse } from 'next/server';

export type RouteParams = {
    params: {
        id: string;
    };
};

export type RouteHandler = (
    request: NextRequest,
    context: RouteParams
) => Promise<NextResponse>;