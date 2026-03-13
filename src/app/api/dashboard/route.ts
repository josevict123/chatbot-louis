import { NextResponse } from 'next/server';

export async function GET() {
  // Versión simplificada sin base de datos
  return NextResponse.json({
    mensajes: [],
    stats: { totalMensajes: 0, totalFans: 0, respondidos: 0 },
    status: 'El chatbot está activo y funcionando.'
  });
}
