(() => {
  'use strict';
  const tracks = [
    {id:'clockwork',title:'Industrial Music Box',subtitle:'Clockwork & mystery',file:'assets/audio/industrial-music-box.mp3',source:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100812'},
    {id:'orchestra',title:'Machinations',subtitle:'Orchestral momentum',file:'assets/audio/machinations.mp3',source:'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100510'}
  ];
  const saved=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
  const save=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
  const level=(key,fallback)=>{const n=Number(saved(key,String(fallback)));return Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;};
  const player=new Audio();player.id='vardam-music';player.loop=true;player.preload='none';player.hidden=true;
  const mount=()=>document.body.appendChild(player);
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
  let current=tracks.find(t=>t.id===saved('vardam.soundtrack','clockwork'))||tracks[0];player.src=current.file;
  let ctx=null,fxBus=null,ambientBus=null,scene='workshop',environment=null,revision=0;
  let consent=false,ambienceState='waiting',lastFx=0,lastFxName='',destroyed=false,musicRevision=0;
  let musicWasPlaying=false;
  const buffers=new Map(),voices=new Set();
  const presets=new Set(['workshop','waterworks','windworks','deep-core']);
  const sounds={gear:'gear-click',click:'gear-click',valve:'valve',pressure:'valve',open:'valve',close:'latch',latch:'latch',paper:'paper',tissue:'paper',detent:'detent',union:'latch',heartbeat:'heartbeat'};
  const changed=()=>window.dispatchEvent(new Event('vardam-audiochange'));
  let warned=false;
  function warn(){if(warned)return;warned=true;window.dispatchEvent(new CustomEvent('vardam-message',{detail:document.documentElement.lang==='es'?'No se pudo cargar un sonido. Revisa que las carpetas de audio estén subidas.':'A sound could not load. Check that the audio folders have been uploaded.'}));}
  function engine(){
    if(destroyed)return null;
    if(!ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return null;
      ctx=new Context();
      const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.15;
      fxBus=ctx.createGain();ambientBus=ctx.createGain();
      fxBus.gain.value=audio.fxEnabled?audio.fxVolume:0;ambientBus.gain.value=audio.ambienceEnabled?audio.ambienceVolume:0;
      fxBus.connect(limiter);ambientBus.connect(limiter);limiter.connect(ctx.destination);
    }
    // Called synchronously by gesture handlers; downloads never delay the unlock.
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return ctx;
  }
  function buffer(file){
    if(!ctx)return Promise.reject(new Error('Audio unavailable'));
    if(!buffers.has(file)){
      const pending=fetch(file).then(r=>{if(!r.ok)throw new Error('Missing audio');return r.arrayBuffer();}).then(bytes=>ctx.decodeAudioData(bytes)).catch(error=>{buffers.delete(file);throw error;});
      buffers.set(file,pending);
    }
    return buffers.get(file);
  }
  function disconnectVoice(v){voices.delete(v);v.source.disconnect();v.gain.disconnect();v.pan?.disconnect();}
  function fadeEnvironment(seconds=.8){
    if(!environment)return;
    const old=environment;environment=null;
    old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setTargetAtTime(0,ctx.currentTime,Math.max(.015,seconds/4));
    try{old.source.stop(ctx.currentTime+seconds);}catch{}
  }
  async function refreshEnvironment(){
    const ticket=++revision;
    if(!ctx||!consent||!audio.ambienceEnabled||document.hidden||destroyed){
      fadeEnvironment(.2);ambienceState=audio.ambienceEnabled?'waiting':'off';changed();return;
    }
    if(environment?.scene===scene){ambienceState='playing';changed();return;}
    ambienceState='loading';changed();
    const requested=scene;
    try{
      const data=await buffer('assets/audio/atmosphere/'+requested+'.mp3');
      if(ticket!==revision||!consent||!audio.ambienceEnabled||document.hidden||destroyed)return;
      fadeEnvironment(1.3);
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=data;source.loop=true;source.loopStart=0;source.loopEnd=data.duration;
      source.connect(gain);gain.connect(ambientBus);gain.gain.value=0;gain.gain.setTargetAtTime(1,ctx.currentTime,.4);
      const voice={source,gain,scene:requested};voices.add(voice);source.onended=()=>disconnectVoice(voice);
      source.start();environment=voice;ambienceState='playing';changed();
    }catch{if(ticket===revision){ambienceState='unavailable';changed();warn();}}
  }
  function activate(){
    if(destroyed)return;
    consent=true;save('vardam.environment-consent','yes');
    if(!engine()){ambienceState='unavailable';changed();return;}
    for(const name of ['gear-click','valve','latch','paper','detent','heartbeat'])buffer('assets/audio/sfx/'+name+'.mp3').catch(warn);
    if(!environment&&ambienceState!=='loading')refreshEnvironment();
  }
  function cue(name='gear',intensity=1){
    if(!ctx||!consent||!audio.fxEnabled||audio.fxVolume===0||document.hidden||destroyed)return;
    const file=sounds[name]||sounds.gear,when=performance.now();
    if(when-lastFx<65||(file===lastFxName&&when-lastFx<110))return;
    lastFx=when;lastFxName=file;
    buffer('assets/audio/sfx/'+file+'.mp3').then(data=>{
      if(!consent||!audio.fxEnabled||document.hidden||destroyed||performance.now()-when>850||voices.size>12)return;
      const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.();
      source.buffer=data;source.playbackRate.value=file==='heartbeat'?1:.96+Math.random()*.08;
      gain.gain.value=Math.max(0,Math.min(1,intensity));source.connect(gain);
      if(pan){pan.pan.value=(Math.random()-.5)*.2;gain.connect(pan);pan.connect(fxBus);}else gain.connect(fxBus);
      const voice={source,gain,pan};voices.add(voice);source.onended=()=>disconnectVoice(voice);source.start();
    }).catch(warn);
  }
  const audio={
    tracks,playing:false,
    volume:level('vardam.volume-v2',.28),
    fxEnabled:saved('vardam.fx-enabled','yes')!=='no',fxVolume:level('vardam.fx-volume',.55),
    ambienceEnabled:saved('vardam.ambience-enabled','yes')!=='no',ambienceVolume:level('vardam.ambience-volume',.34),
    get current(){return current;},get scene(){return scene;},get ambienceState(){return document.hidden?'paused':ambienceState;},get activated(){return consent;},
    activate,
    startEnvironment(enabled=true){
      if(enabled){activate();return;}
      consent=false;save('vardam.environment-consent','no');this.setFXEnabled(false);this.setAmbienceEnabled(false);
    },
    async toggle(){
      if(this.playing){this.stop();return;}
      const ticket=++musicRevision;engine();
      try{
        player.volume=this.volume;await player.play();
        if(ticket===musicRevision&&!document.hidden){this.playing=true;changed();}
        else if(ticket===musicRevision){player.pause();this.playing=false;changed();}
      }catch{
        if(ticket!==musicRevision)return;
        this.playing=false;changed();window.dispatchEvent(new CustomEvent('vardam-message',{detail:document.documentElement.lang==='es'?'Pulsa reproducir para iniciar la música.':'Press play to start the music.'}));
      }
    },
    stop(){++musicRevision;player.pause();this.playing=false;changed();},
    stopAll(){this.stop();++revision;fadeEnvironment(.1);if(ctx)ctx.suspend().catch(()=>{});},
    setVolume(value){this.volume=Math.max(0,Math.min(1,value));player.volume=this.volume;save('vardam.volume-v2',this.volume);},
    setFXVolume(value){this.fxVolume=Math.max(0,Math.min(1,value));save('vardam.fx-volume',this.fxVolume);if(fxBus)fxBus.gain.setTargetAtTime(this.fxEnabled?this.fxVolume:0,ctx.currentTime,.025);},
    setAmbienceVolume(value){this.ambienceVolume=Math.max(0,Math.min(1,value));save('vardam.ambience-volume',this.ambienceVolume);if(ambientBus)ambientBus.gain.setTargetAtTime(this.ambienceEnabled?this.ambienceVolume:0,ctx.currentTime,.04);},
    setFXEnabled(enabled){this.fxEnabled=Boolean(enabled);save('vardam.fx-enabled',this.fxEnabled?'yes':'no');if(enabled)activate();if(fxBus)fxBus.gain.setTargetAtTime(enabled?this.fxVolume:0,ctx.currentTime,.02);changed();},
    setAmbienceEnabled(enabled){
      this.ambienceEnabled=Boolean(enabled);save('vardam.ambience-enabled',enabled?'yes':'no');
      if(enabled)activate();
      if(ambientBus)ambientBus.gain.setTargetAtTime(enabled?this.ambienceVolume:0,ctx.currentTime,.04);
      refreshEnvironment();
    },
    setScene(value){const next=presets.has(value)?value:'workshop';if(next===scene)return;scene=next;refreshEnvironment();},
    setPage(page){this.setScene(page==='archive'?'deep-core':'workshop');},
    async select(id){
      const next=tracks.find(t=>t.id===id);if(!next||next===current)return;
      const wasPlaying=this.playing;this.stop();current=next;player.src=next.file;player.currentTime=0;save('vardam.soundtrack',id);changed();if(wasPlaying)await this.toggle();
    },
    cue
  };
  player.addEventListener('pause',()=>{if(audio.playing){audio.playing=false;changed();}});
  // Physical controls have brief, varied foley. Music and ambience are independent.
  document.addEventListener('click',event=>{
    if(!event.isTrusted||document.body.classList.contains('gated'))return;
    const control=event.target.closest('button,a,summary,input[type="checkbox"]');
    if(!control||control.disabled||control.closest('[data-test-sfx]'))return;
    if(!consent&&saved('vardam.environment-consent','yes')==='yes')activate();
    const name=control.matches('.close-dialog')?'latch':control.matches('[data-person],[data-creature],[data-place],[data-region]')?'paper':control.matches('[data-track],[data-clue],.chip,[data-world],input')?'detent':'gear';
    cue(name,.8);
  },{capture:true});
  let sliderTick=0;
  document.addEventListener('input',event=>{
    if(!event.isTrusted||!event.target.matches('input[type="range"]')||performance.now()-sliderTick<170)return;
    sliderTick=performance.now();cue('detent',.45);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      musicWasPlaying=audio.playing;if(audio.playing)audio.stop();++revision;
      if(ctx)ctx.suspend().catch(()=>{});changed();
    }else{
      if(ctx&&consent)ctx.resume().then(()=>refreshEnvironment()).catch(()=>{});
      if(musicWasPlaying){musicWasPlaying=false;audio.toggle();}
    }
  });
  window.addEventListener('pagehide',()=>audio.stopAll());
  window.VARDAM_AUDIO=audio;
})();
