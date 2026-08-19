import React from 'react';
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useCall } from '../../context/CallContext';
import { useNav } from '../../context/NavContext';

interface CallDockedCardProps {
  variant?: 'hero' | 'compact' | 'auto';
}

export const CallDockedCard: React.FC<CallDockedCardProps> = ({
  variant = 'auto',
}) => {
  const {
    callStatus,
    callerName,
    callerNumber,
    durationSeconds,
    isMuted,
    answerCall,
    declineCall,
    hangupCall,
    toggleMute,
  } = useCall();

  const { navStatus } = useNav();

  const isCompact =
    variant === 'compact' || (variant === 'auto' && navStatus !== 'idle');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // 1. COMPACT HORIZONTAL LAYOUT (Nav Split View)
  // ==========================================
  if (isCompact) {
    return (
      <LiquidGlassCard
        padding="none"
        className="w-full h-full p-4 sm:p-5 flex flex-col justify-between select-none font-sf animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
      >
        {/* Top Section: Large Contact Avatar on Left + Bigger Contact Name on Right */}
        <div className="flex items-center space-x-4 w-full flex-shrink-0">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl">
            <div className="w-full h-full bg-[#16171f] flex items-center justify-center">
              <User className="w-10 h-10 text-white/50" />
            </div>
          </div>

          <div className="flex flex-col justify-center min-w-0 flex-1 text-left">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight truncate">
              {callerName}
            </span>
            <span className="text-sm text-white/60 font-semibold truncate mt-1">
              {callerNumber}
            </span>

            {/* Active Call Duration (only when call is actively in progress) */}
            {callStatus === 'active' && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-sf tabular-nums w-fit">
                {formatTime(durationSeconds)}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Centered Tactile Call Actions */}
        <div className="w-full flex items-center justify-center space-x-8 flex-shrink-0 pt-2 pb-1 mt-auto">
          {callStatus === 'incoming' ? (
            <>
              {/* Decline Button (Red) */}
              <button
                type="button"
                onClick={declineCall}
                aria-label="Decline Call"
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
                title="Decline"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>

              {/* Answer Button (Green) */}
              <button
                type="button"
                onClick={answerCall}
                aria-label="Answer Call"
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
                title="Answer"
              >
                <Phone className="w-6 h-6 fill-white text-white" />
              </button>
            </>
          ) : (
            <>
              {/* Mute Toggle Button */}
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 border shadow-2xl ${
                  isMuted
                    ? 'bg-white text-black border-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-6 h-6 text-black" /> : <Mic className="w-6 h-6 text-white" />}
              </button>

              {/* Hang Up Button (Red) */}
              <button
                type="button"
                onClick={hangupCall}
                aria-label="End Call"
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>
      </LiquidGlassCard>
    );
  }

  // ==========================================
  // 2. HERO CENTERED LAYOUT (Home Dashboard Idle)
  // ==========================================
  return (
    <LiquidGlassCard
      padding="none"
      className="w-full h-full p-4 sm:p-5 flex flex-col justify-between items-center text-center select-none font-sf animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
    >
      {/* Top: Large Contact Avatar */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 max-h-[38%] aspect-square rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink flex items-center justify-center shadow-2xl mt-1">
        <div className="w-full h-full bg-[#16171f] flex items-center justify-center">
          <User className="w-12 h-12 text-white/50" />
        </div>
      </div>

      {/* Middle: Caller Name & Phone Number */}
      <div className="flex flex-col items-center justify-center w-full px-3 mt-2 mb-1 flex-shrink-0 min-w-0">
        <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug truncate max-w-full">
          {callerName}
        </span>
        <span className="text-sm text-white/60 font-semibold mt-1 truncate max-w-full">
          {callerNumber}
        </span>
        {callStatus === 'active' && (
          <span className="text-sm font-bold font-sf-display tabular-nums text-emerald-400 mt-1">
            {formatTime(durationSeconds)}
          </span>
        )}
      </div>

      {/* Bottom: Tactile Phone Actions */}
      <div className="w-full flex items-center justify-center space-x-8 pt-1 pb-1 flex-shrink-0 mt-auto">
        {callStatus === 'incoming' ? (
          <>
            <button
              type="button"
              onClick={declineCall}
              aria-label="Decline Call"
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            <button
              type="button"
              onClick={answerCall}
              aria-label="Answer Call"
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
              title="Answer"
            >
              <Phone className="w-6 h-6 fill-white text-white" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90 border shadow-2xl ${
                isMuted
                  ? 'bg-white text-black border-white'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-black" /> : <Mic className="w-6 h-6 text-white" />}
            </button>

            <button
              type="button"
              onClick={hangupCall}
              aria-label="End Call"
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform active:scale-90"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>
    </LiquidGlassCard>
  );
};
