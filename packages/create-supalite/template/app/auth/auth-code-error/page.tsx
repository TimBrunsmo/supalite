import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '1rem' }}>Authentication Error</h1>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        There was a problem signing you in. The authentication code may have
        expired or is invalid.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          background: '#000',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
        }}
      >
        Try again
      </Link>
    </div>
  )
}
