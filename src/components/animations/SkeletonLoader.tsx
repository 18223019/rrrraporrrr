/**
 * SkeletonLoader Component - Loading placeholder
 * Animated shimmer effect for content loading states
 */

import React from 'react';
import '../styles/animations.css';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circle' | 'rect' | 'card' | 'gauge';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rect',
  width = '100%',
  height = '20px',
  className = '',
  count = 1,
}) => {
  const getSkeletonClass = () => {
    switch (variant) {
      case 'text':
        return 'skeleton skeleton-text';
      case 'circle':
        return 'skeleton skeleton-circle';
      case 'card':
        return 'skeleton skeleton-rect';
      case 'gauge':
        return 'skeleton skeleton-rect';
      default:
        return 'skeleton skeleton-rect';
    }
  };

  const getSkeletonStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    };

    if (variant === 'circle') {
      const size = typeof width === 'number' ? width : parseInt(width as string) || 40;
      baseStyle.width = `${size}px`;
      baseStyle.height = `${size}px`;
    }

    if (variant === 'gauge') {
      baseStyle.aspectRatio = '1';
      baseStyle.height = 'auto';
    }

    return baseStyle;
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`${getSkeletonClass()} ${className}`}
            style={getSkeletonStyle()}
          />
        ))}
      </>
    );
  }

  return (
    <div
      className={`${getSkeletonClass()} ${className}`}
      style={getSkeletonStyle()}
    />
  );
};

// Preset skeleton layouts
export const SkeletonBentoCard: React.FC = () => {
  return (
    <div className="bento-card" style={{ padding: '1.5rem' }}>
      <SkeletonLoader variant="text" width="60%" height="24px" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonLoader variant="gauge" width="100%" />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <SkeletonLoader variant="text" width="40%" height="32px" />
      </div>
    </div>
  );
};

export const SkeletonProfileCard: React.FC = () => {
  return (
    <div className="bento-card bento-card-profile" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <SkeletonLoader variant="circle" width={100} height={100} />
        <SkeletonLoader variant="text" width="60%" height="20px" />
        <SkeletonLoader variant="text" width="50%" height="16px" />
        <SkeletonLoader variant="text" width="55%" height="16px" />
        <div style={{ marginTop: '2rem', width: '100%' }}>
          <SkeletonLoader variant="rect" width="100%" height="80px" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="bento-grid">
      <SkeletonProfileCard />
      <SkeletonBentoCard />
      <SkeletonBentoCard />
      <SkeletonBentoCard />
      <SkeletonBentoCard />
    </div>
  );
};

export default SkeletonLoader;
