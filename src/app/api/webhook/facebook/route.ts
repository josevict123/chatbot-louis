import { NextRequest, NextResponse } from 'next/server';

// Credenciales de Louis le Raté - CONFIGURADO
const VERIFY_TOKEN = 'mi_token_secreto_123';
const PAGE_ACCESS_TOKEN = 'EAFvqoIGCcAMBQ80b7P0s7GoEZBRs8tI8zqouzKsv739qUNezdeYw6Qw6ZAY87N9ZAxV5rvQxMtH2vUuZCUT4SKZBMEVxnHFhYhnewNTxo83Dx02sAWSyKe0ydGm5EFGvM4v6UAhrlWuHwY8yqQI2BQyG1KzN7DZBZCK68S9RZCSasqgYZAoPUCOnnYCqM7DammaMJDDvLxQZDZD';

// Memoria simple (se reinicia cada deploy)
const fans: Record<string, { nombre: string; totalMensajes: number }> = {};

// GET - Verificación del webhook por Facebook
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('[WEBHOOK] Verificación recibida:', { mode, token, challenge });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WEBHOOK] ✅ Webhook verificado correctamente');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('[WEBHOOK] ❌ Verificación fallida');
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
}

// POST - Recibir mensajes de Facebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK] Mensaje recibido:', JSON.stringify(body, null, 2));

    // Verificar que es un mensaje de página
    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Procesar cada entrada
    for (const entry of body.entry || []) {
      // Procesar mensajes privados
      for (const messaging of entry.messaging || []) {
        await processMessage(messaging);
      }

      // Procesar comentarios en posts/videos
      for (const change of entry.changes || []) {
        if (change.field === 'comments') {
          await processComment(change.value);
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Error procesando mensaje' }, { status: 500 });
  }
}

// Procesar mensaje privado
async function processMessage(messaging: any) {
  const senderId = messaging.sender?.id;
  const messageText = messaging.message?.text;

  if (!senderId || !messageText) {
    console.log('[WEBHOOK] Mensaje sin texto o sender, ignorando');
    return;
  }

  console.log(`[WEBHOOK] 💬 Mensaje de ${senderId}: "${messageText}"`);

  // Buscar o crear fan en memoria
  if (!fans[senderId]) {
    const userName = await getUserName(senderId);
    fans[senderId] = { nombre: userName, totalMensajes: 1 };
    console.log(`[WEBHOOK] 👤 Nuevo fan creado: ${userName}`);
  } else {
    fans[senderId].totalMensajes++;
  }

  // Generar y enviar respuesta
  const respuesta = await generateAIResponse(messageText, fans[senderId]);
  await sendFacebookMessage(senderId, respuesta);
  console.log(`[WEBHOOK] ✅ Respuesta enviada: "${respuesta}"`);
}

// Procesar comentario en video/post
async function processComment(commentData: any) {
  const commentId = commentData.comment_id;
  const message = commentData.message;
  const from = commentData.from;

  if (!from?.id || !message) return;

  console.log(`[WEBHOOK] 🎬 Comentario en video: "${message}"`);

  // Crear fan temporal para el comentario
  const fan = { nombre: from.name || 'Fan', totalMensajes: 1 };
  const respuesta = await generateAIResponse(message, fan);

  // Responder al comentario
  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: respuesta })
      }
    );
    console.log(`[WEBHOOK] ✅ Comentario respondido: "${respuesta}"`);
  } catch (error) {
    console.error('[WEBHOOK] Error respondiendo comentario:', error);
  }
}

// Obtener nombre del usuario desde Facebook
async function getUserName(userId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=name&access_token=${PAGE_ACCESS_TOKEN}`
    );
    const data = await response.json();
    return data.name || 'Fan';
  } catch {
    return 'Fan';
  }
}

// Generar respuesta con IA usando z-ai-web-dev-sdk
async function generateAIResponse(userMessage: string, fan: { nombre: string; totalMensajes: number }): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt = `Tu eres Louis le Raté, un comediante francés muy popular en redes sociales.
Tu estilo es gracioso, un poco sarcástico y muy amigable con tus fans.
Respondes SIEMPRE en francés coloquial y divertido.
Usa emojis ocasionalmente.
Conoces a tus fans y los tratas como amigos.
El fan se llama ${fan.nombre || 'mon ami'} y te ha escrito ${fan.totalMensajes || 1} veces.
Sé breve pero simpático. Máximo 2-3 oraciones.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.8,
      max_tokens: 150
    });

    return completion.choices[0]?.message?.content || 'Merci pour ton message! 😊';
  } catch (error) {
    console.error('[WEBHOOK] Error con IA, usando respuesta por defecto:', error);
    // Respuestas por defecto en francés
    const respuestas = [
      "Merci beaucoup pour ton message! Ça me fait super plaisir! 🎭",
      "Haha, tu es trop gentil! Merci de me suivre! 😊",
      "Ah oui? C'est cool! Continue à me suivre! 🎬",
      "Merci mon ami! Tu assures! 💪",
      "Trop bien! Merci pour ton soutien! 🙏"
    ];
    return respuestas[Math.floor(Math.random() * respuestas.length)];
  }
}

// Enviar mensaje a Facebook Messenger
async function sendFacebookMessage(recipientId: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message }
        })
      }
    );

    const data = await response.json();
    console.log('[WEBHOOK] Respuesta de Facebook:', data);

    if (data.error) {
      console.error('[WEBHOOK] Error de Facebook:', data.error);
      return false;
    }

    return !!data.message_id;
  } catch (error) {
    console.error('[WEBHOOK] Error enviando mensaje:', error);
    return false;
  }
}
