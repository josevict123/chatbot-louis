export default function Home() {
  const webhookUrl = 'https://chatbot-louis.vercel.app/api/webhook/facebook'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#111827',
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>🎭 Louis le Raté</h1>
          <p style={{ color: '#9CA3AF' }}>Chatbot de Facebook Messenger - ACTIVO</p>
        </div>

        {/* Estado */}
        <div style={{
          backgroundColor: '#1F2937',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>
            ¡El chatbot está funcionando!
          </h2>
          <p style={{ color: '#9CA3AF', marginTop: '0.5rem' }}>
            El bot responderá automáticamente a los mensajes que reciba tu página.
          </p>
        </div>

        {/* Webhook URL */}
        <div style={{
          backgroundColor: '#1F2937',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>📡 Webhook URL</h2>
          <div style={{
            backgroundColor: '#374151',
            borderRadius: '0.25rem',
            padding: '0.75rem',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            wordBreak: 'break-all'
          }}>
            {webhookUrl}
          </div>
          <p style={{ color: '#FCD34D', fontSize: '0.875rem', marginTop: '1rem' }}>
            Verify Token: <code style={{ backgroundColor: '#374151', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>mi_token_secreto_123</code>
          </p>
        </div>

        {/* Instrucciones */}
        <div style={{
          backgroundColor: '#1F2937',
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>📋 ¿Cómo funciona?</h2>
          <ol style={{ color: '#D1D5DB', lineHeight: '2' }}>
            <li>Un fan envía un mensaje privado a tu página "Louis le Raté"</li>
            <li>Facebook envía el mensaje a este webhook</li>
            <li>El bot genera una respuesta graciosa en francés con IA</li>
            <li>La respuesta se envía automáticamente al fan</li>
          </ol>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', color: '#6B7280', fontSize: '0.875rem' }}>
          <p>Servidor: Vercel (funciona 24/7)</p>
          <p>Repositorio: github.com/josevict123/chatbot-louis</p>
        </div>
      </div>
    </div>
  )
}

