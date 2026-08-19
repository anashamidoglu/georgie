import React from 'react';
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const CallInterruptBanner: React.FC = () => {
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

  if (callStatus === 'idle') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex justify-center pointer-events-auto select-none font-sf animate-in fade-in slide-in-from-top-4 duration-300 z-50">
      <div className="w-full max-w-[540px] rounded-3xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md px-6 py-4 flex items-center justify-between text-white">
        {/* Left: Contact Avatar & Details */}
        <div className="flex items-center space-x-4 min-w-0 flex-1 mr-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 relative">
            <User className="w-6 h-6 text-white/70" />
            {callStatus === 'incoming' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            )}
          </div>

          {/* Caller Details & State */}
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-bold font-sf-display text-white tracking-tight leading-snug truncate">
              {callerName}
            </span>
            <div className="flex items-center space-x-2 mt-0.5">
              {callStatus === 'incoming' ? (
                <span className="text-xs font-semibold text-emerald-400">
                  Incoming Call • {callerNumber}
                </span>
              ) : (
                <div className="flex items-center space-x-2 text-xs font-semibold text-white/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tabular-nums font-sf font-bold text-white/90">
                    {formatTime(durationSeconds)}
                  </span>
                  <span>• {callerNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tactile Call Action Buttons */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {callStatus === 'incoming' ? (
            <>
              {/* Decline (Red) */}
              <button
                type="button"
                onClick={declineCall}
                className="h-10 px-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5 transition-transform active:scale-95 text-xs shadow-lg"
                title="Decline Call"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Decline</span>
              </button>

              {/* Answer (Green) */}
              <button
                type="button"
                onClick={answerCall}
                className="h-10 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center space-x-1.5 transition-transform active:scale-95 text-xs shadow-lg"
                title="Answer Call"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Answer</span>
              </button>
            </>
          ) : (
            <>
              {/* Mute Toggle */}
              <button
                type="button"
                onClick={toggleMute}
                className={`h-10 px-4 rounded-full font-bold flex items-center space-x-1.5 transition-transform active:scale-95 text-xs border ${
                  isMuted
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              {/* Hang Up (Red) */}
              <button
                type="button"
                onClick={hangupCall}
                className="h-10 px-5 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5 transition-transform active:scale-95 text-xs shadow-lg"
                title="End Call"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
