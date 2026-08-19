import React from 'react';
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { LiquidGlassCard } from '../common/LiquidGlassCard';
import { useCall } from '../../context/CallContext';

export const CallDockedCard: React.FC = () => {
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <LiquidGlassCard
      padding="lg"
      className="w-full h-full flex flex-col justify-between items-center text-center select-none font-sf animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top: Prominent Contact Avatar */}
      <div className="w-28 h-28 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl mt-1 relative">
        <div className="w-full h-full bg-[#16171f] flex flex-col items-center justify-center">
          <User className="w-12 h-12 text-white/50" />
        </div>
      </div>

      {/* Middle: Caller Name & Phone Number */}
      <div className="flex flex-col items-center justify-center w-full px-3 my-1">
        <span className="text-xl font-bold text-white tracking-tight leading-tight truncate max-w-full">
          {callerName}
        </span>
        <span className="text-sm text-white/50 font-normal mt-1 truncate max-w-full">
          {callerNumber}
        </span>
      </div>

      {/* Status / Timer Section (Clean, no pulsing graphics or text) */}
      <div className="w-full px-2 my-1 flex flex-col items-center justify-center min-h-[24px]">
        {callStatus === 'active' && (
          <span className="text-base font-bold font-sf-display tabular-nums text-white/90">
            {formatTime(durationSeconds)}
          </span>
        )}
      </div>

      {/* Bottom: Tactile Phone Actions */}
      <div className="w-full flex items-center justify-center space-x-8 pb-1">
        {callStatus === 'incoming' ? (
          <>
            {/* Decline Button (Red) */}
            <button
              type="button"
              onClick={declineCall}
              aria-label="Decline Call"
              className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 p-3.5"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            {/* Answer Button (White icon within Green background) */}
            <button
              type="button"
              onClick={answerCall}
              aria-label="Answer Call"
              className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 p-3.5"
              title="Answer"
            >
              <Phone className="w-6 h-6 fill-white text-white" />
            </button>
          </>
        ) : (
          <>
            {/* Mute Toggle Button (Turns solid white when active, not yellow) */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-90 p-3.5 border ${
                isMuted
                  ? 'bg-white text-black border-white shadow-md'
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
              className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 p-3.5"
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
