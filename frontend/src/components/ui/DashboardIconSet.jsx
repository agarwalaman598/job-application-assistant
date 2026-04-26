import { useState } from 'react';

const ICON_SOURCES = {
  briefcase: '/dashboard-icons/briefcase.png',
  growth: '/dashboard-icons/growth.png',
  badge: '/dashboard-icons/badge.png',
  profile: '/dashboard-icons/profile.png',
};

const ICONS = {
  briefcase: (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="briefcaseBody" x1="8" y1="18" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6FA8FF" />
          <stop offset="1" stopColor="#2D62E8" />
        </linearGradient>
        <linearGradient id="briefcaseHandle" x1="20" y1="9" x2="44" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6FA8FF" />
          <stop offset="1" stopColor="#2455D6" />
        </linearGradient>
      </defs>
      <path d="M20 17V14.5C20 11.46 22.46 9 25.5 9H38.5C41.54 9 44 11.46 44 14.5V17" stroke="url(#briefcaseHandle)" strokeWidth="4" strokeLinecap="round" />
      <rect x="8" y="17" width="48" height="37" rx="8" fill="url(#briefcaseBody)" />
      <rect x="8" y="32" width="48" height="10" fill="#2458D8" fillOpacity="0.45" />
      <rect x="26" y="29" width="12" height="10" rx="2" fill="#AFCBFF" />
      <rect x="28" y="31" width="8" height="4" rx="1" fill="#3A6EEA" />
    </svg>
  ),
  growth: (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="growthBars" x1="10" y1="22" x2="52" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB45B" />
          <stop offset="1" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="growthArrow" x1="9" y1="10" x2="53" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFAF54" />
          <stop offset="1" stopColor="#FF7A00" />
        </linearGradient>
      </defs>
      <path d="M12 31C24 31 33 26 43 15" stroke="url(#growthArrow)" strokeWidth="4" strokeLinecap="round" />
      <path d="M39 15H47V23" stroke="url(#growthArrow)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="36" width="10" height="18" rx="3" fill="url(#growthBars)" />
      <rect x="26" y="30" width="10" height="24" rx="3" fill="url(#growthBars)" />
      <rect x="42" y="22" width="10" height="32" rx="3" fill="url(#growthBars)" />
    </svg>
  ),
  badge: (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="badgeBody" x1="13" y1="10" x2="50" y2="53" gradientUnits="userSpaceOnUse">
          <stop stopColor="#65E45C" />
          <stop offset="1" stopColor="#22C84A" />
        </linearGradient>
      </defs>
      <path d="M32 8C36 8 38 11 41 12C44.2 13.1 47.8 11.8 50.2 14.2C52.6 16.6 51.2 20.2 52.4 23.4C53.5 26.4 56 28.5 56 32C56 35.5 53.5 37.6 52.4 40.6C51.2 43.8 52.6 47.4 50.2 49.8C47.8 52.2 44.2 50.9 41 52C38 53.1 36 56 32 56C28 56 26 53.1 23 52C19.8 50.9 16.2 52.2 13.8 49.8C11.4 47.4 12.8 43.8 11.6 40.6C10.5 37.6 8 35.5 8 32C8 28.5 10.5 26.4 11.6 23.4C12.8 20.2 11.4 16.6 13.8 14.2C16.2 11.8 19.8 13.1 23 12C26 11 28 8 32 8Z" fill="url(#badgeBody)" />
      <circle cx="32" cy="32" r="11" fill="#A7EEB7" />
      <circle cx="32" cy="32" r="6" fill="#2AC94D" />
      <path d="M22 47L18 57C17.5 58.2 18.9 59.2 20 58.5L27 54.2" fill="#20B842" />
      <path d="M42 47L46 57C46.5 58.2 45.1 59.2 44 58.5L37 54.2" fill="#20B842" />
    </svg>
  ),
  profile: (
    <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="profileBody" x1="11" y1="10" x2="53" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A68CFF" />
          <stop offset="1" stopColor="#6E41E5" />
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="44" height="44" rx="8" fill="url(#profileBody)" />
      <circle cx="32" cy="27" r="9" fill="white" fillOpacity="0.95" />
      <circle cx="32" cy="25" r="4" fill="#7A4FEA" />
      <path d="M25 31.2C26.3 29.5 28.9 28.5 32 28.5C35.1 28.5 37.7 29.5 39 31.2V33.8H25V31.2Z" fill="#7A4FEA" />
      <rect x="17" y="38" width="30" height="3.8" rx="1.9" fill="white" fillOpacity="0.85" />
      <rect x="20" y="44" width="24" height="3.6" rx="1.8" fill="white" fillOpacity="0.75" />
    </svg>
  ),
};

export function DashboardIconSet({ name, className, style }) {
  const [assetFailed, setAssetFailed] = useState(false);
  const key = ICONS[name] ? name : 'briefcase';
  const assetSrc = ICON_SOURCES[key];

  return (
    <span className={className} style={{ display: 'inline-flex', width: '100%', height: '100%', ...style }}>
      {assetSrc && !assetFailed ? (
        <img
          src={assetSrc}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setAssetFailed(true)}
        />
      ) : (
        ICONS[key]
      )}
    </span>
  );
}
