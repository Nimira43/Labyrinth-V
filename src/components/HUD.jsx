export default function HUD({ health, maxHealth = 100 }) {
  const pct = Math.max(0, (health / maxHealth) * 100)
  const barColour = health > 50 ? '#ff4500' : health > 25 ? '#ff2200' : '#ff0000'

  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      left: 32,
      zIndex: 10,
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: 3,
        color: '#ff4500',
        marginBottom: 6,
        textTransform: 'uppercase',
        opacity: 0.85,
      }}>
        Integrity
      </div>

      <div style={{
        width: 180,
        height: 8,
        background: 'rgba(255, 69, 0, 0.12)',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(255, 69, 0, 0.3)',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: barColour,
          borderRadius: 4,
          transition: 'width 0.15s ease, background 0.3s ease',
          boxShadow: `0 0 8px ${barColour}`,
        }} />
      </div>
    </div>
  )
}