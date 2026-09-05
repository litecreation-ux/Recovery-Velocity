import { useEffect, useState } from "react";

export function RadarBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden opacity-70">
      {/* Base Grid */}
      <div 
         className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem'
        }}
      />
      
      {/* Radar Rings */}
      <div className="absolute top-1/2 left-[40%] h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-25">
        <div className="absolute inset-0 rounded-full border border-blue-300/25" />
        <div className="absolute inset-[15%] rounded-full border border-blue-300/20" />
        <div className="absolute inset-[30%] rounded-full border border-dashed border-blue-300/15" />
        <div className="absolute left-1/2 top-0 h-full border-l border-blue-300/10" />
        <div className="absolute left-0 top-1/2 w-full border-t border-blue-300/10" />
        <div className="absolute inset-0 origin-center animate-[spin_24s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_325deg,rgba(147,197,253,0.16)_356deg,transparent_360deg)]">
          <div className="absolute left-1/2 top-1/2 h-px w-1/2 origin-left bg-gradient-to-r from-blue-300/25 to-transparent" />
        </div>
      </div>

       {/* Caribbean regional nodes */}
      <div className="absolute top-0 left-0 h-full w-full">
        {/* Node Alpha */}
        <div className="absolute top-[35%] left-[25%] flex items-center justify-center group">
           <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
           <div className="absolute h-5 w-5 animate-ping rounded-full border border-blue-300/30" style={{ animationDuration: "3.5s" }} />
           <div className="absolute left-4 top-0 whitespace-nowrap font-mono text-[9px] uppercase text-blue-200/60">
             Cayman Islands<br/>
             <span className="text-[8px] text-primary/50">Monitoring</span>
          </div>
        </div>
        
        {/* Node Bravo */}
        <div className="absolute top-[50%] left-[45%] flex items-center justify-center">
           <div className="h-2 w-2 rounded-full bg-amber-300" />
           <div className="absolute h-7 w-7 animate-ping rounded-full border border-amber-300/35" style={{ animationDuration: "2.8s" }} />
           <div className="absolute left-4 top-0 whitespace-nowrap font-mono text-[9px] uppercase text-amber-200/70">
             Jamaica<br/>
             <span className="text-[8px] text-orange-500/60">High Alert</span>
          </div>
        </div>

        {/* Node Charlie */}
        <div className="absolute top-[65%] left-[30%] flex items-center justify-center">
           <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
           <div className="absolute h-5 w-5 animate-ping rounded-full border border-blue-300/25" style={{ animationDuration: "4s", animationDelay: "1s" }} />
           <div className="absolute left-4 top-0 whitespace-nowrap font-mono text-[9px] uppercase text-blue-200/60">
             Cuba<br/>
             <span className="text-[8px] text-primary/50">Regional Link</span>
          </div>
        </div>

        {/* Node Delta */}
        <div className="absolute top-[25%] left-[60%] flex items-center justify-center">
           <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
           <div className="absolute left-4 top-0 whitespace-nowrap font-mono text-[9px] uppercase text-blue-200/60">
             Haiti &amp; Dominican Republic<br/>
             <span className="text-[8px] text-emerald-500/50">Monitoring</span>
          </div>
        </div>

        {/* Node Echo */}
        <div className="absolute top-[80%] left-[50%] flex items-center justify-center">
           <div className="h-1.5 w-1.5 rounded-full bg-blue-300/70" />
           <div className="absolute left-3 top-0 whitespace-nowrap font-mono text-[9px] uppercase text-blue-200/50">
             Trinidad &amp; Tobago
          </div>
        </div>
      </div>

      {/* Connection Lines (SVG) */}
      <svg className="absolute inset-0 h-full w-full opacity-20" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 250 350 L 450 500 L 300 650 Z" fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 6" />
        <path d="M 450 500 L 600 250" fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 6" />
        <path d="M 300 650 L 500 800" fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 6" />
      </svg>
    </div>
  );
}
