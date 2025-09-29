// src/components/LoadingSpinner.jsx - Enhanced Version
import React from 'react';

// Main Loading Spinner Component
function LoadingSpinner({ size = 'medium', text = null, fullScreen = false }) {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-3',
    large: 'h-12 w-12 border-4'
  };

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`animate-spin rounded-full border-gray-300 border-t-green-600 ${sizeClasses[size]}`}></div>
      {text && (
        <p className="text-sm text-gray-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <div className="inline-flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-2xl">
            <div className="mb-4">
              <svg className="w-16 h-16 text-green-600 animate-pulse" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-800 mb-1">Loading</p>
            {text && <p className="text-sm text-gray-500">{text}</p>}
          </div>
        </div>
      </div>
    );
  }

  return <Spinner />;
}

// Skeleton Loading Component
export function SkeletonLoader({ type = 'card', count = 1 }) {
  const skeletons = {
    card: (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div className="h-10 bg-gray-200 rounded mt-4"></div>
      </div>
    ),
    list: (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ),
    text: (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    ),
    table: (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 mb-2"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 mb-1"></div>
          ))}
        </div>
      </div>
    ),
    product: (
      <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200"></div>
        <div className="p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{skeletons[type]}</div>
      ))}
    </div>
  );
}

// Progress Bar Component
export function ProgressBar({ progress = 0, label = null, color = 'green', showPercentage = true }) {
  const colorClasses = {
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    red: 'bg-red-600'
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && <span className="text-sm font-bold text-gray-900">{progress}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500 ease-out relative`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        >
          <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

// Dots Loader - Alternative Style
export function DotsLoader({ color = 'green' }) {
  const colorClasses = {
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600'
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-3 w-3 rounded-full ${colorClasses[color]} animate-bounce`}
          style={{ animationDelay: `${i * 0.1}s` }}
        ></div>
      ))}
    </div>
  );
}

// Spinner with text animation
export function SpinnerWithText({ text = 'Loading...', subtext = null }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-green-600"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-green-600 opacity-20 animate-ping"></div>
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold text-gray-800 animate-pulse">{text}</p>
      {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

// Default export
export default LoadingSpinner;