// src/components/CountdownTimer.jsx - Reusable Countdown Timer Component
import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  ExclamationTriangleIcon,
  FireIcon 
} from '@heroicons/react/24/outline';

export default function CountdownTimer({ 
  endTime, 
  onExpire, 
  title = "Time Remaining",
  phase = "collecting", // collecting, payment_window
  size = "large" // small, medium, large
}) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const end = endTime.toMillis ? endTime.toMillis() : endTime;
      const difference = end - now;

      if (difference <= 0) {
        setHasExpired(true);
        if (onExpire && !hasExpired) {
          onExpire();
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      // Mark as urgent if less than 1 hour remaining
      setIsUrgent(difference < 60 * 60 * 1000);

      return {
        total: difference,
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire, hasExpired]);

  if (!timeLeft) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-xl h-24"></div>
    );
  }

  if (hasExpired) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-center gap-3 text-red-700">
          <ExclamationTriangleIcon className="h-8 w-8 animate-bounce" />
          <div className="text-center">
            <p className="text-lg sm:text-xl font-bold">Time Expired!</p>
            <p className="text-sm">{phase === 'collecting' ? 'Collection phase ended' : 'Payment window closed'}</p>
          </div>
        </div>
      </div>
    );
  }

  const getPhaseConfig = () => {
    if (phase === 'payment_window') {
      return {
        bgGradient: isUrgent ? 'from-red-500 to-pink-600' : 'from-orange-500 to-red-600',
        iconBg: isUrgent ? 'bg-red-600' : 'bg-orange-600',
        icon: isUrgent ? FireIcon : ClockIcon,
        title: title || 'Payment Window',
        description: isUrgent ? 'URGENT! Payment deadline approaching' : 'Complete payment before time runs out'
      };
    }
    
    // collecting phase
    return {
      bgGradient: isUrgent ? 'from-orange-500 to-red-600' : 'from-blue-500 to-cyan-600',
      iconBg: isUrgent ? 'bg-orange-600' : 'bg-blue-600',
      icon: isUrgent ? FireIcon : ClockIcon,
      title: title || 'Collection Phase',
      description: isUrgent ? 'Hurry! Time running out to place orders' : 'Add items to cart before time expires'
    };
  };

  const config = getPhaseConfig();
  const Icon = config.icon;

  // Size configurations
  const sizeClasses = {
    small: {
      container: 'p-3 sm:p-4',
      icon: 'h-8 w-8',
      title: 'text-sm sm:text-base',
      description: 'text-xs',
      timeValue: 'text-xl sm:text-2xl',
      timeLabel: 'text-[10px] sm:text-xs'
    },
    medium: {
      container: 'p-4 sm:p-6',
      icon: 'h-10 w-10 sm:h-12 sm:w-12',
      title: 'text-base sm:text-lg',
      description: 'text-xs sm:text-sm',
      timeValue: 'text-2xl sm:text-3xl',
      timeLabel: 'text-xs sm:text-sm'
    },
    large: {
      container: 'p-6 sm:p-8',
      icon: 'h-12 w-12 sm:h-16 sm:w-16',
      title: 'text-xl sm:text-2xl',
      description: 'text-sm sm:text-base',
      timeValue: 'text-3xl sm:text-4xl lg:text-5xl',
      timeLabel: 'text-xs sm:text-sm'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`bg-gradient-to-r ${config.bgGradient} rounded-2xl shadow-2xl overflow-hidden ${isUrgent ? 'animate-pulse' : ''}`}>
      <div className={`${classes.container} text-white`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className={`${config.iconBg} p-2 sm:p-3 rounded-xl shadow-lg ${isUrgent ? 'animate-bounce' : ''}`}>
              <Icon className={classes.icon} />
            </div>
            <div>
              <h3 className={`font-bold ${classes.title}`}>
                {config.title}
              </h3>
              <p className={`text-white/90 ${classes.description} hidden sm:block`}>
                {config.description}
              </p>
            </div>
          </div>
        </div>

        {/* Countdown Display */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {/* Days */}
          {timeLeft.days > 0 && (
            <TimeUnit 
              value={timeLeft.days} 
              label="Days" 
              classes={classes}
              isUrgent={isUrgent}
            />
          )}
          
          {/* Hours */}
          <TimeUnit 
            value={timeLeft.hours} 
            label="Hours" 
            classes={classes}
            isUrgent={isUrgent}
          />
          
          {/* Minutes */}
          <TimeUnit 
            value={timeLeft.minutes} 
            label="Minutes" 
            classes={classes}
            isUrgent={isUrgent}
          />
          
          {/* Seconds */}
          <TimeUnit 
            value={timeLeft.seconds} 
            label="Seconds" 
            classes={classes}
            isUrgent={isUrgent}
          />
        </div>

        {/* Progress Bar */}
        <div className="mt-4 sm:mt-6">
          <div className="w-full bg-white/20 rounded-full h-2 sm:h-3 overflow-hidden">
            <div 
              className={`h-full bg-white rounded-full transition-all duration-1000 ${isUrgent ? 'animate-pulse' : ''}`}
              style={{ 
                width: `${Math.max(0, Math.min(100, (timeLeft.total / (4 * 60 * 60 * 1000)) * 100))}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Urgent Warning */}
        {isUrgent && (
          <div className="mt-4 p-3 bg-white/10 backdrop-blur-sm rounded-xl border-2 border-white/30 animate-pulse">
            <p className="text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2">
              <FireIcon className="h-5 w-5 animate-bounce" />
              {phase === 'payment_window' 
                ? 'Complete payment NOW!' 
                : 'Last chance to place order!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Time Unit Component
function TimeUnit({ value, label, classes, isUrgent }) {
  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center border border-white/20 ${isUrgent ? 'border-white/40' : ''}`}>
      <div className={`font-bold ${classes.timeValue} mb-1`}>
        {String(value).padStart(2, '0')}
      </div>
      <div className={`text-white/80 font-medium uppercase ${classes.timeLabel}`}>
        {label}
      </div>
    </div>
  );
}

// Compact Timer Variant
export function CompactTimer({ endTime, phase = "collecting" }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endTime) return;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const end = endTime.toMillis ? endTime.toMillis() : endTime;
      const difference = end - now;

      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return null;

  if (timeLeft.expired) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <span>Expired</span>
      </div>
    );
  }

  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
      isUrgent 
        ? 'bg-red-100 text-red-800 animate-pulse' 
        : phase === 'payment_window'
        ? 'bg-orange-100 text-orange-800'
        : 'bg-blue-100 text-blue-800'
    }`}>
      <ClockIcon className={`h-4 w-4 ${isUrgent ? 'animate-spin' : ''}`} />
      <span>
        {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}