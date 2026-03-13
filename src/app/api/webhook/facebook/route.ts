import { NextRequest, NextResponse } from 'next/server';

// Credenciales de Louis le Raté
const VERIFY_TOKEN = 'mi_token_secreto_123';
const PAGE_ACCESS_TOKEN = 'EAFvqoIGCcAMBQ80b7P0s7GoEZBRs8tI8zqouzKsv739qUNezdeYw6Qw6ZAY87N9ZAxV5rvQxMtH2vUuZCUT4SKZBMEVxnHFhYhnewNTxo83Dx02sAWSyKe0ydGm5EFGvM4v6UAhrlWuHwY8yqQI2BQyG1KzN7DZBZCK68S9RZCSasqgYZAoPUCOnnYCqM7DammaMJDDvLxQZDZD';

// Delay de 2 horas en milisegundos
const DELAY_HORAS = 2;
const DELAY_MS = DELAY_HORAS * 60 * 60 * 1000;

// Memoria de fans y mensajes pendientes
const fans: Record<string, { nombre: string; totalMensajes: number; ultimoVideo?: string }> = {};
const respuestasPendientes: Array<{
  senderId: string;
  messageText: string;
  postId?: string;
  scheduledTime: number;
}> = [];

// GET - Verificación del webhook
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 });
}

// POST - Recibir mensajes de Facebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== 'page') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    for (const entry of body.entry || []) {
      // Procesar mensajes privados
      for (const messaging of entry.messaging || []) {
        await programarRespuesta(messaging);
      }

      // Procesar comentarios en videos
      for (const change of entry.changes || []) {
        if (change.field === 'feed' || change.field === 'comments') {
          await programarRespuestaComentario(change.value);
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Error procesando mensaje' }, { status: 500 });
  }
}

// Programar respuesta con delay de 2 horas
async function programarRespuesta(messaging: any) {
  const senderId = messaging.sender?.id;
  const messageText = messaging.message?.text;

  if (!senderId || !messageText) return;

  // Actualizar memoria del fan
  if (!fans[senderId]) {
    const userName = await getUserName(senderId);
    fans[senderId] = { nombre: userName, totalMensajes: 1 };
  } else {
    fans[senderId].totalMensajes++;
  }

  // Programar respuesta para dentro de 2 horas
  const scheduledTime = Date.now() + DELAY_MS;
  
  respuestasPendientes.push({
    senderId,
    messageText,
    scheduledTime
  });

  console.log(`[WEBHOOK] 📅 Respuesta programada para ${fans[senderId].nombre} en ${DELAY_HORAS} horas`);

  // Procesar respuestas pendientes en segundo plano
  setTimeout(() => procesarRespuestasPendientes(), 60000);
}

// Programar respuesta a comentario en video
async function programarRespuestaComentario(commentData: any) {
  const commentId = commentData.comment_id;
  const message = commentData.message;
  const postId = commentData.post_id;
  const from = commentData.from;

  if (!from?.id || !message) return;

  // Actualizar memoria del fan
  if (!fans[from.id]) {
    fans[from.id] = { nombre: from.name || 'Fan', totalMensajes: 1, ultimoVideo: postId };
  } else {
    fans[from.id].totalMensajes++;
    fans[from.id].ultimoVideo = postId;
  }

  // Programar respuesta
  const scheduledTime = Date.now() + DELAY_MS;

  respuestasPendientes.push({
    senderId: from.id,
    messageText: message,
    postId,
    scheduledTime
  });

  console.log(`[WEBHOOK] 📅 Comentario de ${from.name} programado para responder en ${DELAY_HORAS} horas`);
}

// Procesar respuestas pendientes
async function procesarRespuestasPendientes() {
  const ahora = Date.now();
  
  for (let i = respuestasPendientes.length - 1; i >= 0; i--) {
    const pendiente = respuestasPendientes[i];
    
    if (ahora >= pendiente.scheduledTime) {
      // Ya pasó el tiempo de espera, responder
      const fan = fans[pendiente.senderId] || { nombre: 'Fan', totalMensajes: 1 };
      
      // Obtener info del video si hay
      let videoContext = '';
      if (pendiente.postId) {
        videoContext = await obtenerInfoVideo(pendiente.postId);
      }
      
      // Generar respuesta inteligente
      const respuesta = await generarRespuestaInteligente(
        pendiente.messageText,
        fan,
        videoContext
      );
      
      // Enviar respuesta
      await sendFacebookMessage(pendiente.senderId, respuesta);
      
      // Eliminar de pendientes
      respuestasPendientes.splice(i, 1);
      
      console.log(`[WEBHOOK] ✅ Respuesta enviada a ${fan.nombre}: "${respuesta}"`);
    }
  }
  
  // Seguir verificando cada minuto
  if (respuestasPendientes.length > 0) {
    setTimeout(() => procesarRespuestasPendientes(), 60000);
  }
}

// Obtener información del video
async function obtenerInfoVideo(postId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}?fields=message,attachments,created_time&access_token=${PAGE_ACCESS_TOKEN}`
    );
    const data = await response.json();
    
    let info = '';
    if (data.message) info += `Descripción: ${data.message} `;
    if (data.attachments?.data?.[0]?.title) info += `Título: ${data.attachments.data[0].title} `;
    
    return info;
  } catch {
    return '';
  }
}

// Generar respuesta inteligente con contexto del video
async function generarRespuestaInteligente(
  comentario: string,
  fan: { nombre: string; totalMensajes: number; ultimoVideo?: string },
  contextoVideo: string
): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt = `Tu eres Louis le Raté, un comediante francés muy famoso en Facebook.

Tu personalidad:
- Eres gracioso, sarcástico y muy amigable
- Respondes SIEMPRE en francés coloquial (argot francés de la calle)
- Usas emojis ocasionalmente pero no en cada mensaje
- Eres auténtico, como si fueras un amigo respondiendo
- NO suenas como un robot, suenas como una persona real
- A veces tardas en responder porque estás ocupado haciendo videos

El fan:
- Nombre: ${fan.nombre || 'mon pote'}
- Te ha escrito ${fan.totalMensajes || 1} vez/veces

${contextoVideo ? `Contexto del video donde comentó: ${contextoVideo}` : ''}

Reglas IMPORTANTES:
1. Responde como si fueras YO (Louis), no como un bot
2. Conecta tu respuesta con el comentario de forma natural
3. Si el comentario es sobre algo específico del video, mencionalo
4. Sé breve pero cálido (1-3 oraciones máximo)
5. NO uses siempre los mismos saludos, varía
6. Agradece cuando sea apropiado pero no siempre`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: comentario }
      ],
      temperature: 0.9,
      max_tokens: 200
    });

    return completion.choices[0]?.message?.content || await respuestaPorDefecto(fan.nombre);
  } catch (error) {
    console.error('[WEBHOOK] Error con IA:', error);
    return await respuestaPorDefecto(fan.nombre);
  }
}

// Respuestas por defecto variadas
async function respuestaPorDefecto(nombre: string): Promise<string> {
  const respuestas = [
    `Merci ${nombre || 'mon pote'}! Content de te voir ici! 🙌`,
    `Haha merci! Ça me fait trop plaisir!`,
    `T'es un boss! Merci pour le soutien!`,
    `Ah ouais? Merci d'avoir pris le temps de commenter!`,
    `Super! Continue comme ça! 💪`
  ];
  return respuestas[Math.floor(Math.random() * respuestas.length)];
}

// Obtener nombre del usuario
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
