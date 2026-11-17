(() => {
  'use strict';
  const tracks = [
    {id:'clockwork',title:'Industrial Music Box',subtitle:'Clockwork & mystery',file:'assets/audio/industrial-music-box.mp3',source:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100812'},
    {id:'orchestra',title:'Machinations',subtitle:'Orchestral momentum',file:'assets/audio/machinations.mp3',source:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100510'}
  ];
  const saved = (key, fallback) => {try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
  const save = (key,value) => {try{localStorage.setItem(key,String(value));}catch{}};
  const player = new Audio(); player.loop=true;player.preload='none';
  let current = tracks.find(t=>t.id===saved('vardam.soundtrack','clockwork')) || tracks[0];
  player.src=current.file;
  let effectsContext=null;
  const changed = () => window.dispatchEvent(new Event('vardam-audiochange'));
  const audio = {
    tracks, playing:false, volume:Math.max(0,Math.min(1,Number(saved('vardam.volume-v2','0.28'))||0)),
    get current(){return current;},
    async toggle(){
      if(this.playing){this.stop();return;}
      try{
        player.volume=this.volume;
        const Context=window.AudioContext||window.webkitAudioContext;
        if(Context&&!effectsContext) effectsContext=new Context();
        if(effectsContext?.state==='suspended')effectsContext.resume();
        await player.play();this.playing=true;changed();
      }catch(error){
        this.playing=false;changed();
        window.dispatchEvent(new CustomEvent('vardam-message',{detail:document.documentElement.lang==='es'?'Pulsa el botón de sonido para iniciar la música.':'Press the sound button to start music.'}));
      }
    },
    stop(){player.pause();this.playing=false;changed();},
    setVolume(value){this.volume=Math.max(0,Math.min(1,value));player.volume=this.volume;save('vardam.volume-v2',this.volume);},
    async select(id){
      const next=tracks.find(t=>t.id===id);if(!next)return;
      const wasPlaying=this.playing;player.pause();current=next;player.src=next.file;player.currentTime=0;this.playing=false;
      save('vardam.soundtrack',id);changed();if(wasPlaying)await this.toggle();
    },
    cue(name){
      if(!this.playing||!effectsContext)return;
      const ctx=effectsContext,now=ctx.currentTime;
      const gain=ctx.createGain();gain.gain.value=this.volume*.5;gain.connect(ctx.destination);
      function tone(freq,time,duration,level,type='sine'){
        const osc=ctx.createOscillator(),g=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);
        g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(level,time+.018);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
        osc.connect(g);g.connect(gain);osc.start(time);osc.stop(time+duration+.03);osc.onended=()=>{osc.disconnect();g.disconnect();};
      }
      function air(duration,cutoff){
        const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=b.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/data.length)*.2;
        const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter();src.buffer=b;filter.type='lowpass';filter.frequency.value=cutoff;
        src.connect(filter);filter.connect(gain);src.start();src.onended=()=>{src.disconnect();filter.disconnect();};
      }
      if(name==='pressure'){air(1.1,750);tone(90,now,.5,.3,'triangle');tone(1300,now+.14,.12,.13);}
      if(name==='tissue'){tone(130.81,now,1.8,.1);tone(196,now+.12,1.8,.075);}
      if(name==='heartbeat'){tone(58,now,.22,.4);tone(48,now+.28,.3,.3);}
      if(name==='union'){tone(523.25,now,1.1,.12);tone(783.99,now+.1,1.1,.08);}
      if(name==='open'){air(1.8,1200);[0,.12,.3,.5].forEach((d,i)=>tone(340+i*47,now+d,.09,.1,'triangle'));}
      setTimeout(()=>gain.disconnect(),4200);
    }
  };
  player.addEventListener('pause',()=>{if(audio.playing){audio.playing=false;changed();}});
  window.VARDAM_AUDIO=audio;
})();
