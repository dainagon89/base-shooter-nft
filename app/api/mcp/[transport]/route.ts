import { mcpHandler } from '../handler';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { transport: string } }
) {
  return mcpHandler(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { transport: string } }
) {
  return mcpHandler(request, { params });
}
