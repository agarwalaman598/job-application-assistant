export default function MatchScoreGauge({ score }) {
  const radius = 52;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 70) return '#3eb370';
    if (score >= 40) return '#d4942e';
    return '#d94f4f';
  };

  return (
    <div style={{ position: 'relative', width: '130px', height: '130px' }}>
      <svg viewBox="0 0 120 120" className="score-ring" style={{ width: '100%', height: '100%' }}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#2a2a32" strokeWidth={stroke} />
        <circle cx="60" cy="60" r={radius} fill="none"
          stroke={getColor()} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, color: getColor(), letterSpacing: '-0.02em' }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: '0.65rem', color: '#5a5a63', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
          match
        </span>
      </div>
    </div>
  );
}
