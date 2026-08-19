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
      {/* Top: Prominent Contact Avatar matching MediaDockedCard art dimensions */}
      <div className="w-28 h-28 rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-2xl mt-1 relative">
        <div className="w-full h-full bg-[#16171f] flex flex-col items-center justify-center">
          <User className="w-12 h-12 text-white/50" />
        </div>

        {/* Live Call Pulsing Badge */}
        {callStatus === 'incoming' && (
          <div className="absolute top-2 right-2 flex items-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
        )}
      </div>

      {/* Middle: Caller Name & Phone Number (Exact SF Pro Typography) */}
      <div className="flex flex-col items-center justify-center w-full px-3 my-1">
        <span className="text-xl font-bold text-white tracking-tight leading-tight truncate max-w-full">
          {callerName}
        </span>
        <span className="text-sm text-white/50 font-normal mt-1 truncate max-w-full">
          {callerNumber}
        </span>
      </div>

      {/* Status / Timer Strip */}
      <div className="w-full px-2 my-1 flex flex-col items-center">
        {callStatus === 'incoming' ? (
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest animate-pulse">
            Incoming Audio Call...
          </span>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-semibold text-white/60 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tabular-nums font-sf font-bold text-white/90">
              {formatTime(durationSeconds)}
            </span>
            <span>• Connected</span>
          </div>
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
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Answer Button (Green) */}
            <button
              type="button"
              onClick={answerCall}
              aria-label="Answer Call"
              className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-transform active:scale-90 p-3.5"
              title="Answer"
            >
              <Phone className="w-6 h-6 fill-current" />
            </button>
          </>
        ) : (
          <>
            {/* Mute Toggle Button */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-90 p-3.5 border ${
                isMuted
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Hang Up Button (Red) */}
            <button
              type="button"
              onClick={hangupCall}
              aria-label="End Call"
              className="w-13 h-13 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 p-3.5"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </LiquidGlassCard>
  );
};
