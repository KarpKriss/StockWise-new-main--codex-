import { useState } from 'react';
import LogisticsLoader from '../loaders/LogisticsLoader';

export default function Button({
  children,
  loading,
  loadingLabel = null,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      {...props}
      className={`app-button app-button--${variant} app-button--${size} ${pressed ? 'is-pressed' : ''} ${className}`.trim()}
      disabled={loading || props.disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      {loading ? <LogisticsLoader compact message={loadingLabel || children} /> : children}
    </button>
  );
}
